import { useEffect, useState } from "react";

import {
    carregarPainel,
    formatarPercentual,
    PERIODOS,
    type DiasPainel,
    type FiltrosPainel,
    type Painel,
} from "../services/painel";
import { gravarCache, lerCache } from "../services/cacheTelas";
import Paginacao from "./Paginacao";
import { usePaginacao } from "../hooks/usePaginacao";
import styles from "./PainelIndicadores.module.css";

/*
 * Indicadores com filtro de período, turma e aluno, usados nos dashboards dos três perfis.
 * O recorte é feito pelo backend conforme quem está logado; aqui só mostramos o que vem:
 * - aluno: só os próprios números (o filtro de aluno não aparece);
 * - professor: as turmas dele e a tabela dos alunos delas;
 * - administrador: todas as turmas e todos os alunos.
 */
interface PainelIndicadoresProps {
    titulo?: string;
    /** Avisa a tela quando os dados chegam (ex.: o dashboard do professor usa a lista de turmas). */
    aoCarregar?: (painel: Painel) => void;
}

const numero = (valor: number) => valor.toLocaleString("pt-BR");
const dataCurta = (dia: string) => new Date(dia).toLocaleDateString("pt-BR");

/// Acima de 90 dias as barras diárias não cabem na tela, então o gráfico passa a somar por semana
const LIMITE_BARRAS_DIARIAS = 90;

interface BarraGrafico {
    chave: string;
    inicio: string;
    fim: string;
    concluidas: number;
}

function montarBarras(dias: { dia: string; concluidas: number }[]): BarraGrafico[] {
    const tamanho = dias.length > LIMITE_BARRAS_DIARIAS ? 7 : 1;
    const barras: BarraGrafico[] = [];
    for (let i = 0; i < dias.length; i += tamanho) {
        const grupo = dias.slice(i, i + tamanho);
        barras.push({
            chave: grupo[0].dia,
            inicio: grupo[0].dia,
            fim: grupo[grupo.length - 1].dia,
            concluidas: grupo.reduce((soma, d) => soma + d.concluidas, 0),
        });
    }
    return barras;
}

/// Cada combinação de filtros é guardada separadamente
const chavePainel = (f: FiltrosPainel) => `/dashboard/painel|${f.dias}|${f.turmaId}|${f.alunoId}`;
const FILTROS_INICIAIS: FiltrosPainel = { dias: 30, turmaId: null, alunoId: null };

function PainelIndicadores({ titulo = "Indicadores", aoCarregar }: PainelIndicadoresProps) {
    const [filtros, setFiltros] = useState<FiltrosPainel>(FILTROS_INICIAIS);
    const [painel, setPainel] = useState<Painel | null>(() => lerCache<Painel>(chavePainel(FILTROS_INICIAIS)) ?? null);
    const [carregando, setCarregando] = useState(() => lerCache(chavePainel(FILTROS_INICIAIS)) === undefined);
    const [erro, setErro] = useState("");

    // Trocar um filtro já mostra "carregando" (ou o que estiver guardado); o efeito abaixo busca os dados novos
    function mudarFiltros(novos: FiltrosPainel) {
        const guardado = lerCache<Painel>(chavePainel(novos));
        if (guardado) setPainel(guardado);
        setCarregando(guardado === undefined);
        setErro("");
        setFiltros(novos);
    }

    useEffect(() => {
        let ativo = true;

        carregarPainel(filtros)
            .then((dados) => {
                gravarCache(chavePainel(filtros), dados);
                if (!ativo) return;
                setPainel(dados);
                aoCarregar?.(dados);
            })
            .catch((falha: Error) => {
                if (ativo) setErro(falha.message);
            })
            .finally(() => {
                if (ativo) setCarregando(false);
            });

        return () => {
            ativo = false;
        };
        // aoCarregar é um aviso para a tela; recarregar só quando os filtros mudam
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtros]);

    const ehAluno = painel?.perfil === "ALUNO";
    const resumo = painel?.resumo;
    const dias = painel?.conclusoesPorDia ?? [];
    const porSemana = dias.length > LIMITE_BARRAS_DIARIAS;
    const barras = montarBarras(dias);
    const maiorBarra = Math.max(1, ...barras.map((b) => b.concluidas));

    /// Trocar período, turma ou aluno volta para a primeira página
    const chaveFiltros = `${filtros.dias}|${filtros.turmaId}|${filtros.alunoId}`;
    /// Turmas podem ter o mesmo nome, então a chave das linhas usa a posição (nome repetido fazia o React acumular linhas)
    const paginaTurmas = usePaginacao(painel?.acertoPorTurma ?? [], 10, chaveFiltros);
    const paginaAlunos = usePaginacao(painel?.desempenhoAlunos ?? [], 20, chaveFiltros);

    const cards = resumo
        ? [
            ...(ehAluno
                ? []
                : [
                    { valor: numero(resumo.turmas), rotulo: resumo.turmas === 1 ? "Turma" : "Turmas" },
                    { valor: numero(resumo.alunos), rotulo: resumo.alunos === 1 ? "Aluno" : "Alunos" },
                    { valor: numero(resumo.atividadesPublicadas), rotulo: "Atividades publicadas" },
                ]),
            { valor: numero(resumo.atividadesConcluidas), rotulo: "Atividades concluídas" },
            { valor: formatarPercentual(resumo.acertoAtividades), rotulo: "Acerto nas atividades" },
            { valor: numero(resumo.pontosAtividades + resumo.pontosDesafios), rotulo: "Pontos no período" },
            { valor: numero(resumo.respostasDesafios), rotulo: "Respostas em desafios" },
            { valor: formatarPercentual(resumo.acertoDesafios), rotulo: "Acerto nos desafios" },
        ]
        : [];

    return (
        <section className={styles.painel} aria-labelledby="painel-titulo">
            <div className={styles.cabecalho}>
                <div>
                    <h2 id="painel-titulo" className={styles.titulo}>{titulo}</h2>
                    <p className={styles.subtitulo}>
                        {ehAluno
                            ? "Só os seus dados."
                            : painel?.perfil === "PROFESSOR"
                                ? "Turmas em que você é o professor responsável e os alunos delas."
                                : "Visão geral de todas as turmas e alunos."}
                    </p>
                </div>

                <div className={styles.filtros}>
                    <label className={styles.filtro}>
                        Período
                        <select
                            value={filtros.dias}
                            onChange={(e) => mudarFiltros({ ...filtros, dias: Number(e.target.value) as DiasPainel })}
                        >
                            {PERIODOS.map((p) => (
                                <option key={p.dias} value={p.dias}>{p.rotulo}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.filtro}>
                        Turma
                        <select
                            value={filtros.turmaId ?? ""}
                            // Trocar a turma limpa o aluno, que pode não ser dessa turma
                            onChange={(e) => mudarFiltros({
                                ...filtros,
                                turmaId: e.target.value ? Number(e.target.value) : null,
                                alunoId: null,
                            })}
                        >
                            <option value="">{ehAluno ? "Todas as minhas turmas" : "Todas as turmas"}</option>
                            {painel?.turmas.map((t) => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                        </select>
                    </label>

                    {painel && !ehAluno && (
                        <label className={styles.filtro}>
                            Aluno
                            <select
                                value={filtros.alunoId ?? ""}
                                onChange={(e) => mudarFiltros({
                                    ...filtros,
                                    alunoId: e.target.value ? Number(e.target.value) : null,
                                })}
                            >
                                <option value="">Todos os alunos</option>
                                {painel.alunos.map((a) => (
                                    <option key={a.id} value={a.id}>{a.nome}</option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>

            {erro && <p className={styles.erro} role="alert">{erro}</p>}
            {carregando && !painel && <p className={styles.vazio}>Carregando indicadores...</p>}

            {painel && (
                <>
                    <div className={styles.cards} aria-busy={carregando}>
                        {cards.map((c) => (
                            <div key={c.rotulo} className={styles.card}>
                                <strong>{carregando ? "…" : c.valor}</strong>
                                <span>{c.rotulo}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.bloco}>
                        <h3 className={styles.blocoTitulo}>
                            Atividades concluídas por {porSemana ? "semana" : "dia"}
                        </h3>
                        <div
                            className={styles.grafico}
                            role="img"
                            aria-label={`Atividades concluídas por ${porSemana ? "semana" : "dia"}: ${numero(resumo?.atividadesConcluidas ?? 0)} no período`}
                        >
                            {barras.map((b) => (
                                <div
                                    key={b.chave}
                                    title={`${b.inicio === b.fim ? dataCurta(b.inicio) : `${dataCurta(b.inicio)} a ${dataCurta(b.fim)}`}: ${b.concluidas}`}
                                    className={`${styles.barra} ${b.concluidas === 0 ? styles.barraVazia : ""}`}
                                    style={{ height: `${Math.max(3, (b.concluidas / maiorBarra) * 100)}%` }}
                                />
                            ))}
                        </div>
                        {dias.length > 0 && (
                            <div className={styles.eixo}>
                                <span>{dataCurta(dias[0].dia)}</span>
                                <span>{dataCurta(dias[dias.length - 1].dia)}</span>
                            </div>
                        )}
                    </div>

                    {painel.acertoPorTurma.length > 0 && (
                        <div className={styles.bloco}>
                            <h3 className={styles.blocoTitulo}>Acerto por turma</h3>
                            {paginaTurmas.visiveis.map((t, i) => (
                                <div key={`${paginaTurmas.inicio + i}|${t.turma}`} className={styles.linhaTurma}>
                                    <span>{t.turma}</span>
                                    <div className={styles.trilho}>
                                        <div className={styles.preenchido} style={{ width: `${t.acerto ?? 0}%` }} />
                                    </div>
                                    <span>{formatarPercentual(t.acerto)}</span>
                                </div>
                            ))}
                            <Paginacao {...paginaTurmas} rotulo="turmas"/>
                        </div>
                    )}

                    {!ehAluno && (
                        <div className={styles.bloco}>
                            <h3 className={styles.blocoTitulo}>Desempenho dos alunos</h3>
                            {painel.desempenhoAlunos.length === 0 ? (
                                <p className={styles.vazio}>Nenhum aluno neste recorte.</p>
                            ) : (
                                <div className={styles.tabelaArea}>
                                    <table className={styles.tabela}>
                                        <thead>
                                            <tr>
                                                <th scope="col">Aluno</th>
                                                <th scope="col" className={styles.numero}>Atividades</th>
                                                <th scope="col" className={styles.numero}>Acerto</th>
                                                <th scope="col" className={styles.numero}>Pontos (atividades)</th>
                                                <th scope="col" className={styles.numero}>Respostas em desafios</th>
                                                <th scope="col" className={styles.numero}>Pontos (desafios)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginaAlunos.visiveis.map((a) => (
                                                <tr key={a.id} className={a.atividadesConcluidas === 0 ? styles.semAtividade : ""}>
                                                    <td>{a.nome}</td>
                                                    <td className={styles.numero}>{numero(a.atividadesConcluidas)}</td>
                                                    <td className={styles.numero}>{formatarPercentual(a.acerto)}</td>
                                                    <td className={styles.numero}>{numero(a.pontosAtividades)}</td>
                                                    <td className={styles.numero}>{numero(a.respostasDesafios)}</td>
                                                    <td className={styles.numero}>{numero(a.pontosDesafios)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Paginacao {...paginaAlunos} rotulo="alunos"/>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default PainelIndicadores;
