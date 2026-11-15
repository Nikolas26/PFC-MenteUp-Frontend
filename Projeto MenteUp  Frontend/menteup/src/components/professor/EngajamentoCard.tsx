import { useEffect, useState } from "react";

import { gravarCache, lerCache } from "../../services/cacheTelas";
import { carregarPainel } from "../../services/painel";
import type { RankingAluno } from "../../types/aluno";
import styles from "./EngajamentoCard.module.css";

/// Mesma chave da Visão geral: quem passou por lá já tem a lista guardada
const CHAVE_CACHE = "visao-geral-ranking";

interface EngajamentoCardProps {
    alunos?: RankingAluno[] | null;
}

export default function EngajamentoCard({ alunos }: EngajamentoCardProps) {
    const precisaBuscar = alunos === undefined;
    const [buscados, setBuscados] = useState<RankingAluno[] | null>(
        () => (precisaBuscar ? lerCache<RankingAluno[] | null>(CHAVE_CACHE) ?? null : null)
    );

    /// Mesma fonte da Visão geral: só os alunos das turmas do professor, no último ano
    useEffect(() => {
        if (!precisaBuscar) return;
        let ativo = true;
        carregarPainel({ dias: 365, turmaId: null, alunoId: null })
            .then((painel) => {
                const lista: RankingAluno[] = painel.desempenhoAlunos.map((a) => ({
                    usuarioId: a.id,
                    nomeUsuario: a.nome,
                    pontuacaoTotal: a.pontosAtividades + a.pontosDesafios,
                    atividadesConcluidas: a.atividadesConcluidas,
                }));
                gravarCache(CHAVE_CACHE, lista);
                if (ativo) setBuscados(lista);
            })
            .catch(() => undefined);
        return () => {
            ativo = false;
        };
    }, [precisaBuscar]);

    const lista = precisaBuscar ? buscados : alunos;
    if (!lista || lista.length === 0) return null;

    const engajados = lista.filter((a) => a.atividadesConcluidas > 0).length;
    const pct = Math.round((engajados / lista.length) * 100);

    return (
        <section className={styles.card}>
            <span className={styles.eyebrow}>Alunos engajados</span>
            <strong className={styles.value}>{pct}%</strong>
            <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.hint}>já concluíram ao menos uma atividade</span>
        </section>
    );
}
