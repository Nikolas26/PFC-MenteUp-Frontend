import { Archive, Check } from "lucide-react";

import type { ErroApi } from "../../services/api";
import type { PerfilGestao, TurmaResumo } from "../../services/turmaDesafio";
import styles from "./SeletorTurmas.module.css";

interface SeletorTurmasProps {
    turmas: TurmaResumo[];
    selecionadas: number[];
    onChange: (ids: number[]) => void;
    perfil: PerfilGestao;
    carregando?: boolean;
    /// Turmas já vinculadas na edição, que podem voltar à seleção mesmo arquivadas
    vinculadas?: number[];
}

/// Chave do professor responsável, usada para não misturar professores
const chaveProfessor = (turma?: TurmaResumo) => turma?.professorResponsavel?.id ?? null;

/// Seleção múltipla das turmas que recebem a atividade
function SeletorTurmas({ turmas, selecionadas, onChange, perfil, carregando = false, vinculadas = [] }: SeletorTurmasProps) {
    const administrador = perfil === "ADMINISTRADOR";
    const primeira = turmas.find((t) => t.id === selecionadas[0]);
    const ativas = turmas.filter((t) => !t.arquivada);

    function bloqueada(turma: TurmaResumo): string | null {
        if (selecionadas.includes(turma.id)) return null;
        if (turma.arquivada && !vinculadas.includes(turma.id)) return "Turma arquivada não recebe atividades novas";
        if (administrador && primeira && chaveProfessor(turma) !== chaveProfessor(primeira)) {
            return "Turma de outro professor";
        }
        return null;
    }

    function alternar(turma: TurmaResumo) {
        if (selecionadas.includes(turma.id)) onChange(selecionadas.filter((id) => id !== turma.id));
        else if (!bloqueada(turma)) onChange([...selecionadas, turma.id]);
    }

    const todasMarcadas = ativas.length > 0 && ativas.every((t) => selecionadas.includes(t.id));

    function alternarTodas() {
        if (todasMarcadas) onChange(selecionadas.filter((id) => !ativas.some((t) => t.id === id)));
        else onChange([...new Set([...selecionadas, ...ativas.map((t) => t.id)])]);
    }

    if (carregando) return <p className={styles.dica}>Carregando turmas...</p>;
    if (turmas.length === 0) return null;

    return (
        <div className={styles.seletor}>
            <div className={styles.topo}>
                <span className={styles.dica}>
                    {selecionadas.length === 0
                        ? "Selecione uma ou mais turmas"
                        : `${selecionadas.length} ${selecionadas.length === 1 ? "turma selecionada" : "turmas selecionadas"}`}
                </span>
                {!administrador && ativas.length > 1 && (
                    <button type="button" className={styles.todas} onClick={alternarTodas}>
                        {todasMarcadas ? "Limpar seleção" : "Selecionar todas"}
                    </button>
                )}
            </div>

            <ul className={styles.lista} role="group" aria-label="Turmas da atividade">
                {turmas.map((turma) => {
                    const marcada = selecionadas.includes(turma.id);
                    const motivo = bloqueada(turma);
                    return (
                        <li key={turma.id}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={marcada}
                                disabled={!!motivo}
                                title={motivo ?? undefined}
                                className={`${styles.opcao} ${marcada ? styles.marcada : ""}`}
                                onClick={() => alternar(turma)}
                            >
                                <span className={styles.caixa}>{marcada && <Check size={13} strokeWidth={3} />}</span>
                                <span className={styles.nome}>{turma.nome}</span>
                                {turma.arquivada && (
                                    <span className={styles.tag}>
                                        <Archive size={12} /> arquivada
                                    </span>
                                )}
                                {administrador && (
                                    <span className={styles.professor}>
                                        {turma.professorResponsavel?.nome ?? "sem professor"}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/// Traduz os erros de vínculo com turmas devolvidos por POST e PUT /atividades
export function mensagemErroTurmas(status: number, erro: ErroApi): string {
    if (erro.codigo === "TURMAS_DE_PROFESSORES_DIFERENTES") {
        return "As turmas selecionadas são de professores diferentes. Escolha turmas de um mesmo professor.";
    }
    if (status === 403 || erro.codigo === "SEM_ACESSO_A_ATIVIDADE") {
        return "Uma das turmas selecionadas não é sua. Remova-a da seleção e tente novamente.";
    }
    if (status === 409) {
        return erro.codigo === "ERRO-DESCONHECIDO"
            ? "Uma das turmas selecionadas está arquivada e não pode receber atividades."
            : erro.mensagem;
    }
    return erro.mensagem;
}

export default SeletorTurmas;
