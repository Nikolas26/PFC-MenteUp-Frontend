import {createContext, useContext, useEffect, useState, type FormEvent, type ReactNode} from "react";
import {useNavigate} from "react-router-dom";
import {Download, Eye, FileCheck, KeyRound, Mail, Pencil, ShieldAlert, Users} from "lucide-react";
import AlunoLayout from "../../components/aluno/AlunoLayout";
import ProfessorLayout from "../../components/professor/ProfessorLayout";
import AdminLayout from "../../components/administrador/AdminLayout";
import ConfirmarExclusao from "../../components/ConfirmarExclusao";
import CampoSenha, {type EstiloCampoSenha} from "../../components/CampoSenha";
import {senhaForte} from "../../services/senha";
import Avatar, {EscolherAvatar} from "../../components/Avatar";
import {apiFetch, lerErro} from "../../services/api";
import {atualizarUsuarioSalvo, deixarAvisoLogin, obterUsuarioLogado, sair} from "../../services/usuarioLogado";
import {atualizarConta, carregarConta, LIMITE_NOME, mesmoEmail, validarEdicao, type ContaEditavel, type ErrosEdicao} from "../../services/edicaoUsuario";
import {baixarMeusDados, buscarAceites, type SituacaoAceites} from "../../services/documentos";
import type {Perfil} from "../../services/turmaDesafio";
import aluno from "./perfilAluno.module.css";


// Resposta de GET /usuarios/me
interface PerfilUsuario {
    id: number;
    nome: string;
    emailAnonimizado: string;
    tipoUsuario: string;
    avatar: string | null;
    turmas: { id: number; nome: string }[];
}

const NOME_PERFIL: Record<string, string> = {
    ALUNO: "Aluno",
    PROFESSOR: "Professor",
    ADMINISTRADOR: "Administrador",
};

/*
 * A tela é a mesma para os três perfis, todos com o visual escuro novo.
 * O que muda é o menu lateral: AlunoLayout, ProfessorLayout ou AdminLayout.
 * (ESTILO_PADRAO, o painel claro antigo, ficou só como modelo do tipo Estilo.)
 */
const ESTILO_PADRAO = {
    escuro: false,
    header: "mb-6",
    eyebrow: "hidden",
    title: "text-2xl font-semibold",
    subtitle: "mt-1 text-sm text-slate-400",
    erroGeral: "mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600",
    carregando: "py-12 text-center text-sm text-slate-400",
    conteudo: "flex max-w-2xl flex-col gap-6",
    secao: "rounded-xl border border-slate-200 bg-white p-6 shadow-sm",
    secaoPerigo: "rounded-xl border border-red-200 bg-white p-6 shadow-sm",
    tituloSecao: "mb-4 flex items-center gap-2 font-semibold",
    tituloPerigo: "mb-2 flex items-center gap-2 font-semibold text-red-600",
    identidade: "mb-5 flex items-center gap-4",
    nome: "text-lg font-semibold",
    badgePerfil: "rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600",
    linkFoto: "mt-2 block text-sm font-medium text-purple-600 hover:underline",
    painelAvatar: "mb-5 rounded-lg border border-slate-200 p-4",
    painelAvatarTitulo: "mb-3 text-sm font-medium text-slate-600",
    dados: "grid gap-4 text-sm sm:grid-cols-2",
    dt: "mb-1 flex items-center gap-1 text-slate-400",
    dd: "font-medium",
    ddAjuda: "mt-0.5 text-xs text-slate-400",
    listaTurmas: "flex flex-wrap gap-2",
    chipTurma: "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600",
    vazio: "text-slate-400",
    form: "flex flex-col gap-3",
    label: "mb-1 block text-sm font-medium",
    input: "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm",
    ajuda: "mt-1 text-xs text-slate-400",
    texto: "mb-3 text-sm text-slate-500",
    textoErro: "text-sm text-red-600",
    textoSucesso: "text-sm text-emerald-600",
    botaoPrimario: "self-start rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50",
    botaoPerigo: "mt-3 rounded-lg border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50",
    nomeLinha: "flex items-center gap-2",
    botaoEditar: "rounded-lg p-1 text-slate-400 hover:bg-slate-100",
    acoesForm: "flex flex-wrap gap-3",
    botaoSecundario: "rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold",
    avisoTroca: "text-xs text-amber-600",
};

type Estilo = typeof ESTILO_PADRAO;

const ESTILO_ALUNO: Estilo = {
    escuro: true,
    header: aluno.header,
    eyebrow: aluno.eyebrow,
    title: aluno.title,
    subtitle: aluno.subtitle,
    erroGeral: aluno.erroGeral,
    carregando: aluno.carregando,
    conteudo: aluno.conteudo,
    secao: aluno.secao,
    secaoPerigo: aluno.secaoPerigo,
    tituloSecao: aluno.tituloSecao,
    tituloPerigo: aluno.tituloPerigo,
    identidade: aluno.identidade,
    nome: aluno.nome,
    badgePerfil: aluno.badgePerfil,
    linkFoto: aluno.linkFoto,
    painelAvatar: aluno.painelAvatar,
    painelAvatarTitulo: aluno.painelAvatarTitulo,
    dados: aluno.dados,
    dt: aluno.dt,
    dd: aluno.dd,
    ddAjuda: aluno.ddAjuda,
    listaTurmas: aluno.listaTurmas,
    chipTurma: aluno.chipTurma,
    vazio: aluno.vazio,
    form: aluno.form,
    label: aluno.label,
    input: aluno.input,
    ajuda: aluno.ajuda,
    texto: aluno.texto,
    textoErro: aluno.textoErro,
    textoSucesso: aluno.textoSucesso,
    botaoPrimario: aluno.botaoPrimario,
    botaoPerigo: aluno.botaoPerigo,
    nomeLinha: aluno.nomeLinha,
    botaoEditar: aluno.botaoEditar,
    acoesForm: aluno.acoesForm,
    botaoSecundario: aluno.botaoSecundario,
    avisoTroca: aluno.avisoTroca,
};

const EstiloContext = createContext<Estilo>(ESTILO_PADRAO);
const useEstilo = () => useContext(EstiloContext);

// Menu lateral de cada perfil (o mesmo das outras telas dele)
function Moldura({perfil, children}: { perfil: Perfil; children: ReactNode }) {
    if (perfil === "ALUNO") return <AlunoLayout>{children}</AlunoLayout>;
    if (perfil === "PROFESSOR") return <ProfessorLayout>{children}</ProfessorLayout>;
    return <AdminLayout>{children}</AdminLayout>;
}

const SOBRETITULO: Record<Perfil, string> = {
    ALUNO: "Sua jornada",
    PROFESSOR: "Espaço do professor",
    ADMINISTRADOR: "Central administrativa",
};

function MeuPerfil({perfil}: { perfil: Perfil }) {
    const [dados, setDados] = useState<PerfilUsuario | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const s = ESTILO_ALUNO; // visual escuro para os três perfis

    useEffect(() => {
        async function carregar() {
            try {
                const resposta = await apiFetch("/usuarios/me");

                if (!resposta.ok) {
                    setErro((await lerErro(resposta, "Não foi possível carregar o perfil.")).mensagem);
                    return;
                }

                setDados(await resposta.json());
            } catch {
                setErro("Não foi possível conectar ao servidor.");
            }
        }

        carregar();
    }, []);

    return (
        <EstiloContext.Provider value={s}>
            <Moldura perfil={perfil}>
                <header className={s.header}>
                    <span className={s.eyebrow}>{SOBRETITULO[perfil]}</span>
                    <h1 className={s.title}>Meu perfil</h1>
                    <p className={s.subtitle}>Seus dados, sua senha e a exclusão da conta.</p>
                </header>

                {erro && <div className={s.erroGeral} role="alert">{erro}</div>}

                {!dados && !erro && <p className={s.carregando}>Carregando perfil...</p>}

                {dados && (
                    <div className={s.conteudo}>
                        <DadosPessoais dados={dados} onAvatarAlterado={(avatar) => setDados({...dados, avatar})}
                                       onNomeAlterado={(nome) => setDados({...dados, nome})}/>
                        <AlterarSenha/>
                        <Privacidade/>
                        <ExcluirConta administrador={dados.tipoUsuario === "ADMINISTRADOR"}/>
                    </div>
                )}
            </Moldura>
        </EstiloContext.Provider>
    );
}

// Atualiza o usuário salvo no login, para o cabeçalho mostrar a foto nova sem sair e entrar de novo
function salvarAvatarNoLogin(avatar: string) {
    try {
        const usuario = JSON.parse(localStorage.getItem("usuario") ?? "{}");
        localStorage.setItem("usuario", JSON.stringify({...usuario, avatar}));
    } catch {
        // Sem login salvo: o cabeçalho atualiza no próximo login
    }
}

// Foto (avatar), nome, e-mail anonimizado, perfil e turmas
function DadosPessoais({dados, onAvatarAlterado, onNomeAlterado}: {
    dados: PerfilUsuario;
    onAvatarAlterado: (avatar: string) => void;
    onNomeAlterado: (nome: string) => void;
}) {
    const s = useEstilo();
    const rotuloTurmas = dados.tipoUsuario === "PROFESSOR" ? "Turmas que leciona" : "Minhas turmas";
    const [escolhendo, setEscolhendo] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erroAvatar, setErroAvatar] = useState<string | null>(null);
    const [editando, setEditando] = useState(false);

    async function escolherAvatar(avatar: string) {
        setSalvando(true);
        setErroAvatar(null);

        try {
            const resposta = await apiFetch("/usuarios/me/avatar", {
                method: "PUT",
                body: JSON.stringify({avatar}),
            });

            if (!resposta.ok) {
                setErroAvatar((await lerErro(resposta, "Não foi possível trocar a foto.")).mensagem);
                return;
            }

            salvarAvatarNoLogin(avatar);
            onAvatarAlterado(avatar);
            setEscolhendo(false);
        } catch {
            setErroAvatar("Não foi possível conectar ao servidor.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <section className={s.secao}>
            <div className={s.identidade}>
                <Avatar avatar={dados.avatar} nome={dados.nome} tamanho="grande"/>
                <div>
                    <div className={s.nomeLinha}>
                        <p className={s.nome}>{dados.nome}</p>
                        <button
                            type="button"
                            title="Editar dados"
                            aria-label="Editar nome e e-mail"
                            aria-pressed={editando}
                            onClick={() => {
                                setEscolhendo(false);
                                setEditando((aberto) => !aberto);
                            }}
                            className={s.botaoEditar}
                        >
                            <Pencil size={16}/>
                        </button>
                    </div>
                    <span className={s.badgePerfil}>
                        {NOME_PERFIL[dados.tipoUsuario] ?? dados.tipoUsuario}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setEditando(false);
                            setEscolhendo((aberto) => !aberto);
                        }}
                        className={s.linkFoto}
                    >
                        {escolhendo ? "Fechar" : dados.avatar ? "Trocar foto" : "Escolher foto"}
                    </button>
                </div>
            </div>

            {escolhendo && (
                <div className={s.painelAvatar}>
                    <p className={s.painelAvatarTitulo}>Escolha sua foto de perfil</p>
                    <EscolherAvatar atual={dados.avatar} salvando={salvando} onEscolher={escolherAvatar}
                                    escuro={s.escuro}/>
                    {erroAvatar && <p className={`mt-3 ${s.textoErro}`}>{erroAvatar}</p>}
                </div>
            )}

            {editando && (
                <EditarDados
                    id={dados.id}
                    onCancelar={() => setEditando(false)}
                    onSalvo={(nome) => {
                        onNomeAlterado(nome);
                        setEditando(false);
                    }}
                />
            )}

            <dl className={s.dados}>
                <div>
                    <dt className={s.dt}><Mail size={14}/> E-mail</dt>
                    <dd className={s.dd}>{dados.emailAnonimizado}</dd>
                    <dd className={s.ddAjuda}>Parte do e-mail fica oculta para proteger seus dados.</dd>
                </div>

                {dados.tipoUsuario !== "ADMINISTRADOR" && (
                    <div>
                        <dt className={s.dt}><Users size={14}/> {rotuloTurmas}</dt>
                        <dd className={s.dd}>
                            {dados.turmas.length === 0 ? (
                                <span className={s.vazio}>Nenhuma turma</span>
                            ) : (
                                <ul className={s.listaTurmas}>
                                    {dados.turmas.map((turma) => (
                                        <li key={turma.id} className={s.chipTurma}>
                                            {turma.nome}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </dd>
                    </div>
                )}
            </dl>
        </section>
    );
}

/// Edição de nome e e-mail da própria conta; o tipo vai como veio do GET, sem mudar
function EditarDados({id, onCancelar, onSalvo}: {
    id: number;
    onCancelar: () => void;
    onSalvo: (nome: string) => void;
}) {
    const s = useEstilo();
    const navigate = useNavigate();
    const [conta, setConta] = useState<ContaEditavel | null>(null);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [erroCarga, setErroCarga] = useState<string | null>(null);
    const [erros, setErros] = useState<ErrosEdicao>({});
    const [salvando, setSalvando] = useState(false);

    /// O GET /usuarios/me traz o e-mail mascarado, por isso a carga vem do GET /usuarios/{id}
    useEffect(() => {
        carregarConta(id)
            .then((dados) => {
                setConta(dados);
                setNome(dados.nomeUsuario);
                setEmail(dados.usuario ?? "");
            })
            .catch((e: Error) => setErroCarga(e.message));
    }, [id]);

    const emailMudou = conta !== null && !mesmoEmail(email, conta.usuario);
    const semMudanca = conta !== null && !emailMudou && nome.trim() === conta.nomeUsuario.trim();

    async function salvar(evento: FormEvent) {
        evento.preventDefault();
        if (!conta || salvando) return;

        const locais = validarEdicao(nome, email);
        setErros(locais);
        if (Object.keys(locais).length > 0) return;

        setSalvando(true);
        const resultado = await atualizarConta({...conta, nomeUsuario: nome, usuario: email});
        setSalvando(false);

        if (!resultado.ok) {
            setErros(resultado.erros);
            return;
        }

        /// O e-mail é o login: com ele trocado, o acesso atual deixa de valer
        if (!mesmoEmail(resultado.conta.usuario, conta.usuario)) {
            sair();
            deixarAvisoLogin("E-mail alterado. Entre novamente com o novo e-mail.");
            navigate("/login", {replace: true});
            return;
        }

        atualizarUsuarioSalvo({nome: resultado.conta.nomeUsuario});
        onSalvo(resultado.conta.nomeUsuario);
    }

    return (
        <div className={s.painelAvatar}>
            <p className={s.painelAvatarTitulo}>Editar dados</p>

            {erroCarga && <p className={s.textoErro}>{erroCarga}</p>}
            {!conta && !erroCarga && <p className={s.vazio}>Carregando...</p>}

            {conta && (
                <form onSubmit={salvar} className={s.form} noValidate>
                    <div>
                        <label htmlFor="editar-nome" className={s.label}>Nome</label>
                        <input id="editar-nome" className={s.input} value={nome} maxLength={LIMITE_NOME}
                               autoComplete="name" onChange={(e) => {
                                   setNome(e.target.value);
                                   setErros({...erros, nomeUsuario: undefined});
                               }}/>
                        {erros.nomeUsuario && <p className={`mt-1 ${s.textoErro}`}>{erros.nomeUsuario}</p>}
                    </div>

                    <div>
                        <label htmlFor="editar-email" className={s.label}>E-mail</label>
                        <input id="editar-email" type="email" className={s.input} value={email}
                               autoComplete="email" onChange={(e) => {
                                   setEmail(e.target.value);
                                   setErros({...erros, usuario: undefined});
                               }}/>
                        {erros.usuario && <p className={`mt-1 ${s.textoErro}`}>{erros.usuario}</p>}
                        {emailMudou && (
                            <p className={`mt-1 ${s.avisoTroca}`}>
                                Confira se digitou certo: os códigos de verificação passam a ir para este e-mail.
                                Depois de salvar, você vai precisar entrar novamente com ele.
                            </p>
                        )}
                    </div>

                    {erros.geral && <p className={s.textoErro}>{erros.geral}</p>}

                    <div className={s.acoesForm}>
                        <button type="submit" disabled={salvando || semMudanca} className={s.botaoPrimario}>
                            {salvando ? "Salvando..." : "Salvar alterações"}
                        </button>
                        <button type="button" onClick={onCancelar} disabled={salvando} className={s.botaoSecundario}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// Troca de senha: pede a atual e confirma a nova antes de enviar
function AlterarSenha() {
    const s = useEstilo();
    const navigate = useNavigate();
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    // Conferências feitas na tela, antes de chamar a API
    const confirmacaoDiferente = confirmacao !== "" && confirmacao !== novaSenha;
    const podeEnviar = senhaAtual !== "" && senhaForte(novaSenha) && confirmacao === novaSenha && !salvando;

    async function enviar(evento: FormEvent) {
        evento.preventDefault();
        setSalvando(true);
        setErro(null);

        try {
            const resposta = await apiFetch("/usuarios/me/senha", {
                method: "PUT",
                body: JSON.stringify({senhaAtual, novaSenha}),
            });

            if (!resposta.ok) {
                setErro((await lerErro(resposta, "Não foi possível alterar a senha.")).mensagem);
                return;
            }

            /// Com a senha nova, o acesso antigo deixa de valer: a pessoa entra de novo
            sair();
            deixarAvisoLogin("Senha alterada. Entre novamente com a nova senha.");
            navigate("/login", {replace: true});
        } catch {
            setErro("Não foi possível conectar ao servidor.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <section className={s.secao}>
            <h2 className={s.tituloSecao}><KeyRound size={18}/> Alterar senha</h2>

            <form onSubmit={enviar} className={s.form}>
                <CampoSenha id="senha-atual" rotulo="Senha atual" valor={senhaAtual} aoMudar={setSenhaAtual}
                            autoComplete="current-password" estilo={estiloSenha(s)}/>
                <CampoSenha id="nova-senha" rotulo="Nova senha" valor={novaSenha} aoMudar={setNovaSenha}
                            autoComplete="new-password" mostrarRequisitos estilo={estiloSenha(s)}/>
                <CampoSenha id="confirmar-senha" rotulo="Confirme a nova senha" valor={confirmacao} aoMudar={setConfirmacao}
                            autoComplete="new-password" estilo={estiloSenha(s)}/>

                {confirmacaoDiferente && <p className={s.textoErro}>As senhas não conferem.</p>}
                {erro && <p className={s.textoErro}>{erro}</p>}

                <button type="submit" disabled={!podeEnviar} className={s.botaoPrimario}>
                    {salvando ? "Salvando..." : "Salvar nova senha"}
                </button>
            </form>
        </section>
    );
}

/// Mostra "2026-11-20 10:15:00" como "20/11/2026 às 10:15"
function formatarDataHora(texto: string): string {
    const [data, hora = ""] = texto.split(/[ T]/);
    const [ano, mes, dia] = data.split("-");
    if (!ano || !mes || !dia) return texto;
    return hora ? `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}` : `${dia}/${mes}/${ano}`;
}

const NOME_DOCUMENTO: Record<string, string> = {
    TERMO: "Termo de Aceite",
    POLITICA: "Política de Privacidade",
};

/// Baixar os próprios dados e ver quais versões do Termo e da Política foram aceitas
function Privacidade() {
    const s = useEstilo();
    const navigate = useNavigate();
    const [situacao, setSituacao] = useState<SituacaoAceites | null>(null);
    const [erroAceites, setErroAceites] = useState<string | null>(null);
    const [baixando, setBaixando] = useState(false);
    const [erroDownload, setErroDownload] = useState<string | null>(null);

    useEffect(() => {
        buscarAceites()
            .then(setSituacao)
            .catch((e: Error) => setErroAceites(e.message));
    }, []);

    async function baixar() {
        setBaixando(true);
        setErroDownload(null);

        try {
            await baixarMeusDados();
        } catch (e) {
            setErroDownload((e as Error).message);
        } finally {
            setBaixando(false);
        }
    }

    /// Do aceite mais recente para o mais antigo
    const aceites = [...(situacao?.aceites ?? [])].sort((a, b) => b.aceitoEm.localeCompare(a.aceitoEm));

    return (
        <section className={s.secao}>
            <h2 className={s.tituloSecao}><FileCheck size={18}/> Privacidade</h2>

            <p className={s.texto}>
                Veja ou baixe tudo o que o MenteUp guarda sobre você: conta, turmas, atividades,
                desafios, conquistas e histórico de acessos.
            </p>

            <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => navigate("/meus-dados")} className={s.botaoPrimario}>
                    <Eye size={16} className="mr-2 inline"/>
                    Ver meus dados
                </button>
                <button type="button" onClick={baixar} disabled={baixando} className={s.botaoPrimario}>
                    <Download size={16} className="mr-2 inline"/>
                    {baixando ? "Preparando arquivo..." : "Baixar arquivo (JSON)"}
                </button>
            </div>
            <p className={`mt-2 ${s.ajuda}`}>
                O arquivo JSON pode ser lido por outros sistemas. Para ler ou imprimir, use "Ver meus dados".
            </p>
            {erroDownload && <p className={`mt-2 ${s.textoErro}`}>{erroDownload}</p>}

            <h3 className={`mt-6 ${s.label}`}>Meus aceites</h3>

            {erroAceites && <p className={s.textoErro}>{erroAceites}</p>}
            {!situacao && !erroAceites && <p className={s.vazio}>Carregando...</p>}
            {situacao && aceites.length === 0 && <p className={s.vazio}>Nenhum aceite registrado.</p>}

            {aceites.length > 0 && (
                <dl className={s.dados}>
                    {aceites.map((aceite) => (
                        <div key={`${aceite.tipo}-${aceite.versao}-${aceite.aceitoEm}`}>
                            <dt className={s.dt}>{NOME_DOCUMENTO[aceite.tipo] ?? aceite.tipo}</dt>
                            <dd className={s.dd}>Versão {aceite.versao}</dd>
                            <dd className={s.ddAjuda}>Aceito em {formatarDataHora(aceite.aceitoEm)}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}

// Exclusão dos dados: anonimiza na hora, depois de confirmar com a senha
function ExcluirConta({administrador}: { administrador: boolean }) {
    const s = useEstilo();
    const navigate = useNavigate();
    const [senha, setSenha] = useState("");
    const [confirmando, setConfirmando] = useState(false);
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    async function excluir() {
        setProcessando(true);
        setErro(null);

        try {
            const resposta = await apiFetch("/usuarios/me/exclusao", {
                method: "POST",
                body: JSON.stringify({senha}),
            });

            if (!resposta.ok) {
                setErro((await lerErro(resposta, "Não foi possível excluir os dados.")).mensagem);
                setConfirmando(false);
                return;
            }

            // A conta não existe mais: limpa o login salvo e volta para a entrada
            sair();
            navigate("/login", {replace: true});
        } catch {
            setErro("Não foi possível conectar ao servidor.");
            setConfirmando(false);
        } finally {
            setProcessando(false);
        }
    }

    return (
        <section className={s.secaoPerigo}>
            <h2 className={s.tituloPerigo}><ShieldAlert size={18}/> Excluir meus dados</h2>

            {administrador ? (
                <p className={s.texto}>
                    Contas de administrador não podem ser excluídas por aqui, para o sistema não ficar sem administração.
                </p>
            ) : (
                <>
                    <p className={s.texto}>
                        Seu nome e e-mail serão apagados e você sairá das turmas. Suas notas continuam nas estatísticas,
                        mas sem identificar você. <strong>Essa ação não pode ser desfeita.</strong>
                    </p>

                    <CampoSenha id="senha-exclusao" rotulo="Digite sua senha para confirmar" valor={senha}
                                aoMudar={setSenha} autoComplete="current-password" estilo={estiloSenha(s)}/>

                    {erro && <p className={`mt-2 ${s.textoErro}`}>{erro}</p>}

                    <button
                        type="button"
                        onClick={() => setConfirmando(true)}
                        disabled={senha === "" || processando}
                        className={s.botaoPerigo}
                    >
                        Excluir meus dados
                    </button>
                </>
            )}

            {confirmando && (
                <ConfirmarExclusao
                    titulo="Excluir seus dados?"
                    mensagem="Você será desconectado e não poderá mais entrar com esta conta."
                    processando={processando}
                    rotuloConfirmar="Sim, excluir"
                    rotuloProcessando="Excluindo..."
                    onConfirmar={excluir}
                    onCancelar={() => setConfirmando(false)}
                />
            )}
        </section>
    );
}

export default MeuPerfil;

/// A mesma caixa de exclusão de conta, para usar fora do "Meu perfil"
export function ExcluirMinhaConta() {
    return (
        <EstiloContext.Provider value={ESTILO_ALUNO}>
            <ExcluirConta administrador={obterUsuarioLogado()?.tipoUsuario === "ADMINISTRADOR"}/>
        </EstiloContext.Provider>
    );
}

// Classes do tema do "Meu perfil" para o campo de senha compartilhado
function estiloSenha(s: ReturnType<typeof useEstilo>): EstiloCampoSenha {
    return {label: s.label, input: s.input, ajuda: s.ajuda};
}
