import {useEffect, useState} from "react";
import {Check, Info, Minus, X} from "lucide-react";
import {apiFetch, lerErro} from "../services/api";
import styles from "./RevisaoRespostas.module.css";

/// GET /atividades/{id}/revisao
interface QuestaoAtividade {
    perguntaId: number;
    enunciado: string;
    suaResposta: string[];
    acertou: boolean | null;
    respostaCorreta: string[] | null;
}

interface RevisaoAtividadeApi {
    atividadeId: number;
    titulo: string;
    tipo: string;
    gabaritoLiberado: boolean;
    questoes: QuestaoAtividade[];
}

/// GET /desafios/{id}/revisao
interface QuestaoDesafio {
    perguntaId: number;
    enunciado: string;
    suaResposta: string | null;
    acertou: boolean;
    pontos: number;
    respostaCorreta: string | null;
}

interface RevisaoDesafioApi {
    desafioId: number;
    titulo: string;
    pontosTotais: number;
    questoes: QuestaoDesafio[];
}

/// Nas Lacunas o enunciado vem com {{1}}, {{2}}...: na revisão vira uma linha em branco
function textoDoEnunciado(enunciado: string) {
    return enunciado.replace(/\{\{\d{1,3}}}/g, "____");
}

/// Busca a revisão na API, com mensagem de erro amigável
function useRevisao<T>(endereco: string) {
    const [dados, setDados] = useState<T | null>(null);
    const [erro, setErro] = useState("");

    useEffect(() => {
        let ativo = true;
        apiFetch(endereco)
            .then(async (resposta) => {
                if (!resposta.ok) {
                    const erroApi = await lerErro(resposta, "Não foi possível carregar a revisão.");
                    if (ativo) setErro(erroApi.mensagem);
                    return;
                }
                const json: T = await resposta.json();
                if (ativo) setDados(json);
            })
            .catch(() => {
                if (ativo) setErro("Não foi possível carregar a revisão.");
            });
        return () => {
            ativo = false;
        };
    }, [endereco]);

    return {dados, erro};
}

function Selo({acertou}: { acertou: boolean | null }) {
    if (acertou === null) {
        return <span className={`${styles.selo} ${styles.seloNeutro}`}><Minus size={14}/> Sem resposta</span>;
    }
    return acertou
        ? <span className={`${styles.selo} ${styles.seloCerto}`}><Check size={14}/> Acertou</span>
        : <span className={`${styles.selo} ${styles.seloErrado}`}><X size={14}/> Errou</span>;
}

/// Lista de itens (Ordenação e Lacunas têm vários; os outros formatos, um só)
function Itens({itens}: { itens: string[] }) {
    if (itens.length <= 1) {
        return <span>{itens[0] ?? "—"}</span>;
    }
    return (
        <ol className={styles.itens}>
            {itens.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
        </ol>
    );
}

/// Revisão da atividade: o que o aluno respondeu e, depois de encerrada, a resposta certa
export function RevisaoAtividade({atividadeId}: { atividadeId: number | string }) {
    const {dados, erro} = useRevisao<RevisaoAtividadeApi>(`/atividades/${atividadeId}/revisao`);

    if (erro) return <p className={styles.erro} role="alert">{erro}</p>;
    if (!dados) return <p className={styles.carregando}>Carregando as suas respostas...</p>;

    return (
        <section className={styles.revisao} aria-label="Revisão das respostas">
            {!dados.gabaritoLiberado && (
                <p className={styles.aviso}>
                    <Info size={16}/> A resposta correta aparece aqui quando o professor encerrar a atividade.
                </p>
            )}
            <ol className={styles.lista}>
                {dados.questoes.map((questao, indice) => (
                    <li key={questao.perguntaId} className={styles.questao}>
                        <div className={styles.cabecalho}>
                            <span className={styles.numero}>Pergunta {indice + 1}</span>
                            <Selo acertou={questao.acertou}/>
                        </div>
                        <p className={styles.enunciado}>{textoDoEnunciado(questao.enunciado)}</p>
                        <div className={styles.linha}>
                            <strong>Sua resposta:</strong> <Itens itens={questao.suaResposta}/>
                        </div>
                        {questao.respostaCorreta && (
                            <div className={`${styles.linha} ${styles.correta}`}>
                                <strong>Resposta correta:</strong> <Itens itens={questao.respostaCorreta}/>
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}

/// Revisão do desafio encerrado: a alternativa do aluno, os pontos e a correta
export function RevisaoDesafio({desafioId}: { desafioId: number | string }) {
    const {dados, erro} = useRevisao<RevisaoDesafioApi>(`/desafios/${desafioId}/revisao`);

    if (erro) return <p className={styles.erro} role="alert">{erro}</p>;
    if (!dados) return <p className={styles.carregando}>Carregando as suas respostas...</p>;

    return (
        <section className={styles.revisao} aria-label="Revisão do desafio">
            <h2 className={styles.titulo}>Suas respostas · {dados.pontosTotais} pontos</h2>
            <ol className={styles.lista}>
                {dados.questoes.map((questao, indice) => (
                    <li key={questao.perguntaId} className={styles.questao}>
                        <div className={styles.cabecalho}>
                            <span className={styles.numero}>Pergunta {indice + 1}</span>
                            <Selo acertou={questao.suaResposta === null ? null : questao.acertou}/>
                        </div>
                        <p className={styles.enunciado}>{questao.enunciado}</p>
                        <div className={styles.linha}>
                            <strong>Sua resposta:</strong>{" "}
                            <span>{questao.suaResposta ?? "Não respondeu a tempo"}</span>
                            {questao.pontos > 0 && <span className={styles.pontos}>+{questao.pontos} pts</span>}
                        </div>
                        {questao.respostaCorreta && (
                            <div className={`${styles.linha} ${styles.correta}`}>
                                <strong>Resposta correta:</strong> <span>{questao.respostaCorreta}</span>
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}
