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

/// Situação de cada versão na tela do administrador
export type SituacaoVersao = "AGENDADA" | "VIGENTE" | "ANTERIOR";

/// Uma linha da lista de versões do administrador
export interface VersaoGestao {
    versao: string;
    vigenteDesde: string;
    resumo: string;
    situacao: SituacaoVersao;
    publicadoEm?: string | null;
    exigeNovoAceite?: boolean;
}

/// O que o administrador preenche para publicar uma versão nova
export interface NovaVersao {
    conteudo: string;
    resumo: string;
    vigenteDesde: string;
    exigeNovoAceite: boolean;
}

/// Erro da gestão de documentos com o código e os erros de cada campo
export class ErroDocumento extends Error {
    codigo: string;
    campos?: Record<string, string>;

    constructor(mensagem: string, codigo: string, campos?: Record<string, string>) {
        super(mensagem);
        this.codigo = codigo;
        this.campos = campos;
    }
}

async function falhaGestao(resposta: Response, mensagemPadrao: string): Promise<ErroDocumento> {
    const falha = await lerErro(resposta, mensagemPadrao);
    return new ErroDocumento(falha.mensagem, falha.codigo, falha.campos);
}

/// Todas as versões, inclusive a que ainda vai entrar em vigor
export async function listarVersoesGestao(tipo: TipoDocumento): Promise<VersaoGestao[]> {
    const resposta = await apiFetch(`/documentos/gestao/${tipo}/versoes`);
    if (!resposta.ok) throw await falhaGestao(resposta, "Não foi possível carregar as versões.");
    return resposta.json();
}

/// Texto de qualquer versão, inclusive a agendada
export async function buscarVersaoGestao(tipo: TipoDocumento, versao: string): Promise<DocumentoVersao> {
    const resposta = await apiFetch(`/documentos/gestao/${tipo}/versoes/${encodeURIComponent(versao)}`);
    if (!resposta.ok) throw await falhaGestao(resposta, "Não foi possível abrir esta versão.");
    return resposta.json();
}

/// Publica uma versão nova; o número da versão é escolhido pelo sistema
export async function publicarVersao(tipo: TipoDocumento, dados: NovaVersao): Promise<Partial<VersaoGestao>> {
    const resposta = await apiFetch(`/documentos/gestao/${tipo}/versoes`, {
        method: "POST",
        body: JSON.stringify(dados),
    });
    if (!resposta.ok) throw await falhaGestao(resposta, "Não foi possível publicar a versão.");
    return resposta.json().catch(() => ({}));
}

/// Cancela a versão que ainda está esperando a data de vigência
export async function cancelarVersao(tipo: TipoDocumento, versao: string): Promise<void> {
    const resposta = await apiFetch(`/documentos/gestao/${tipo}/versoes/${encodeURIComponent(versao)}`, {
        method: "DELETE",
    });
    if (!resposta.ok) throw await falhaGestao(resposta, "Não foi possível cancelar a versão.");
}
