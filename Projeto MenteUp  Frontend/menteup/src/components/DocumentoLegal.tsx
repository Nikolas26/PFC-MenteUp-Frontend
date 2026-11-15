import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, FileText, History } from "lucide-react";

import styles from "./DocumentoLegal.module.css";
import { LogoMarca, LogoNome } from "./Logo";
import {
    buscarDocumentoAtual,
    buscarVersao,
    formatarData,
    listarVersoes,
    type DocumentoVersao,
    type ResumoVersao,
    type TipoDocumento,
} from "../services/documentos";

interface DocumentoLegalProps {
    tipo: TipoDocumento;
    titulo: string;
    subtitulo: string;
    outroDocumento: { rotulo: string; para: string };
}

export default function DocumentoLegal({ tipo, titulo, subtitulo, outroDocumento }: DocumentoLegalProps) {
    const navigate = useNavigate();

    const [atual, setAtual] = useState<DocumentoVersao | null>(null);
    const [exibido, setExibido] = useState<DocumentoVersao | null>(null);
    const [versoes, setVersoes] = useState<ResumoVersao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    /// Busca o texto que vale hoje e a lista de versões
    useEffect(() => {
        let ativo = true;

        buscarDocumentoAtual(tipo)
            .then((documento) => {
                if (!ativo) return;
                setAtual(documento);
                setExibido(documento);
            })
            .catch((e: Error) => ativo && setErro(e.message))
            .finally(() => ativo && setCarregando(false));

        /// Se o histórico não carregar, a página continua mostrando o texto atual
        listarVersoes(tipo)
            .then((lista) => ativo && setVersoes(lista))
            .catch(() => ativo && setVersoes([]));

        return () => {
            ativo = false;
        };
    }, [tipo]);

    function voltar() {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    }

    /// Abre uma versão antiga no lugar do texto atual
    async function abrirVersao(versao: string) {
        if (atual && versao === atual.versao) {
            setExibido(atual);
            return;
        }

        try {
            setErro("");
            setExibido(await buscarVersao(tipo, versao));
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setErro((e as Error).message);
        }
    }

    /// O texto vem do servidor e é mostrado como texto formatado, sem rodar nenhum código dentro dele
    const vendoAntiga = !!atual && !!exibido && exibido.versao !== atual.versao;
    const anteriores = versoes.filter((v) => v.versao !== atual?.versao);

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <div className={styles.inner}>
                    <Link to="/" className={styles.brand}>
                        <LogoMarca tamanho={36} />
                        <LogoNome className={styles.brandName} />
                    </Link>
                    <button type="button" className={styles.back} onClick={voltar}>
                        <ArrowLeft size={16} /> Voltar
                    </button>
                </div>
            </header>

            <main className={styles.inner}>
                <header className={styles.header}>
                    <span className={styles.icon}>
                        <FileText size={22} />
                    </span>
                    <div>
                        <span className={styles.eyebrow}>Documentos MenteUp</span>
                        <h1 className={styles.title}>{titulo}</h1>
                        <p className={styles.subtitle}>{subtitulo}</p>
                        {exibido && (
                            <p className={styles.versao}>
                                Versão {exibido.versao} · em vigor desde {formatarData(exibido.vigenteDesde)}
                            </p>
                        )}
                    </div>
                </header>

                {vendoAntiga && (
                    <div className={styles.aviso} role="status">
                        Você está lendo uma versão antiga deste documento.{" "}
                        <button type="button" onClick={() => setExibido(atual)}>
                            Ver a versão atual
                        </button>
                    </div>
                )}

                {erro && (
                    <div className={styles.aviso} role="alert">
                        {erro}
                    </div>
                )}

                <article className={styles.card} aria-busy={carregando}>
                    {carregando && <p>Carregando documento...</p>}
                    {exibido && <ReactMarkdown>{exibido.conteudo}</ReactMarkdown>}
                </article>

                {anteriores.length > 0 && (
                    <details className={styles.versoes}>
                        <summary>
                            <History size={16} /> Versões anteriores
                        </summary>
                        <ul>
                            {anteriores.map((v) => (
                                <li key={v.versao}>
                                    <button type="button" onClick={() => abrirVersao(v.versao)}>
                                        Versão {v.versao} · {formatarData(v.vigenteDesde)}
                                    </button>
                                    {v.resumo && <span>{v.resumo}</span>}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}

                <p className={styles.other}>
                    Veja também: <Link to={outroDocumento.para}>{outroDocumento.rotulo}</Link>
                </p>
            </main>
        </div>
    );
}
