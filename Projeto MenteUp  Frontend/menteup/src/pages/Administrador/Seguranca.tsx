import { useCallback, useEffect, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CalendarClock, Eye, FilePlus2, FileText, Pencil, Send, X } from "lucide-react";

import AdminLayout from "../../components/administrador/AdminLayout";
import ConfirmarExclusao from "../../components/ConfirmarExclusao";
import styles from "./Administrador.module.css";
import seg from "./Seguranca.module.css";
import {
    buscarDocumentoAtual,
    buscarVersaoGestao,
    cancelarVersao,
    ErroDocumento,
    formatarData,
    listarVersoesGestao,
    publicarVersao,
    type DocumentoVersao,
    type NovaVersao,
    type SituacaoVersao,
    type TipoDocumento,
    type VersaoGestao,
} from "../../services/documentos";
import { dataHora } from "../../services/legivel";

const NOME_DOCUMENTO: Record<TipoDocumento, string> = {
    termo: "Termo de Aceite",
    politica: "Política de Privacidade",
};

const SITUACAO: Record<SituacaoVersao, { rotulo: string; classe: string }> = {
    AGENDADA: { rotulo: "Agendada", classe: styles.badgeOuro },
    VIGENTE: { rotulo: "Em vigor", classe: styles.badgeMint },
    ANTERIOR: { rotulo: "Anterior", classe: styles.badgeNeutro },
};

const LIMITE_TEXTO = 100_000;
const LIMITE_RESUMO = 500;

/// Qualquer coisa parecida com uma marcação de página, como <b> ou <script>
const PARECE_HTML = /<\/?[a-z!][^>]*>/i;

/// Data de hoje no formato do campo de data
function hoje(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
}

/// Mensagem clara para cada recusa do servidor
function mensagemDoErro(erro: unknown): string {
    if (!(erro instanceof ErroDocumento)) return "Não foi possível conectar ao servidor.";
    switch (erro.codigo) {
        case "VIGENCIA_INVALIDA":
            return "A data de vigência não pode estar no passado.";
        case "CONTEUDO_COM_HTML":
            return "O texto tem marcações de página (como <b> ou <script>). Use só a formatação de texto simples, como **negrito** e ## títulos.";
        case "CONTEUDO_SEM_MUDANCA":
            return "O texto está igual ao da versão em vigor. Faça alguma mudança antes de publicar.";
        case "VERSAO_AGENDADA_EXISTENTE":
            return "Já existe uma versão esperando a data de vigência. Cancele essa versão antes de publicar outra.";
        case "VERSAO_JA_VIGENTE":
            return "Esta versão já está em vigor ou já foi aceita por alguém, e não pode mais ser cancelada.";
        default:
            return erro.message;
    }
}

/// Texto de uma versão aberto numa janela sobre a tela
function VerTexto({ documento, titulo, onFechar }: { documento: DocumentoVersao; titulo: string; onFechar: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onFechar]);

    return (
        <div className={styles.overlay} onClick={onFechar}>
            <div className={`${styles.modal} ${seg.modalLargo}`} role="dialog" aria-modal="true"
                 aria-labelledby="texto-titulo" onClick={(e) => e.stopPropagation()}>
                <button type="button" className={styles.modalClose} onClick={onFechar} aria-label="Fechar">
                    <X size={18} />
                </button>
                <h2 id="texto-titulo" className={styles.modalTitle}>{titulo} · versão {documento.versao}</h2>
                <p className={styles.modalSubtitle}>Em vigor a partir de {formatarData(documento.vigenteDesde)}</p>
                <div className={seg.texto}>
                    <ReactMarkdown>{documento.conteudo}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

/// Formulário da versão nova, com a revisão antes de publicar
function EditorVersao({ tipo, onFechar, onPublicada }: {
    tipo: TipoDocumento;
    onFechar: () => void;
    onPublicada: (mensagem: string) => void;
}) {
    const [atual, setAtual] = useState<DocumentoVersao | null>(null);
    const [dados, setDados] = useState<NovaVersao>({ conteudo: "", resumo: "", vigenteDesde: hoje(), exigeNovoAceite: true });
    const [revisando, setRevisando] = useState(false);
    const [publicando, setPublicando] = useState(false);
    const [erros, setErros] = useState<Record<string, string>>({});
    const [erro, setErro] = useState("");

    /// Começa com o texto que vale hoje, para o administrador só mudar o necessário
    useEffect(() => {
        buscarDocumentoAtual(tipo)
            .then((documento) => {
                setAtual(documento);
                setDados((d) => ({ ...d, conteudo: documento.conteudo }));
            })
            .catch((e: Error) => setErro(e.message));
    }, [tipo]);

    function mudar<K extends keyof NovaVersao>(campo: K, valor: NovaVersao[K]) {
        setDados((d) => ({ ...d, [campo]: valor }));
        setErros((e) => ({ ...e, [campo]: "" }));
    }

    /// Mesmas regras do servidor, conferidas antes de enviar
    function conferir(): Record<string, string> {
        const novos: Record<string, string> = {};
        if (!dados.conteudo.trim()) novos.conteudo = "Escreva o texto do documento.";
        else if (dados.conteudo.length > LIMITE_TEXTO) novos.conteudo = `O texto pode ter até ${LIMITE_TEXTO.toLocaleString("pt-BR")} caracteres.`;
        else if (PARECE_HTML.test(dados.conteudo)) novos.conteudo = "O texto não pode ter marcações de página, como <b> ou <script>.";
        else if (atual && dados.conteudo.trim() === atual.conteudo.trim()) novos.conteudo = "O texto está igual ao da versão em vigor.";
        if (!dados.resumo.trim()) novos.resumo = "Conte em poucas palavras o que mudou.";
        else if (dados.resumo.length > LIMITE_RESUMO) novos.resumo = `O resumo pode ter até ${LIMITE_RESUMO} caracteres.`;
        if (!dados.vigenteDesde) novos.vigenteDesde = "Escolha a data de vigência.";
        else if (dados.vigenteDesde < hoje()) novos.vigenteDesde = "A data não pode estar no passado.";
        return novos;
    }

    function revisar(evento: FormEvent) {
        evento.preventDefault();
        const novos = conferir();
        setErros(novos);
        setErro("");
        if (Object.keys(novos).length === 0) setRevisando(true);
    }

    async function publicar() {
        setPublicando(true);
        setErro("");
        try {
            const criada = await publicarVersao(tipo, {
                ...dados,
                conteudo: dados.conteudo.trim(),
                resumo: dados.resumo.trim(),
            });
            const numero = criada.versao ? ` ${criada.versao}` : "";
            onPublicada(`${NOME_DOCUMENTO[tipo]}: versão${numero} publicada. Ela entra em vigor em ${formatarData(dados.vigenteDesde)}.`);
        } catch (e) {
            /// Erro de um campo volta para o formulário, embaixo do campo
            if (e instanceof ErroDocumento && e.campos && Object.keys(e.campos).length > 0) {
                setErros(e.campos);
                setRevisando(false);
            }
            setErro(mensagemDoErro(e));
        } finally {
            setPublicando(false);
        }
    }

    if (revisando) {
        return (
            <section className={`${styles.card} ${styles.panel}`}>
                <h2 className={seg.tituloBloco}>Revisar antes de publicar</h2>
                <dl className={seg.resumoRevisao}>
                    <div><dt>Documento</dt><dd>{NOME_DOCUMENTO[tipo]}</dd></div>
                    <div><dt>Em vigor a partir de</dt><dd>{formatarData(dados.vigenteDesde)}</dd></div>
                    <div><dt>Novo aceite</dt><dd>{dados.exigeNovoAceite ? "Todos precisarão aceitar de novo" : "Não será pedido"}</dd></div>
                    <div className={seg.linhaInteira}><dt>O que mudou</dt><dd>{dados.resumo}</dd></div>
                </dl>

                <div className={seg.texto}>
                    <ReactMarkdown>{dados.conteudo}</ReactMarkdown>
                </div>

                <div className={styles.avisoTroca} role="note">
                    Depois que entrar em vigor, esta versão não poderá ser alterada. Até lá, ela ainda pode ser cancelada.
                </div>

                {erro && <div className={`${styles.error} ${seg.espaco}`} role="alert">{erro}</div>}

                <div className={seg.botoes}>
                    <button type="button" className={styles.ghostButton} onClick={() => setRevisando(false)} disabled={publicando}>
                        <Pencil size={16} /> Voltar a editar
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={publicar} disabled={publicando}>
                        <Send size={16} /> {publicando ? "Publicando..." : "Publicar versão"}
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className={`${styles.card} ${styles.panel}`}>
            <h2 className={seg.tituloBloco}>Nova versão · {NOME_DOCUMENTO[tipo]}</h2>
            {atual && (
                <p className={styles.muted}>
                    O texto abaixo é o da versão {atual.versao}, em vigor. O número da versão nova é escolhido pelo sistema.
                </p>
            )}

            <form onSubmit={revisar} className={`${styles.formNovo} ${seg.formulario}`} noValidate>
                <label>Texto do documento
                    <textarea className={`${styles.campo} ${seg.areaTexto}`} value={dados.conteudo}
                              disabled={!atual} onChange={(e) => mudar("conteudo", e.target.value)} />
                    <span className={seg.ajuda}>
                        Use ## para títulos, **texto** para negrito e - no começo da linha para listas.
                        <span className={seg.contador}>{dados.conteudo.length.toLocaleString("pt-BR")} / {LIMITE_TEXTO.toLocaleString("pt-BR")}</span>
                    </span>
                    {erros.conteudo && <span className={styles.erroCampo}>{erros.conteudo}</span>}
                </label>

                <label>Resumo da mudança
                    <textarea className={`${styles.campo} ${seg.areaResumo}`} value={dados.resumo} maxLength={LIMITE_RESUMO}
                              placeholder="Ex.: Inclusão dos serviços usados para enviar e-mails."
                              onChange={(e) => mudar("resumo", e.target.value)} />
                    <span className={seg.ajuda}>
                        Aparece para os usuários na tela de novo aceite.
                        <span className={seg.contador}>{dados.resumo.length} / {LIMITE_RESUMO}</span>
                    </span>
                    {erros.resumo && <span className={styles.erroCampo}>{erros.resumo}</span>}
                </label>

                <div className={seg.linhaCampos}>
                    <label>Data de vigência
                        <input className={styles.campo} type="date" min={hoje()} value={dados.vigenteDesde}
                               onChange={(e) => mudar("vigenteDesde", e.target.value)} />
                        {erros.vigenteDesde && <span className={styles.erroCampo}>{erros.vigenteDesde}</span>}
                    </label>

                    <label className={seg.marcar}>
                        <input type="checkbox" checked={dados.exigeNovoAceite}
                               onChange={(e) => mudar("exigeNovoAceite", e.target.checked)} />
                        <span>
                            Exigir novo aceite
                            <small>Na data de vigência, todos os usuários precisarão ler e aceitar a versão nova.</small>
                        </span>
                    </label>
                </div>

                {erro && <div className={styles.error} role="alert">{erro}</div>}

                <div className={seg.botoes}>
                    <button type="button" className={styles.ghostButton} onClick={onFechar}>
                        <ArrowLeft size={16} /> Cancelar
                    </button>
                    <button type="submit" className={styles.primaryButton} disabled={!atual}>
                        <Eye size={16} /> Revisar
                    </button>
                </div>
            </form>
        </section>
    );
}

/// Lista de versões de um documento, com a criação e o cancelamento
function GestaoDocumento({ tipo }: { tipo: TipoDocumento }) {
    const [versoes, setVersoes] = useState<VersaoGestao[] | null>(null);
    const [erro, setErro] = useState("");
    const [aviso, setAviso] = useState("");
    const [editando, setEditando] = useState(false);
    const [aberto, setAberto] = useState<DocumentoVersao | null>(null);
    const [cancelando, setCancelando] = useState<VersaoGestao | null>(null);
    const [processando, setProcessando] = useState(false);

    const carregar = useCallback(async () => {
        try {
            const lista = await listarVersoesGestao(tipo);
            /// A mais nova primeiro
            setVersoes([...lista].sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde)));
        } catch (e) {
            setErro(mensagemDoErro(e));
        }
    }, [tipo]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    async function abrir(versao: string) {
        setErro("");
        try {
            setAberto(await buscarVersaoGestao(tipo, versao));
        } catch (e) {
            setErro(mensagemDoErro(e));
        }
    }

    async function confirmarCancelamento() {
        if (!cancelando) return;
        setProcessando(true);
        setErro("");
        try {
            await cancelarVersao(tipo, cancelando.versao);
            setAviso(`Versão ${cancelando.versao} cancelada. A versão em vigor continua valendo.`);
        } catch (e) {
            setErro(mensagemDoErro(e));
        } finally {
            setProcessando(false);
            setCancelando(null);
            carregar();
        }
    }

    const agendada = versoes?.find((v) => v.situacao === "AGENDADA");

    if (editando) {
        return (
            <EditorVersao
                tipo={tipo}
                onFechar={() => setEditando(false)}
                onPublicada={(mensagem) => {
                    setEditando(false);
                    setAviso(mensagem);
                    carregar();
                }}
            />
        );
    }

    return (
        <>
            {aviso && <div className={styles.sucesso} role="status">{aviso}</div>}
            {erro && <div className={styles.error} role="alert">{erro}</div>}

            <section className={`${styles.card} ${styles.panel}`}>
                <div className={styles.panelHeader}>
                    <div>
                        <h2 className={seg.tituloBloco}>Versões do {NOME_DOCUMENTO[tipo]}</h2>
                        <p className={styles.muted}>
                            Na data de vigência, a versão nova passa a valer sozinha e os usuários são levados a aceitá-la.
                        </p>
                    </div>
                    <button type="button" className={styles.primaryButton} disabled={!versoes || !!agendada}
                            onClick={() => {
                                setAviso("");
                                setErro("");
                                setEditando(true);
                            }}>
                        <FilePlus2 size={18} /> Nova versão
                    </button>
                </div>

                {agendada && (
                    <p className={`${styles.avisoTroca} ${seg.espaco}`} role="note">
                        <CalendarClock size={16} className={seg.iconeTexto} />
                        A versão {agendada.versao} entra em vigor em {formatarData(agendada.vigenteDesde)}. Para publicar
                        outra, cancele esta antes.
                    </p>
                )}

                <div className={`${styles.tableWrap} ${seg.espaco}`}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Versão</th>
                                <th>Situação</th>
                                <th>Em vigor desde</th>
                                <th>Publicada em</th>
                                <th>O que mudou</th>
                                <th aria-label="Ações" />
                            </tr>
                        </thead>
                        <tbody>
                            {!versoes && !erro && (
                                <tr><td colSpan={6} className={styles.emptyCell}>Carregando versões...</td></tr>
                            )}
                            {versoes?.length === 0 && (
                                <tr><td colSpan={6} className={styles.emptyCell}>Nenhuma versão publicada.</td></tr>
                            )}
                            {versoes?.map((v) => (
                                <tr key={v.versao}>
                                    <td><strong>{v.versao}</strong></td>
                                    <td>
                                        <span className={`${styles.badge} ${SITUACAO[v.situacao]?.classe ?? styles.badgeNeutro}`}>
                                            {SITUACAO[v.situacao]?.rotulo ?? v.situacao}
                                        </span>
                                    </td>
                                    <td className={styles.nowrap}>{formatarData(v.vigenteDesde)}</td>
                                    <td className={`${styles.muted} ${styles.nowrap}`}>{v.publicadoEm ? dataHora(v.publicadoEm) : "-"}</td>
                                    <td className={styles.muted}>{v.resumo || "-"}</td>
                                    <td>
                                        <span className={styles.acoesLinha}>
                                            <button type="button" className={styles.iconButton} title="Ver texto"
                                                    aria-label={`Ver o texto da versão ${v.versao}`} onClick={() => abrir(v.versao)}>
                                                <FileText size={18} />
                                            </button>
                                            {v.situacao === "AGENDADA" && (
                                                <button type="button" className={`${styles.iconButton} ${styles.iconButtonPerigo}`}
                                                        title="Cancelar versão" aria-label={`Cancelar a versão ${v.versao}`}
                                                        onClick={() => {
                                                            setAviso("");
                                                            setCancelando(v);
                                                        }}>
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {aberto && <VerTexto documento={aberto} titulo={NOME_DOCUMENTO[tipo]} onFechar={() => setAberto(null)} />}

            {cancelando && (
                <ConfirmarExclusao
                    titulo={`Cancelar a versão ${cancelando.versao}?`}
                    mensagem="Ela não vai mais entrar em vigor, e a versão atual continua valendo."
                    processando={processando}
                    rotuloConfirmar="Sim, cancelar"
                    rotuloProcessando="Cancelando..."
                    rotuloCancelar="Voltar"
                    onConfirmar={confirmarCancelamento}
                    onCancelar={() => setCancelando(null)}
                />
            )}
        </>
    );
}

/// Área de segurança do administrador: por enquanto, os documentos legais
function Seguranca() {
    const [tipo, setTipo] = useState<TipoDocumento>("termo");

    /// Cada documento tem a própria lista; trocar de aba começa do zero
    return (
        <AdminLayout>
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>Administração</span>
                    <h1 className={styles.title}>Segurança</h1>
                    <p className={styles.subtitle}>Termo de Aceite e Política de Privacidade da plataforma.</p>
                </div>
            </header>

            <div className={seg.abas} role="tablist" aria-label="Documentos legais">
                {(Object.keys(NOME_DOCUMENTO) as TipoDocumento[]).map((opcao) => (
                    <button key={opcao} type="button" role="tab" aria-selected={tipo === opcao}
                            className={tipo === opcao ? `${seg.aba} ${seg.abaAtiva}` : seg.aba}
                            onClick={() => setTipo(opcao)}>
                        {NOME_DOCUMENTO[opcao]}
                    </button>
                ))}
            </div>

            <GestaoDocumento key={tipo} tipo={tipo} />
        </AdminLayout>
    );
}

export default Seguranca;
