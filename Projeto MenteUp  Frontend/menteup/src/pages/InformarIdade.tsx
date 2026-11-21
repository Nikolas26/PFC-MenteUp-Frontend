import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarHeart, LogOut } from "lucide-react";

import base from "../components/DocumentoLegal.module.css";
import styles from "./NovoAceite.module.css";
import { LogoMarca, LogoNome } from "../components/Logo";
import ConfirmarExclusao from "../components/ConfirmarExclusao";
import CampoDataNascimento, { problemaDataNascimento } from "../components/CampoDataNascimento";
import { apiFetch, lerErro } from "../services/api";
import { soData } from "../services/legivel";
import {
    deixarAvisoLogin,
    marcarIdadePendente,
    obterUsuarioLogado,
    painelDoPerfil,
    sair,
} from "../services/usuarioLogado";

/// Contas de aluno criadas antes da idade mínima: a pessoa informa a data de nascimento antes de entrar
function InformarIdade() {
    const navigate = useNavigate();

    const [dataNascimento, setDataNascimento] = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState("");

    /// Confere a data e abre a confirmação antes de enviar
    function revisar(evento: FormEvent) {
        evento.preventDefault();
        const problema = problemaDataNascimento(dataNascimento, true);
        setErro(problema);
        if (!problema) setConfirmando(true);
    }

    async function enviar() {
        setEnviando(true);
        setErro("");

        try {
            const resposta = await apiFetch("/usuarios/me/idade", {
                method: "POST",
                body: JSON.stringify({ dataNascimento }),
            });

            if (resposta.ok) {
                marcarIdadePendente(false);
                /// Tudo certo: as notificações do celular já podem ser ativadas
                void import("../firebase/fcmService").then(({ registrarTokenFCM }) => registrarTokenFCM())
                    .catch(() => undefined);
                navigate(painelDoPerfil(obterUsuarioLogado()?.tipoUsuario) ?? "/login", { replace: true });
                return;
            }

            const falha = await lerErro(resposta, "Não foi possível salvar a data de nascimento.");

            /// Menos de 12 anos: o servidor já excluiu a conta, então a pessoa sai e volta ao login
            if (resposta.status === 403 && falha.codigo === "IDADE_MINIMA") {
                sair();
                deixarAvisoLogin(falha.mensagem);
                navigate("/login", { replace: true });
                return;
            }

            setConfirmando(false);
            setErro(falha.mensagem);
        } catch {
            setConfirmando(false);
            setErro("Não foi possível conectar ao servidor.");
        } finally {
            setEnviando(false);
        }
    }

    function sairDaConta() {
        sair();
        navigate("/login", { replace: true });
    }

    return (
        <div className={base.page}>
            <header className={base.topbar}>
                <div className={base.inner}>
                    <span className={base.brand}>
                        <LogoMarca tamanho={36} />
                        <LogoNome className={base.brandName} />
                    </span>
                    <button type="button" className={base.back} onClick={sairDaConta}>
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </header>

            <main className={base.inner}>
                <header className={base.header}>
                    <span className={base.icon}>
                        <CalendarHeart size={22} />
                    </span>
                    <div>
                        <span className={base.eyebrow}>Antes de continuar</span>
                        <h1 className={base.title}>Informe sua data de nascimento</h1>
                        <p className={base.subtitle}>
                            O MenteUp é para pessoas com 12 anos ou mais. Precisamos dessa informação uma única vez.
                        </p>
                    </div>
                </header>

                {erro && (
                    <div className={base.aviso} role="alert">
                        {erro}
                    </div>
                )}

                <form className={styles.documento} onSubmit={revisar} noValidate>
                    <CampoDataNascimento valor={dataNascimento} aoMudar={setDataNascimento} />

                    <div className={styles.confirmacao}>
                        <span />
                        <button type="submit" className={styles.principal} disabled={!dataNascimento || enviando}>
                            Continuar
                        </button>
                    </div>
                </form>
            </main>

            {confirmando && (
                <ConfirmarExclusao
                    titulo="Confira a data"
                    mensagem={
                        <>
                            Você informou <strong>{soData(dataNascimento)}</strong>. Se você tiver menos de 12 anos,
                            sua conta será excluída.
                        </>
                    }
                    processando={enviando}
                    rotuloConfirmar="Confirmar data"
                    rotuloProcessando="Enviando..."
                    rotuloCancelar="Corrigir"
                    variante="confirmar"
                    onConfirmar={enviar}
                    onCancelar={() => setConfirmando(false)}
                />
            )}
        </div>
    );
}

export default InformarIdade;
