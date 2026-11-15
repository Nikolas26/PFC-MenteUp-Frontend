import DocumentoLegal from "../components/DocumentoLegal";

/// O texto do Termo agora vem do servidor, sempre na versão em vigor
function TermoAceite() {
    return (
        <DocumentoLegal
            tipo="termo"
            titulo="Termo de Aceite e Uso"
            subtitulo="Condições para utilizar a plataforma MenteUp."
            outroDocumento={{ rotulo: "Política de Privacidade", para: "/politica-privacidade" }}
        />
    );
}

export default TermoAceite;
