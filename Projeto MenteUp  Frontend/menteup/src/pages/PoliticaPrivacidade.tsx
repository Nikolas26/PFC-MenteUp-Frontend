import DocumentoLegal from "../components/DocumentoLegal";

/// O texto da Política agora vem do servidor, sempre na versão em vigor
function PoliticaPrivacidade() {
    return (
        <DocumentoLegal
            tipo="politica"
            titulo="Política de Privacidade"
            subtitulo="Como o MenteUp utiliza e protege os seus dados."
            outroDocumento={{ rotulo: "Termo de Aceite", para: "/termo-de-aceite" }}
        />
    );
}

export default PoliticaPrivacidade;
