import { useCallback, useEffect, useState } from "react";

import { buscarDocumentoAtual } from "../services/documentos";

/// Versões do Termo e da Política que valem hoje, para enviar junto com o aceite
export interface VersoesDocumentos {
    termoVersao: string;
    politicaVersao: string;
}

export function useVersoesDocumentos() {
    const [versoes, setVersoes] = useState<VersoesDocumentos | null>(null);
    const [erroVersoes, setErroVersoes] = useState("");

    /// Pergunta ao servidor qual é a versão atual de cada documento
    const recarregarVersoes = useCallback(async () => {
        try {
            const [termo, politica] = await Promise.all([
                buscarDocumentoAtual("termo"),
                buscarDocumentoAtual("politica"),
            ]);
            setVersoes({ termoVersao: termo.versao, politicaVersao: politica.versao });
            setErroVersoes("");
        } catch {
            setVersoes(null);
            setErroVersoes("Não foi possível carregar o Termo e a Política. Atualize a página e tente de novo.");
        }
    }, []);

    useEffect(() => {
        recarregarVersoes();
    }, [recarregarVersoes]);

    return { versoes, erroVersoes, recarregarVersoes };
}
