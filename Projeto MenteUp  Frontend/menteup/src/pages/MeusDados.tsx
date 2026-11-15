import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";

import styles from "./MeusDados.module.css";
import Avatar from "../components/Avatar";
import { LogoMarca, LogoNome } from "../components/Logo";
import { apiFetch, lerErro } from "../services/api";
import { baixarMeusDados } from "../services/documentos";
import {
    dataHora,
    nomeDaAcao,
    nomeDoCampo,
    nomeDoDocumento,
    nomeDoPerfil,
    soData,
    soHora,
    valorLegivel,
} from "../services/legivel";

/// Formato do arquivo de GET /usuarios/me/exportar
interface Registro {
    acao: string;
    resultado: string;
    descricao?: string | null;
    ip?: string | null;
    dataHora: string;
}

interface Exportacao {
    geradoEm: string;
    conta: Record<string, unknown> & {
        nome?: string;
        email?: string;
        tipo?: string;
        avatar?: string | null;
    };
    aceites: { tipo: string; versao: string; aceitoEm: string }[];
    turmas: unknown[];
    atividades: unknown[];
    desafios: unknown[];
    conquistas: unknown[];
    registros: Registro[];
}

/// Campos da conta que já aparecem de outro jeito ou que não dizem nada para a pessoa
const CAMPOS_ESCONDIDOS_CONTA = ["id", "nome", "email", "tipo", "avatar"];

const ROTULOS_CONTA: Record<string, string> = {
    situacaoCadastro: "Situação do cadastro",
    termoAceitoEm: "Aceite dos documentos",
};

/// Campos que podem servir de título de um item da lista, em ordem de preferência
const CAMPOS_TITULO = ["nome", "titulo", "atividade", "desafio", "conquista", "turma"];

const vazio = (valor: unknown) =>
    valor === null || valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0);

/// Lista simples de turmas, atividades, desafios ou conquistas
function Lista({ titulo, itens }: { titulo: string; itens: unknown[] }) {
    return (
        <section className={styles.secao}>
            <h2>{titulo}</h2>

            {itens.length === 0 ? (
                <p className={styles.vazio}>Nenhum registro</p>
            ) : (
                <ul className={styles.lista}>
                    {itens.map((item, indice) => {
                        if (typeof item !== "object" || item === null) {
                            return <li key={indice}>{valorLegivel(item)}</li>;
                        }

                        const campos = item as Record<string, unknown>;
                        const chaveTitulo = CAMPOS_TITULO.find((chave) => !vazio(campos[chave]));
                        const detalhes = Object.entries(campos).filter(
                            ([chave, valor]) => chave !== chaveTitulo && !/id$/i.test(chave) && !vazio(valor)
                        );

                        return (
                            <li key={indice}>
                                <strong>{chaveTitulo ? valorLegivel(campos[chaveTitulo]) : `Item ${indice + 1}`}</strong>
                                {detalhes.length > 0 && (
                                    <span className={styles.detalhes}>
                                        {detalhes
                                            .map(([chave, valor]) => `${nomeDoCampo(chave)}: ${valorLegivel(valor)}`)
                                            .join(" · ")}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

/// Histórico separado por dia, do mais recente para o mais antigo
function Historico({ registros }: { registros: Registro[] }) {
    const dias: { dia: string; itens: Registro[] }[] = [];

    for (const registro of [...registros].sort((a, b) => b.dataHora.localeCompare(a.dataHora))) {
        const dia = soData(registro.dataHora);
        const atual = dias[dias.length - 1];
        if (atual && atual.dia === dia) atual.itens.push(registro);
        else dias.push({ dia, itens: [registro] });
    }

    return (
        <section className={styles.secao}>
            <h2>Histórico de ações</h2>

            {dias.length === 0 && <p className={styles.vazio}>Nenhum registro</p>}

            {dias.map(({ dia, itens }) => (
                <div key={dia} className={styles.dia}>
                    <h3>{dia}</h3>
                    <table className={styles.tabela}>
                        <thead>
                            <tr>
                                <th scope="col">Hora</th>
                                <th scope="col">O que aconteceu</th>
                                <th scope="col">Resultado</th>
                                <th scope="col">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.map((registro, indice) => (
                                <tr key={`${registro.dataHora}-${indice}`}>
                                    <td>{soHora(registro.dataHora)}</td>
                                    <td>
                                        {nomeDaAcao(registro.acao)}
                                        {registro.descricao && <small>{registro.descricao}</small>}
                                    </td>
                                    <td className={registro.resultado === "FALHA" ? styles.falha : styles.sucesso}>
                                        {registro.resultado === "FALHA" ? "Falha" : "Sucesso"}
                                    </td>
                                    <td>{registro.ip ?? "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </section>
    );
}

/// Os mesmos dados do arquivo JSON, organizados para leitura e impressão
function MeusDados() {
    const navigate = useNavigate();
    const [dados, setDados] = useState<Exportacao | null>(null);
    const [erro, setErro] = useState("");
    const [baixando, setBaixando] = useState(false);

    useEffect(() => {
        let ativo = true;

        apiFetch("/usuarios/me/exportar")
            .then(async (resposta) => {
                if (!resposta.ok) throw new Error((await lerErro(resposta, "Não foi possível carregar seus dados.")).mensagem);
                return resposta.json();
            })
            .then((json: Exportacao) => ativo && setDados(json))
            .catch((e: Error) => ativo && setErro(e.message));

        return () => {
            ativo = false;
        };
    }, []);

    function voltar() {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    }

    async function baixar() {
        setBaixando(true);
        try {
            await baixarMeusDados();
        } catch (e) {
            setErro((e as Error).message);
        } finally {
            setBaixando(false);
        }
    }

    const conta = dados?.conta;
    const outrosCampos = conta
        ? Object.entries(conta).filter(([chave, valor]) => !CAMPOS_ESCONDIDOS_CONTA.includes(chave) && !vazio(valor))
        : [];

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.inner}>
                    <span className={styles.brand}>
                        <LogoMarca tamanho={36} />
                        <LogoNome className={styles.brandName} />
                    </span>
                    <div className={styles.acoes}>
                        <button type="button" className={styles.back} onClick={voltar}>
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <button type="button" className={styles.back} onClick={baixar} disabled={baixando}>
                            <Download size={16} /> {baixando ? "Preparando..." : "Baixar arquivo (JSON)"}
                        </button>
                        <button type="button" className={styles.back} onClick={() => window.print()} disabled={!dados}>
                            <Printer size={16} /> Imprimir / salvar em PDF
                        </button>
                    </div>
                </div>
            </header>

            <main className={styles.inner}>
                <header className={styles.header}>
                    <span className={styles.icon}>
                        <FileText size={22} />
                    </span>
                    <div>
                        <span className={styles.eyebrow}>Meus dados no MenteUp</span>
                        <h1 className={styles.title}>Tudo o que guardamos sobre você</h1>
                        <p className={styles.subtitle}>
                            {dados
                                ? `Gerado em ${dataHora(dados.geradoEm)}.`
                                : "Os mesmos dados do arquivo JSON, organizados para leitura."}
                        </p>
                    </div>
                </header>

                {erro && (
                    <div className={styles.aviso} role="alert">
                        {erro}
                    </div>
                )}

                {!dados && !erro && <p className={styles.vazio}>Carregando seus dados...</p>}

                {dados && conta && (
                    <article className={styles.card}>
                        <section className={styles.secao}>
                            <h2>Minha conta</h2>
                            <div className={styles.conta}>
                                <Avatar avatar={conta.avatar ?? null} nome={conta.nome ?? ""} tamanho="grande" />
                                <dl className={styles.campos}>
                                    {conta.nome && (
                                        <div>
                                            <dt>Nome</dt>
                                            <dd>{conta.nome}</dd>
                                        </div>
                                    )}
                                    {conta.email && (
                                        <div>
                                            <dt>E-mail</dt>
                                            <dd>{conta.email}</dd>
                                        </div>
                                    )}
                                    {conta.tipo && (
                                        <div>
                                            <dt>Perfil</dt>
                                            <dd>{nomeDoPerfil(conta.tipo)}</dd>
                                        </div>
                                    )}
                                    {conta.avatar && (
                                        <div>
                                            <dt>Foto do perfil</dt>
                                            <dd>{valorLegivel(conta.avatar)}</dd>
                                        </div>
                                    )}
                                    {outrosCampos.map(([chave, valor]) => (
                                        <div key={chave}>
                                            <dt>{ROTULOS_CONTA[chave] ?? nomeDoCampo(chave)}</dt>
                                            <dd>{valorLegivel(valor)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </section>

                        <section className={styles.secao}>
                            <h2>Documentos aceitos</h2>
                            {dados.aceites.length === 0 ? (
                                <p className={styles.vazio}>Nenhum registro</p>
                            ) : (
                                <table className={styles.tabela}>
                                    <thead>
                                        <tr>
                                            <th scope="col">Documento</th>
                                            <th scope="col">Versão</th>
                                            <th scope="col">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dados.aceites.map((aceite) => (
                                            <tr key={`${aceite.tipo}-${aceite.versao}-${aceite.aceitoEm}`}>
                                                <td>{nomeDoDocumento(aceite.tipo)}</td>
                                                <td>{aceite.versao}</td>
                                                <td>{dataHora(aceite.aceitoEm)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>

                        <Lista titulo="Turmas" itens={dados.turmas} />
                        <Lista titulo="Atividades" itens={dados.atividades} />
                        <Lista titulo="Desafios" itens={dados.desafios} />
                        <Lista titulo="Conquistas" itens={dados.conquistas} />
                        <Historico registros={dados.registros} />
                    </article>
                )}
            </main>
        </div>
    );
}

export default MeusDados;
