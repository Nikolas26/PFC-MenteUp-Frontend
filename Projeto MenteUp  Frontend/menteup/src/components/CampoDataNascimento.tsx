import styles from "../pages/login.module.css";

/// Dia de hoje no formato do campo de data, para não deixar escolher uma data no futuro
export function hojeNoFormatoDeData(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
}

/// Confere o básico antes de enviar; a idade mínima quem decide é o servidor
export function problemaDataNascimento(data: string, obrigatoria: boolean): string {
    if (!data) return obrigatoria ? "Informe sua data de nascimento." : "";
    /// Dias que não existem, como 31 de fevereiro, também são recusados
    const [ano, mes, dia] = data.split("-").map(Number);
    const conferida = new Date(ano, mes - 1, dia);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || conferida.getMonth() !== mes - 1 || conferida.getDate() !== dia) {
        return "Data de nascimento inválida.";
    }
    if (data > hojeNoFormatoDeData()) return "A data de nascimento não pode estar no futuro.";
    if (data < "1900-01-01") return "Confira o ano da data de nascimento.";
    return "";
}

interface CampoDataNascimentoProps {
    valor: string;
    aoMudar: (valor: string) => void;
    ajuda?: string;
}

/// Campo de data de nascimento, usado no cadastro, no primeiro acesso e na tela de contas antigas
function CampoDataNascimento({ valor, aoMudar, ajuda }: CampoDataNascimentoProps) {
    return (
        <div className={styles.field}>
            <label htmlFor="dataNascimento" className={styles.label}>
                Data de nascimento
            </label>
            <input
                type="date"
                id="dataNascimento"
                autoComplete="bday"
                className={styles.input}
                min="1900-01-01"
                max={hojeNoFormatoDeData()}
                value={valor}
                onChange={(evento) => aoMudar(evento.target.value)}
            />
            {ajuda && <span style={{ fontSize: 12, lineHeight: "16px", opacity: 0.8 }}>{ajuda}</span>}
        </div>
    );
}

export default CampoDataNascimento;
