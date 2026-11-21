import {apiFetch, lerErro} from "./api";

export type TipoUsuario = "ALUNO" | "PROFESSOR" | "ADMINISTRADOR";

/// Dados da conta (GET /usuarios/{id}): o e-mail inteiro só vem para a própria pessoa
export interface ContaEditavel {
    id: number;
    nomeUsuario: string;
    usuario?: string;
    emailMascarado?: string;
    tipoUsuario: TipoUsuario;
}

/// Erros da edição: por campo (mostrados embaixo de cada um) e geral
export interface ErrosEdicao {
    nomeUsuario?: string;
    usuario?: string;
    tipoUsuario?: string;
    geral?: string;
}

export type ResultadoEdicao =
    | { ok: true; conta: ContaEditavel }
    | { ok: false; erros: ErrosEdicao };

export const LIMITE_NOME = 100;

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/// Compara e-mails sem diferenciar maiúsculas e espaços
export function mesmoEmail(a?: string, b?: string) {
    return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/// Conferência feita na tela antes de chamar a API; o e-mail pode ficar vazio quando é só para trocar
export function validarEdicao(nome: string, email: string, emailObrigatorio = true): ErrosEdicao {
    const erros: ErrosEdicao = {};
    if (!nome.trim()) erros.nomeUsuario = "Informe o nome.";
    else if (nome.trim().length > LIMITE_NOME) erros.nomeUsuario = `O nome pode ter até ${LIMITE_NOME} caracteres.`;
    if (!email.trim()) {
        if (emailObrigatorio) erros.usuario = "Informe o e-mail.";
    } else if (!FORMATO_EMAIL.test(email.trim())) erros.usuario = "E-mail inválido.";
    return erros;
}

export async function carregarConta(id: number): Promise<ContaEditavel> {
    const resposta = await apiFetch(`/usuarios/${id}`);
    if (resposta.status === 404) throw new Error("Conta não encontrada.");
    if (!resposta.ok) throw new Error((await lerErro(resposta, "Não foi possível carregar os dados da conta.")).mensagem);
    return resposta.json();
}

/// PUT /usuarios/atualizar: sem e-mail no pedido, o e-mail da conta continua o mesmo
export async function atualizarConta(conta: ContaEditavel): Promise<ResultadoEdicao> {
    const email = conta.usuario?.trim();
    let resposta: Response;
    try {
        resposta = await apiFetch("/usuarios/atualizar", {
            method: "PUT",
            body: JSON.stringify({
                id: conta.id,
                nomeUsuario: conta.nomeUsuario.trim(),
                ...(email ? {usuario: email} : {}),
                tipoUsuario: conta.tipoUsuario,
            }),
        });
    } catch {
        return {ok: false, erros: {geral: "Não foi possível conectar ao servidor."}};
    }

    if (resposta.ok) return {ok: true, conta: await resposta.json()};

    if (resposta.status === 404) return {ok: false, erros: {geral: "Esta conta não existe mais."}};

    const falha = await lerErro(resposta, "Não foi possível salvar as alterações.");

    switch (falha.codigo) {
        case "VALIDACAO_FALHOU":
            return {ok: false, erros: {...(falha.campos ?? {}), geral: falha.campos ? undefined : falha.mensagem}};
        case "SOMENTE_PROPRIO_USUARIO":
            return {ok: false, erros: {geral: "Você só pode editar a sua própria conta."}};
        case "ALTERACAO_DE_TIPO_NEGADA":
            return {ok: false, erros: {geral: "Você não tem permissão para mudar o tipo da conta."}};
        case "REBAIXAR_ADMINISTRADOR_NEGADO":
            return {ok: false, erros: {tipoUsuario: falha.mensagem}};
    }

    /// E-mail já usado por outra conta
    if (/já existe/i.test(falha.mensagem)) {
        return {ok: false, erros: {usuario: "Este e-mail já é usado por outra conta."}};
    }

    return {ok: false, erros: {geral: falha.mensagem}};
}
