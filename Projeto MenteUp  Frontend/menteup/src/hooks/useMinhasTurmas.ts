import { useEffect, useState } from "react";

import { apiFetch } from "../services/api";
import { gravarCache, lerCache } from "../services/cacheTelas";
import { nomesTurmas, turmasDaAtividade } from "../types/aluno";

type TurmaAtividade = { id: number | string; nome?: string };
type AtividadeComTurmas = { turma?: TurmaAtividade | null; turmas?: TurmaAtividade[] | null };

/// Ids das turmas em que o aluno logado está matriculado, null enquanto carrega
const CHAVE_CACHE = "minhas-turmas";

export function useMinhasTurmas(): Set<number> | null {
    const [ids, setIds] = useState<Set<number> | null>(() => lerCache<Set<number>>(CHAVE_CACHE) ?? null);

    useEffect(() => {
        let ativo = true;
        apiFetch("/alunos/me/turmas/disponiveis")
            .then((resposta) => (resposta.ok ? resposta.json() : []))
            .then((turmas: { id: number; matriculado: boolean }[]) => {
                const minhas = new Set(turmas.filter((t) => t.matriculado).map((t) => Number(t.id)));
                gravarCache(CHAVE_CACHE, minhas);
                if (ativo) setIds(minhas);
            })
            .catch(() => ativo && setIds(new Set()));
        return () => {
            ativo = false;
        };
    }, []);

    return ids;
}

/// Nomes só das turmas da atividade em que o aluno está matriculado
export function nomesMinhasTurmas(atividade: AtividadeComTurmas, minhas: Set<number> | null, vazio = "Sem turma"): string {
    if (minhas === null) return "";
    const turmas = turmasDaAtividade(atividade).filter((t) => minhas.has(Number(t.id)));
    return nomesTurmas({ turmas }, vazio);
}
