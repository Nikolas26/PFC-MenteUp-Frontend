import { deixarAvisoLogin, sair } from "./usuarioLogado";

export const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
) {
    const token = localStorage.getItem("token");

    const headers = new Headers(options.headers);

    headers.set("Content-Type", "application/json");

    if (token) {
        const authorization = token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`;

        headers.set("Authorization", authorization);
    }

    const resposta = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        cache: "no-store",
        headers,
    });

    if (resposta.status === 401) {
        const codigo = await codigoDoErro(resposta);

        /// Senha atual digitada errada no "Meu perfil": a pessoa continua logada e vê o aviso na tela
        if (endpoint === "/usuarios/me/senha" && codigo !== "TOKEN_INVALIDO") {
            return resposta;
        }

        /// Sessão encerrada: tempo esgotado, senha trocada, conta bloqueada ou excluída
        sair();
        deixarAvisoLogin("Sua sessão terminou. Entre novamente para continuar.");

        window.location.href = "/login";

        throw new Error("Não autorizado");
    }

    /// Saiu uma versão nova do Termo ou da Política: a pessoa precisa aceitar antes de continuar
    if (resposta.status === 428 && window.location.pathname !== "/novo-aceite") {
        window.location.href = "/novo-aceite";

        throw new Error("Aceite pendente");
    }

    return resposta;
}

/// Lê o código do erro sem gastar a resposta, que ainda pode ser lida pela tela
async function codigoDoErro(resposta: Response): Promise<string> {
    try {
        const corpo = await resposta.clone().json();
        return typeof corpo?.codigo === "string" ? corpo.codigo : "";
    } catch {
        return "";
    }
}

export interface ErroApi {
    codigo: string;
    mensagem: string;
    campos?: Record<string, string>;
}

export async function lerErro(
    resposta: Response,
    mensagemPadrao: string
): Promise<ErroApi> {
    try {
        const corpo = await resposta.json();

        if (corpo && typeof corpo.mensagem === "string") {
            return {
                codigo: typeof corpo.codigo === "string" ? corpo.codigo : "ERRO",
                mensagem: corpo.mensagem,
                campos: corpo.campos,
            };
        }
    } catch {
        // Corpo Vazio
    }
    return {codigo: "ERRO-DESCONHECIDO", mensagem: mensagemPadrao};
}