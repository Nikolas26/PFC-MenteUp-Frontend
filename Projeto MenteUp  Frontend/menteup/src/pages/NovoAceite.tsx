import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, Download, FileText, LogOut, Trash2 } from "lucide-react";

import base from "../components/DocumentoLegal.module.css";
import styles from "./NovoAceite.module.css";
import { LogoMarca, LogoNome } from "../components/Logo";
import { ExcluirMinhaConta } from "./Perfil/MeuPerfil";
import { registrarTokenFCM } from "../firebase/fcmService";
import {
    aceitarVersoes,
    baixarMeusDados,
    buscarAceites,
    buscarDocumentoAtual,
    formatarData,
    type DocumentoVersao,
    type SituacaoAceites,
} from "../services/documentos";
import { destinoDepoisDoAceite, sair, TELA_IDADE } from "../services/usuarioLogado";

const NOME_DOCUMENTO: Record<string, string> = {
    TERMO: "Termo de Aceite",
    POLITICA: "Política de Privacidade",
};

/// Documento que a pessoa ainda precisa aceitar, com o texto novo
interface Pendente {
    tipo: "TERMO" | "POLITICA";
    resumo: string;
    documento: DocumentoVersao;
}

/// Busca o texto novo de cada documento que falta aceitar
async function carregarPendentes(situacao: SituacaoAceites): Promise<Pendente[]> {
    return Promise.all(
        situacao.pendentes.map(async (pendente) => {
            const documento = await buscarDocumentoAtual(pendente.tipo === "TERMO" ? "termo" : "politica");
            return {
                tipo: pendente.tipo,
                resumo: pendente.resumo || documento.resumo,
                documento,
            };
        })
    );
}

/// Aparece quando sai uma versão nova do Termo ou da Política: a pessoa lê, aceita e segue para a plataforma
function NovoAceite() {
    const navigate = useNavigate();

    const [pendentes, setPendentes] = useState<Pendente[] | null>(null);
    const [abertos, setAbertos] = useState<Record<string, boolean>>({});
    const [lidos, setLidos] = useState<Record<string, boolean>>({});
    const [aceitou, setAceitou] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");
    const [baixando, setBaixando] = useState(false);
    const [mostrarExclusao, setMostrarExclusao] = useState(false);

    /// Vê o que falta aceitar; se não falta nada, segue direto para o painel
    useEffect(() => {
        let ativo = true;

        buscarAceites()
            .then(async (situacao) => {
                if (situacao.pendentes.length === 0) {
                    if (ativo) navigate(destinoDepoisDoAceite(), { replace: true });
                    return;
                }
                const lista = await carregarPendentes(situacao);
                if (ativo) setPendentes(lista);
            })
            .catch((e: Error) => ativo && setErro(e.message));

        return () => {
            ativo = false;
        };
    }, [navigate]);

    const leuTodos = !!pendentes && pendentes.every((p) => lidos[p.tipo]);

    /// Abrir o texto conta como leitura e libera o "Li e aceito"
    function alternarTexto(tipo: string) {
        setAbertos((atual) => ({ ...atual, [tipo]: !atual[tipo] }));
        setLidos((atual) => ({ ...atual, [tipo]: true }));
    }

    async function aceitar() {
        if (!pendentes) return;

        setEnviando(true);
        setErro("");

        const termo = pendentes.find((p) => p.tipo === "TERMO");
        const politica = pendentes.find((p) => p.tipo === "POLITICA");

        try {
            const situacao = await aceitarVersoes({
                termoVersao: termo?.documento.versao,
                politicaVersao: politica?.documento.versao,
            });

            if (situacao.pendentes.length === 0) {
                /// Se ainda falta a data de nascimento, ela vem antes do painel
                const destino = destinoDepoisDoAceite();
                if (destino !== TELA_IDADE) registrarTokenFCM();
                navigate(destino, { replace: true });
                return;
            }

            /// Saiu outra versão nesse meio tempo: mostra o texto novo e pede o aceite de novo
            setPendentes(await carregarPendentes(situacao));
            setAbertos({});
            setLidos({});
            setAceitou(false);
            setErro("Um dos documentos foi atualizado agora há pouco. Leia a versão nova antes de aceitar.");
        } catch (e) {
            setErro((e as Error).message);
        } finally {
            setEnviando(false);
        }
    }

    async function baixar() {
        setBaixando(true);
        setErro("");

        try {
            await baixarMeusDados();
        } catch (e) {
            setErro((e as Error).message);
        } finally {
            setBaixando(false);
        }
    }

    function sairDaConta() {
        sair();
        navigate("/login", { replace: true });
    }

    return (
        <div className={base.page}>
            <header className={base.topbar}>
                <div className={base.inner}>
                    <span className={base.brand}>
                        <LogoMarca tamanho={36} />
                        <LogoNome className={base.brandName} />
                    </span>
                    <button type="button" className={base.back} onClick={sairDaConta}>
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </header>

            <main className={base.inner}>
                <header className={base.header}>
                    <span className={base.icon}>
                        <FileText size={22} />
                    </span>
                    <div>
                        <span className={base.eyebrow}>Documentos MenteUp</span>
                        <h1 className={base.title}>Atualizamos nossos documentos</h1>
                        <p className={base.subtitle}>
                            Para continuar usando o MenteUp, leia o que mudou e confirme que está de acordo.
                        </p>
                    </div>
                </header>

                {erro && (
                    <div className={base.aviso} role="alert">
                        {erro}
                    </div>
                )}

                {!pendentes && !erro && <p className={styles.carregando}>Carregando documentos...</p>}

                {pendentes?.map((pendente) => (
                    <section key={pendente.tipo} className={styles.documento}>
                        <h2 className={styles.nomeDocumento}>{NOME_DOCUMENTO[pendente.tipo]}</h2>
                        <p className={base.versao}>
                            Versão {pendente.documento.versao} · em vigor desde{" "}
                            {formatarData(pendente.documento.vigenteDesde)}
                        </p>

                        {pendente.resumo && (
                            <p className={styles.resumo}>
                                <strong>O que mudou:</strong> {pendente.resumo}
                            </p>
                        )}

                        <button type="button" className={styles.alternar} onClick={() => alternarTexto(pendente.tipo)}>
                            {abertos[pendente.tipo] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {abertos[pendente.tipo] ? "Esconder o texto completo" : "Ler o texto completo"}
                        </button>

                        {abertos[pendente.tipo] && (
                            <article className={`${base.card} ${styles.texto}`}>
                                <ReactMarkdown>{pendente.documento.conteudo}</ReactMarkdown>
                            </article>
                        )}
                    </section>
                ))}

                {pendentes && (
                    <div className={styles.confirmacao}>
                        <label className={leuTodos ? styles.marcar : `${styles.marcar} ${styles.bloqueado}`}>
                            <input
                                type="checkbox"
                                checked={aceitou}
                                disabled={!leuTodos}
                                onChange={(evento) => setAceitou(evento.target.checked)}
                            />
                            <span>
                                Li e aceito a nova versão {pendentes.length > 1 ? "dos documentos" : "do documento"}.
                                {!leuTodos && <small>Disponível depois de abrir o texto completo.</small>}
                            </span>
                        </label>

                        <button
                            type="button"
                            className={styles.principal}
                            disabled={!aceitou || enviando}
                            onClick={aceitar}
                        >
                            {enviando ? "Salvando..." : "Aceitar e continuar"}
                        </button>
                    </div>
                )}

                <section className={styles.alternativas}>
                    <p>Se não concordar, você pode baixar seus dados e excluir a conta.</p>
                    <div className={styles.botoes}>
                        <button type="button" className={base.back} onClick={baixar} disabled={baixando}>
                            <Download size={16} /> {baixando ? "Preparando arquivo..." : "Baixar meus dados"}
                        </button>
                        <button
                            type="button"
                            className={base.back}
                            onClick={() => setMostrarExclusao((aberto) => !aberto)}
                        >
                            <Trash2 size={16} /> Excluir minha conta
                        </button>
                        <button type="button" className={base.back} onClick={sairDaConta}>
                            <LogOut size={16} /> Sair
                        </button>
                    </div>

                    {mostrarExclusao && (
                        <div className={styles.exclusao}>
                            <ExcluirMinhaConta />
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default NovoAceite;
