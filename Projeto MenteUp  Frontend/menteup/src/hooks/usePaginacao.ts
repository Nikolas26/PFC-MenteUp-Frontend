import { useState } from "react";

/// Divide uma lista em páginas na própria tela
/// reiniciar: quando esse valor muda (ex: filtro ou busca), volta para a primeira página
export function usePaginacao<T>(lista: T[], porPagina: number, reiniciar: string = "") {
    const [pagina, setPagina] = useState(0);
    const [chave, setChave] = useState(reiniciar);

    if (chave !== reiniciar) {
        setChave(reiniciar);
        setPagina(0);
    }

    const total = lista.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    /// Se itens forem removidos, não deixa ficar numa página que não existe mais
    const paginaAtual = Math.min(pagina, totalPaginas - 1);
    const visiveis = lista.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina);

    return {
        visiveis,
        pagina: paginaAtual,
        totalPaginas,
        total,
        inicio: total ? paginaAtual * porPagina + 1 : 0,
        fim: paginaAtual * porPagina + visiveis.length,
        irPara: setPagina,
    };
}
