import { useEffect, useState } from "react";

import { apiFetch } from "../services/api";
import { nomesTurmas, turmasDaAtividade } from "../types/aluno";

type TurmaAtividade = { id: number | string; nome?: string };
type AtividadeComTurmas = { turma?: TurmaAtividade | null; turmas?: TurmaAtividade[] | null };

/// Ids das turmas em que o aluno logado está matriculado, null enquanto carrega
export function useMinhasTurmas(): Set<number> | null {
    const [ids, setIds] = useState<Set<number> | null>(null);

    useEffect(() => {
        let ativo = true;
        apiFetch("/alunos/me/turmas/disponiveis")
            .then((resposta) => (resposta.ok ? resposta.json() : []))
            .then((turmas: { id: number; matriculado: boolean }[]) => {
                if (ativo) setIds(new Set(turmas.filter((t) => t.matriculado).map((t) => Number(t.id))));
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
