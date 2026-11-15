export interface Turma {
    id: number;
    nome: string;
}

export interface Atividade {
    id: number;
    titulo: string;
    descricao: string;
    pontuacao: number;
    status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
    tipo?: TipoAtividade;
    dataCriacao: string;
    /// Primeira turma da lista, mantida só por compatibilidade
    turma?: Turma;
    turmas?: Turma[];
}

/// Turmas vinculadas à atividade, usando turma quando a lista não vier
export function turmasDaAtividade<T>(atividade: { turma?: T | null; turmas?: T[] | null }): T[] {
    if (atividade.turmas?.length) return atividade.turmas;
    return atividade.turma ? [atividade.turma] : [];
}

/// Nomes das turmas para exibição, por exemplo "Turma A, Turma B"
export function nomesTurmas(
    atividade: { turma?: { nome?: string } | null; turmas?: { nome?: string }[] | null },
    vazio = "Sem turma"
): string {
    const nomes = turmasDaAtividade(atividade).map((t) => t.nome).filter(Boolean);
    return nomes.length ? nomes.join(", ") : vazio;
}

export interface AtividadeAluno {
    atividade: Atividade;
    status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA";
    acertos: number | null;
    pontuacao: number | null;
    percentualConclusao: number | null;
}

export interface RankingAluno {
    usuarioId: number;
    nomeUsuario: string;
    pontuacaoTotal: number;
    atividadesConcluidas: number;
    avatar?: string | null;
}

export type VisaoStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENCERRADA";

export function visaoStatus(item: AtividadeAluno): VisaoStatus {
    if (item.status === "CONCLUIDA") return "CONCLUIDA";
    if (item.status === "EM_ANDAMENTO") return "EM_ANDAMENTO";
    return item.atividade.status === "CONCLUIDO" ? "ENCERRADA" : "PENDENTE";
}

export function estaAberta(item: AtividadeAluno) {
    const v = visaoStatus(item);
    return v === "PENDENTE" || v === "EM_ANDAMENTO";
}

export type TipoAtividade = "QUIZ" | "VERDADEIRO_FALSO" | "ASSOCIACAO" | "ORDENACAO" | "LACUNAS";

export const NOME_TIPO: Record<TipoAtividade, string> = {
    QUIZ: "Quiz clássico",
    VERDADEIRO_FALSO: "Verdadeiro ou falso",
    ASSOCIACAO: "Associação de colunas",
    ORDENACAO: "Ordenação",
    LACUNAS: "Preencher lacunas",
};
