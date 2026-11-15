export interface UsuarioLogado {
    id?: number;
    usuarioId?: number;
    nome?: string;
    usuario?: string;
    tipoUsuario?: string;
    avatar?: string | null;
}

export function obterUsuarioLogado(): UsuarioLogado | null {
    try {
        const salvo = localStorage.getItem("usuario");
        return salvo ? (JSON.parse(salvo) as UsuarioLogado) : null;
    } catch {
        return null;
    }
}

export function idDoUsuario(usuario: UsuarioLogado | null): number | null {
    const id = usuario?.id ?? usuario?.usuarioId ?? Number(localStorage.getItem("usuarioId"));
    return id ? Number(id) : null;
}

export function primeiroNome(usuario: UsuarioLogado | null): string {
    const base = usuario?.nome?.trim() || usuario?.usuario?.split("@")[0] || "aluno";
    return base.split(/\s+/)[0];
}

export function iniciais(nome?: string): string {
    if (!nome) return "?";
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.[0] ?? "";
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
    return (primeira + ultima).toUpperCase() || "?";
}

export function nomeCurto(nome?: string): string {
    if (!nome) return "";
    const partes = nome.trim().split(/\s+/);
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0];
}

export function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuarioId");
}

/// Dados que chegam quando o login dá certo
export interface RespostaLogin extends UsuarioLogado {
    token: string;
    aceitesPendentes?: string[];
}

/// Tela inicial de cada perfil
export function painelDoPerfil(tipoUsuario?: string): string | null {
    switch (tipoUsuario) {
        case "ALUNO":
            return "/aluno/dashboard";
        case "PROFESSOR":
            return "/professor/dashboard";
        case "ADMINISTRADOR":
            return "/administrador/dashboard";
        default:
            return null;
    }
}

/// Guarda o acesso no navegador sem repetir o token nos dados da pessoa e diz para qual tela ela vai
export function salvarLogin(dados: RespostaLogin): string | null {
    const { token, aceitesPendentes, ...usuario } = dados;

    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));

    const painel = painelDoPerfil(usuario.tipoUsuario);
    if (!painel) return null;

    /// Se saiu versão nova do Termo ou da Política, a pessoa aceita antes de entrar
    return aceitesPendentes && aceitesPendentes.length > 0 ? "/novo-aceite" : painel;
}

const CHAVE_AVISO_LOGIN = "avisoLogin";

/// Deixa um recado para a tela de login mostrar, por exemplo depois de trocar a senha
export function deixarAvisoLogin(texto: string) {
    sessionStorage.setItem(CHAVE_AVISO_LOGIN, texto);
}

/// Lê o recado deixado para a tela de login
export function lerAvisoLogin(): string {
    return sessionStorage.getItem(CHAVE_AVISO_LOGIN) ?? "";
}

/// Apaga o recado depois que ele já apareceu
export function apagarAvisoLogin() {
    sessionStorage.removeItem(CHAVE_AVISO_LOGIN);
}
