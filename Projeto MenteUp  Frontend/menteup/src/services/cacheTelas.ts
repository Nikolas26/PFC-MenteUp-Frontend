/// Cache simples dos dados já buscados pelas telas
/// Fica só na memória da aba (nada é salvo no navegador) e vale apenas para a sessão atual
/// Uso: a tela abre na hora com o que já tinha e busca a versão nova em segundo plano

interface Entrada {
    sessao: string | null;
    valor: unknown;
}

const memoria = new Map<string, Entrada>();

function sessaoAtual(): string | null {
    return localStorage.getItem("token");
}

/// Devolve o valor guardado, ou undefined se não houver (ou se for de outro login)
export function lerCache<T>(chave: string): T | undefined {
    const entrada = memoria.get(chave);
    if (!entrada) return undefined;

    if (entrada.sessao !== sessaoAtual()) {
        memoria.delete(chave);
        return undefined;
    }

    return entrada.valor as T;
}

export function gravarCache<T>(chave: string, valor: T) {
    memoria.set(chave, { sessao: sessaoAtual(), valor });
}

/// Chamado no logout e depois de qualquer criação, edição ou exclusão
export function limparCache() {
    memoria.clear();
}
