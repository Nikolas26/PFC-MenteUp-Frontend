import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, RotateCw, Trophy } from "lucide-react";

import AlunoLayout from "../../components/aluno/AlunoLayout";
import AdminLayout from "../../components/administrador/AdminLayout";
import ProfessorLayout from "../../components/professor/ProfessorLayout";
import { apiFetch, lerErro } from "../../services/api";
import { gravarCache, lerCache } from "../../services/cacheTelas";
import { useConquistas } from "../../hooks/useConquistas";
import { infoNivel } from "../../services/conquistasInfo";
import { idDoUsuario, nomeCurto, obterUsuarioLogado } from "../../services/usuarioLogado";
import type { RankingAluno } from "../../types/aluno";
import styles from "./Ranking.module.css";
import { RostoUsuario } from "../../components/Avatar";
import Paginacao from "../../components/Paginacao";
import { usePaginacao } from "../../hooks/usePaginacao";

const fmt = (n: number) => n.toLocaleString("pt-BR");

const PODIO = [
    { rotulo: "Campeão", classe: styles.first },
    { rotulo: "Vice", classe: styles.second },
    { rotulo: "Terceiro", classe: styles.third },
];

/// Turma do seletor do professor (GET /turmas/all)
interface TurmaDoProfessor {
    id: number;
    nome: string;
    arquivada: boolean;
    alunos?: { id: number; nomeUsuario: string }[];
}

/// A API envia atividadeConcluidas (sem o "s"); aceita os dois nomes
function normalizar(item: RankingAluno & { atividadeConcluidas?: number }): RankingAluno {
    return { ...item, atividadesConcluidas: item.atividadeConcluidas ?? item.atividadesConcluidas ?? 0 };
}

const MENSAGEM_ERRO: Record<string, string> = {
    SEM_ACESSO_A_TURMA: "Você não tem acesso ao ranking desta turma.",
    TURMA_NAO_ENCONTRADA: "Turma não encontrada.",
};

type PerfilRanking = "ALUNO" | "PROFESSOR" | "ADMINISTRADOR";

export default function Ranking({ perfil = "ALUNO" }: { perfil?: PerfilRanking }) {
    const admin = perfil === "ADMINISTRADOR";
    const professor = perfil === "PROFESSOR";

    /// Professor: null é "Todas as minhas turmas"
    const [turmas, setTurmas] = useState<TurmaDoProfessor[]>([]);
    const [turmaId, setTurmaId] = useState<number | null>(null);
    const endpoint = turmaId == null ? "/ranking" : `/ranking?turmaId=${turmaId}`;

    const [ranking, setRanking] = useState<RankingAluno[]>(() => lerCache<RankingAluno[]>(endpoint) ?? []);
    const [carregando, setCarregando] = useState(() => lerCache(endpoint) === undefined);
    const [erro, setErro] = useState("");
    const ultimaBusca = useRef("");

    const meuId = idDoUsuario(obterUsuarioLogado());
    const { resumo } = useConquistas();

    useEffect(() => {
        if (!professor) return;
        apiFetch("/turmas/all")
            .then((resposta) => (resposta.ok ? resposta.json() : []))
            .then((lista: TurmaDoProfessor[]) => setTurmas(lista))
            .catch(() => setTurmas([]));
    }, [professor]);

    useEffect(() => {
        carregarRanking();
    }, [endpoint]);

    async function carregarRanking() {
        /// Só a última turma escolhida atualiza a tela
        ultimaBusca.current = endpoint;
        const guardado = lerCache<RankingAluno[]>(endpoint);

        try {
            /// Com dados guardados o ranking continua na tela enquanto a versão nova chega
            if (guardado) setRanking(guardado);
            setCarregando(guardado === undefined);
            setErro("");

            const resposta = await apiFetch(endpoint);

            if (!resposta.ok) {
                const { codigo, mensagem } = await lerErro(resposta, "Não foi possível carregar o ranking.");
                if (ultimaBusca.current !== endpoint) return;
                setRanking([]);
                setErro(MENSAGEM_ERRO[codigo] ?? mensagem);
                return;
            }

            const dados: RankingAluno[] = (await resposta.json()).map(normalizar);
            gravarCache(endpoint, dados);
            if (ultimaBusca.current !== endpoint) return;
            setRanking(dados);
        } catch (error) {
            if (ultimaBusca.current !== endpoint) return;
            console.error("Erro ao carregar ranking:", error);
            setErro("Não foi possível carregar o ranking.");
        } finally {
            if (ultimaBusca.current === endpoint) setCarregando(false);
        }
    }

    /// O professor vê o nome completo na lista; o pódio continua com o nome curto
    const nomeNaLista = (nome: string) => (professor ? nome : nomeCurto(nome));

    const meu = useMemo(() => {
        const indice = meuId ? ranking.findIndex((a) => a.usuarioId === meuId) : -1;
        if (indice === -1) return null;
        return { posicao: indice + 1, dados: ranking[indice], acima: ranking[indice - 1] ?? null };
    }, [ranking, meuId]);

    const nivelMeu = infoNivel(resumo);

    /// Do 4º lugar em diante, 20 por página; trocar de turma volta para a primeira
    const restantes = useMemo(() => ranking.slice(3), [ranking]);
    const paginacao = usePaginacao(restantes, 20, endpoint);
    const deslocamento = paginacao.pagina * 20;

    function textoPosicao() {
        if (!meu) return "Conclua uma atividade para entrar no ranking e começar a subir!";
        if (meu.posicao === 1) return "Você está no topo! Continue no seu ritmo para manter a liderança.";
        const falta = (meu.acima?.pontuacaoTotal ?? 0) - meu.dados.pontuacaoTotal;
        return `Faltam ${fmt(Math.max(falta, 1))} pontos para alcançar ${nomeCurto(meu.acima?.nomeUsuario)} no ${meu.posicao - 1}º lugar.`;
    }

    function textoNivel() {
        if (!resumo) return "Carregando...";
        if (!nivelMeu.proximo) return "Você chegou ao nível mais alto. Parabéns!";
        return `Faltam ${fmt(nivelMeu.faltamXp)} XP para chegar a ${nivelMeu.proximo.nome}.`;
    }

    const conteudo = (
        <>
            <header className={`${styles.header} ${professor ? styles.headerComFiltro : ""}`}>
                <div>
                    <span className={styles.eyebrow}>
                        {admin ? "Administração" : professor ? "Acompanhamento" : "Evolução em equipe"}
                    </span>
                    <h1 className={styles.title}>{professor ? "Ranking das turmas" : "Ranking geral"}</h1>
                    <p className={styles.subtitle}>
                        {admin
                            ? "Classificação geral dos alunos por pontos e atividades concluídas."
                            : professor
                                ? "Classificação dos alunos das suas turmas por pontos e atividades concluídas."
                                : "Compare seu progresso de forma saudável e celebre cada avanço da turma."}
                    </p>
                </div>

                {professor && (
                    <label className={styles.filtro}>
                        Turma
                        <select
                            className={styles.select}
                            value={turmaId ?? ""}
                            onChange={(evento) => setTurmaId(evento.target.value ? Number(evento.target.value) : null)}
                        >
                            <option value="">Todas as minhas turmas</option>
                            {turmas.map((turma) => {
                                const total = turma.alunos?.length ?? 0;
                                return (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome} ({total} {total === 1 ? "aluno" : "alunos"})
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                )}
            </header>

            {professor && turmaId != null && (
                <p className={styles.nota}>
                    No ranking de uma turma contam só as atividades e os desafios dela. Os pontos de conquistas
                    entram apenas em "Todas as minhas turmas", por isso os números podem ficar menores.
                </p>
            )}

            <div className={styles.layout}>
                <div className={styles.main}>
                    <section className={`${styles.card} ${styles.podiumCard}`} aria-label="Pódio">
                        <header className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.cardTitle}>
                                    <Trophy size={20} className={styles.gold} /> Pódio
                                </h2>
                                <p className={styles.cardNote}>As três maiores pontuações do ranking.</p>
                            </div>
                            <span className={styles.chip}>Top 3</span>
                        </header>

                        {carregando ? (
                            <div className={`${styles.podiumSkeleton} ${styles.skeleton}`} />
                        ) : erro ? (
                            <div className={styles.state}>
                                <p className={styles.errorText}>{erro}</p>
                                <button type="button" className={styles.retry} onClick={carregarRanking}>
                                    <RotateCw size={16} /> Tentar novamente
                                </button>
                            </div>
                        ) : ranking.length === 0 ? (
                            <div className={styles.state}>
                                <Trophy size={40} className={styles.stateIcon} />
                                <strong>
                                    {professor ? "Nenhum aluno pontuou ainda" : "Ainda não há participantes no ranking"}
                                </strong>
                                <span>
                                    {professor
                                        ? "Os alunos aparecem aqui quando somarem pontos ou concluírem uma atividade."
                                        : "Conclua uma atividade para começar a acumular pontos."}
                                </span>
                            </div>
                        ) : (
                            <ol className={styles.podium}>
                                {[1, 0, 2].map((indice) => {
                                    const aluno = ranking[indice];
                                    if (!aluno) return <li key={indice} className={styles.podiumEmpty} aria-hidden />;
                                    const lugar = PODIO[indice];
                                    const souEu = aluno.usuarioId === meuId;
                                    return (
                                        <li key={aluno.usuarioId} className={`${styles.podiumSpot} ${lugar.classe}`}>
                                            <div className={styles.podiumPerson}>
                                                {indice === 0 && <Crown size={26} className={styles.crown} />}
                                                <RostoUsuario avatar={aluno.avatar} nome={aluno.nomeUsuario} className={styles.podiumAvatar} />
                                                <strong className={styles.podiumName}>{nomeCurto(aluno.nomeUsuario)}</strong>
                                                <span className={styles.podiumLevel}>
                                                    {aluno.atividadesConcluidas}{" "}
                                                    {aluno.atividadesConcluidas === 1 ? "atividade" : "atividades"}
                                                </span>
                                                <span className={styles.podiumXp}>{fmt(aluno.pontuacaoTotal)} pts</span>
                                                {souEu && <span className={styles.youChip}>Você</span>}
                                            </div>
                                            <div className={styles.pedestal}>
                                                <span className={styles.pedestalBadge}>{indice + 1}º</span>
                                                <span className={styles.pedestalLabel}>{lugar.rotulo}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>

                    <section className={styles.card} aria-label="Classificação">
                        <header className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Classificação completa</h2>
                            {!carregando && !erro && (
                                <span className={styles.cardNote}>
                                    {ranking.length} {ranking.length === 1 ? "aluno" : "alunos"}
                                </span>
                            )}
                        </header>

                        {carregando ? (
                            <div className={styles.list}>
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className={`${styles.row} ${styles.skeleton}`} />
                                ))}
                            </div>
                        ) : ranking.length <= 3 ? (
                            <p className={styles.cardNote}>
                                {erro ? "Não foi possível carregar a classificação." : "Os demais colocados aparecem aqui a partir do 4º lugar."}
                            </p>
                        ) : (
                            <>
                            <ol className={styles.list} start={4 + deslocamento}>
                                {paginacao.visiveis.map((aluno, index) => {
                                    const posicao = index + 4 + deslocamento;
                                    const souEu = aluno.usuarioId === meuId;

                                    return (
                                        <li
                                            key={aluno.usuarioId}
                                            className={`${styles.row} ${souEu ? styles.rowMe : ""}`}
                                            aria-current={souEu ? "true" : undefined}
                                        >
                                            <span className={styles.position}>{posicao}º</span>
                                            <RostoUsuario avatar={aluno.avatar} nome={aluno.nomeUsuario} className={styles.avatar} />
                                            <span className={styles.info}>
                                                <span className={styles.name}>
                                                    {nomeNaLista(aluno.nomeUsuario)}
                                                    {souEu && " (você)"}
                                                </span>
                                                <span className={styles.meta}>
                                                    {aluno.atividadesConcluidas}{" "}
                                                    {aluno.atividadesConcluidas === 1
                                                        ? "atividade concluída"
                                                        : "atividades concluídas"}
                                                </span>
                                            </span>
                                            <span className={styles.xp}>{fmt(aluno.pontuacaoTotal)} pts</span>
                                        </li>
                                    );
                                })}
                            </ol>
                            <Paginacao {...paginacao} rotulo="colocados"/>
                            </>
                        )}
                    </section>
                </div>

                {!admin && !professor && (
                    <aside className={styles.aside}>
                        <section className={styles.card}>
                            <Crown size={36} className={styles.gold} />
                            <h2 className={styles.sideTitle}>
                                {meu ? `Você está em ${meu.posicao}º lugar` : "Sua posição"}
                            </h2>
                            <p className={styles.sideText}>{carregando ? "Carregando..." : textoPosicao()}</p>
                        </section>

                        <section className={styles.card}>
                            <h2 className={styles.sideLabel}>Seu nível</h2>
                            <strong className={styles.league}>{nivelMeu.atual?.nome ?? "Início da jornada"}</strong>
                            <p className={styles.sideText}>{textoNivel()}</p>
                        </section>
                    </aside>
                )}
            </div>
        </>
    );

    if (admin) return <AdminLayout>{conteudo}</AdminLayout>;
    if (professor) return <ProfessorLayout>{conteudo}</ProfessorLayout>;

    return <AlunoLayout>{conteudo}</AlunoLayout>;
}
