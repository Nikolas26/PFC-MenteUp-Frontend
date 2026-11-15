import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Pencil, Play, Plus, Trash2, Trophy} from "lucide-react";
import ConfirmarExclusao from "../../components/ConfirmarExclusao";
import Paginacao from "../../components/Paginacao";
import {usePaginacao} from "../../hooks/usePaginacao";
import {BadgeStatusDesafio, IconeDesafio} from "../../components/ComponentesDesafio";
import {apiFetch, lerErro} from "../../services/api";
import {gravarCache, lerCache} from "../../services/cacheTelas";
import {
    contagem,
    podeAlterarTurma,
    ROTA_BASE,
    type Desafio,
    type PerfilGestao,
    type TurmaResumo,
} from "../../services/turmaDesafio";
import {LayoutGestao} from "./TurmasGestao";
import styles from "./TurmasGestao.module.css";
import desafioStyles from "./Desafios.module.css";

const CHAVE_TURMAS = "turmas-por-id";

function DesafiosGestao({perfil}: { perfil: PerfilGestao }) {
    const navigate = useNavigate();
    const base = ROTA_BASE[perfil];

    const [desafios, setDesafios] = useState<Desafio[]>(() => lerCache<Desafio[]>("/desafios") ?? []);
    // Turmas com o professor responsável: o professor só altera/conduz desafios das turmas dele
    const [turmasPorId, setTurmasPorId] = useState<Record<number, TurmaResumo>>(() => lerCache<Record<number, TurmaResumo>>(CHAVE_TURMAS) ?? {});
    const [carregando, setCarregando] = useState(() => lerCache("/desafios") === undefined);
    const [erro, setErro] = useState("");
    const [paraExcluir, setParaExcluir] = useState<Desafio | null>(null);
    const [excluindo, setExcluindo] = useState(false);
    const [versao, setVersao] = useState(0);

    useEffect(() => {
        async function carregarDesafios() {
            try {
                const [resposta, respostaTurmas] = await Promise.all([
                    apiFetch("/desafios"),
                    apiFetch("/turmas/all?incluirArquivadas=true"),
                ]);
                if (!resposta.ok) throw new Error("Falha ao consultar os desafios.");
                const dados: Desafio[] = await resposta.json();
                setDesafios(dados);
                gravarCache("/desafios", dados);

                if (respostaTurmas.ok) {
                    const turmas: TurmaResumo[] = await respostaTurmas.json();
                    const porId = Object.fromEntries(turmas.map((turma) => [turma.id, turma]));
                    setTurmasPorId(porId);
                    gravarCache(CHAVE_TURMAS, porId);
                }
            } catch (error) {
                console.error("Erro ao carregar desafios:", error);
                setErro("Não foi possível carregar os desafios.");
            } finally {
                setCarregando(false);
            }
        }

        carregarDesafios();
    }, [versao]);

    async function excluirDesafio() {
        if (!paraExcluir) return;

        try {
            setExcluindo(true);
            setErro("");

            const resposta = await apiFetch(`/desafios/${paraExcluir.id}`, {method: "DELETE"});

            if (!resposta.ok) {
                const erroApi = await lerErro(resposta, "Não foi possível excluir o desafio.");
                setErro(erroApi.mensagem);
                return;
            }

            setVersao((atual) => atual + 1);
        } catch (error) {
            console.error("Erro ao excluir desafio:", error);
            setErro("Não foi possível excluir o desafio.");
        } finally {
            setExcluindo(false);
            setParaExcluir(null);
        }
    }

    const paginacao = usePaginacao(desafios, 15);

    return (
        <LayoutGestao perfil={perfil}>
            <header className={desafioStyles.headerRow}>
                <div className={styles.header}>
                    <span className={styles.eyebrow}>Quizzes ao vivo</span>
                    <h1 className={`${styles.title} ${desafioStyles.titleWithIcon}`}>
                        Desafios <IconeDesafio tamanho={36}/>
                    </h1>
                    <p className={styles.subtitle}>Você conduz e a turma responde em tempo real.</p>
                </div>
                <button type="button" onClick={() => navigate(`${base}/desafios/criar`)} className={styles.primaryButton}>
                    <Plus size={18}/> Criar desafio
                </button>
            </header>

            {erro && <div className={styles.error} role="alert">{erro}</div>}

            {carregando ? (
                <p className={styles.empty}>Carregando desafios...</p>
            ) : desafios.length === 0 ? (
                <div className={styles.empty}>
                    <IconeDesafio tamanho={36}/>
                    <p>Nenhum desafio criado ainda.</p>
                </div>
            ) : (
                <>
                <ul className={styles.list}>
                    {paginacao.visiveis.map((desafio) => {
                        const encerrado = desafio.status === "ENCERRADO";
                        const aoVivo = desafio.status === "EM_ANDAMENTO";
                        const turmaDoDesafio = turmasPorId[desafio.turma.id];
                        const podeAlterar = perfil === "ADMINISTRADOR"
                            || (turmaDoDesafio !== undefined && podeAlterarTurma(turmaDoDesafio, perfil));
                        return (
                            <li key={desafio.id} className={`${styles.card} ${styles.row}`}>
                                <span className={`${styles.avatar} ${desafioStyles.avatarDesafio}`}>
                                    <IconeDesafio tamanho={26}/>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigate(`${base}/desafios/${desafio.id}`)}
                                    className={styles.rowMain}
                                >
                                    <span className={desafioStyles.rowTitle}>
                                        <strong>{desafio.titulo}</strong>
                                        <BadgeStatusDesafio status={desafio.status}/>
                                    </span>
                                    <small>
                                        {desafio.turma.nome} · {contagem(desafio.totalPerguntas, "pergunta", "perguntas")}
                                    </small>
                                </button>
                                <div className={styles.actions}>
                                    {(podeAlterar || encerrado) && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`${base}/desafios/${desafio.id}`)}
                                        className={`${styles.ghostButton} ${desafioStyles.rowAction}`}
                                    >
                                        {encerrado ? <Trophy size={16}/> : <Play size={16}/>}
                                        {encerrado ? "Ver ranking" : aoVivo ? "Conduzir" : "Abrir"}
                                    </button>
                                    )}
                                    {podeAlterar && desafio.status === "AGUARDANDO" && (
                                        <button
                                            type="button"
                                            title="Editar"
                                            aria-label={`Editar desafio ${desafio.titulo}`}
                                            onClick={() => navigate(`${base}/desafios/${desafio.id}/editar`)}
                                            className={styles.iconButton}
                                        >
                                            <Pencil size={17}/>
                                        </button>
                                    )}
                                    {podeAlterar && (
                                    <button
                                        type="button"
                                        title={aoVivo ? "Encerre o desafio para excluir" : "Excluir"}
                                        aria-label={aoVivo ? `Encerre o desafio ${desafio.titulo} para excluir` : `Excluir desafio ${desafio.titulo}`}
                                        onClick={() => setParaExcluir(desafio)}
                                        disabled={aoVivo}
                                        className={`${styles.iconButton} ${styles.iconDanger}`}
                                    >
                                        <Trash2 size={17}/>
                                    </button>
                                    )}
                                    {!podeAlterar && !encerrado && (
                                        <small title="Só o professor responsável pela turma ou um administrador conduz este desafio">
                                            Outro professor
                                        </small>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <Paginacao {...paginacao} rotulo="desafios"/>
                </>
            )}

            {paraExcluir && (
                <ConfirmarExclusao
                    titulo={`Excluir o desafio "${paraExcluir.titulo}"?`}
                    mensagem="As perguntas, as respostas e o ranking deste desafio serão apagados. Esta ação não pode ser desfeita."
                    processando={excluindo}
                    onConfirmar={excluirDesafio}
                    onCancelar={() => setParaExcluir(null)}
                />
            )}
        </LayoutGestao>
    );
}

export default DesafiosGestao;
