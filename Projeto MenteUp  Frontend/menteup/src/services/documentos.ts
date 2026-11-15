import { API_URL, apiFetch, lerErro } from "./api";

/// Os dois documentos que a pessoa precisa aceitar
export type TipoDocumento = "termo" | "politica";

/// Um documento com o texto completo de uma versão
export interface DocumentoVersao {
    tipo: "TERMO" | "POLITICA";
    versao: string;
    vigenteDesde: string;
    resumo: string;
    conteudo: string;
}

/// Uma linha do histórico, sem o texto
export interface ResumoVersao {
    versao: string;
    vigenteDesde: string;
    resumo: string;
}

/// O que ainda falta aceitar e o que já foi aceito
export interface SituacaoAceites {
    pendentes: { tipo: "TERMO" | "POLITICA"; versao: string; resumo?: string }[];
    aceites: { tipo: "TERMO" | "POLITICA"; versao: string; aceitoEm: string }[];
}

/// Busca um endereço aberto, que não precisa de login
async function buscarPublico<T>(caminho: string, mensagemPadrao: string): Promise<T> {
    const resposta = await fetch(`${API_URL}${caminho}`, { cache: "no-store" });

    if (!resposta.ok) {
        throw new Error((await lerErro(resposta, mensagemPadrao)).mensagem);
    }

    return resposta.json();
}

/// Texto da versão que vale hoje
export function buscarDocumentoAtual(tipo: TipoDocumento): Promise<DocumentoVersao> {
    return buscarPublico(`/documentos/${tipo}/atual`, "Não foi possível carregar o documento.");
}

/// Lista de todas as versões já publicadas
export function listarVersoes(tipo: TipoDocumento): Promise<ResumoVersao[]> {
    return buscarPublico(`/documentos/${tipo}/versoes`, "Não foi possível carregar as versões anteriores.");
}

/// Texto de uma versão antiga
export function buscarVersao(tipo: TipoDocumento, versao: string): Promise<DocumentoVersao> {
    return buscarPublico(
        `/documentos/${tipo}/versoes/${encodeURIComponent(versao)}`,
        "Não foi possível carregar esta versão."
    );
}

/// O que a pessoa logada ainda precisa aceitar
export async function buscarAceites(): Promise<SituacaoAceites> {
    const resposta = await apiFetch("/usuarios/me/aceites");

    if (!resposta.ok) {
        throw new Error((await lerErro(resposta, "Não foi possível verificar os documentos.")).mensagem);
    }

    return resposta.json();
}

/// Registra que a pessoa aceitou as versões novas
export async function aceitarVersoes(versoes: { termoVersao?: string; politicaVersao?: string }): Promise<SituacaoAceites> {
    const resposta = await apiFetch("/usuarios/me/aceites", {
        method: "POST",
        body: JSON.stringify(versoes),
    });

    if (!resposta.ok) {
        throw new Error((await lerErro(resposta, "Não foi possível registrar o aceite.")).mensagem);
    }

    return resposta.json();
}

/// Baixa um arquivo com todos os dados que a plataforma guarda sobre a pessoa
export async function baixarMeusDados(): Promise<void> {
    const resposta = await apiFetch("/usuarios/me/exportar");

    if (!resposta.ok) {
        throw new Error((await lerErro(resposta, "Não foi possível baixar os dados.")).mensagem);
    }

    const arquivo = await resposta.blob();
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = endereco;
    link.download = "meus-dados-menteup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(endereco);
}

/// Mostra a data no formato "13 de novembro de 2026"
export function formatarData(data: string): string {
    const [ano, mes, dia] = data.slice(0, 10).split("-").map(Number);
    if (!ano || !mes || !dia) return data;

    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
