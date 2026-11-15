import {useEffect, useMemo, useState, type FormEvent} from "react";
import {Check, ChevronLeft, ChevronRight, Ellipsis, GraduationCap, Pencil, Search, ShieldCheck, Trash2, User, UserCheck, UserPlus, Users, X} from "lucide-react";
import {useNavigate} from "react-router-dom";
import AdminLayout from "../../components/administrador/AdminLayout";
import {apiFetch, lerErro} from "../../services/api";
import styles from "./Administrador.module.css";
import {RostoUsuario} from "../../components/Avatar";
import ConfirmarExclusao from "../../components/ConfirmarExclusao";
import CampoSenha, {type EstiloCampoSenha} from "../../components/CampoSenha";
import {atualizarUsuarioSalvo, deixarAvisoLogin, idDoUsuario, obterUsuarioLogado, sair} from "../../services/usuarioLogado";
import {atualizarConta, carregarConta, LIMITE_NOME, mesmoEmail, validarEdicao, type ContaEditavel, type ErrosEdicao} from "../../services/edicaoUsuario";

/// Classes do campo de senha dentro do modal de exclusão
const ESTILO_SENHA: EstiloCampoSenha = {
    campo: styles.campoSenha,
    label: styles.rotuloSenha,
    envoltorio: styles.envoltorioSenha,
    input: `${styles.campo} ${styles.inputSenha}`,
    botaoOlho: styles.olhoSenha,
    ajuda: styles.erroCampo,
};

const POR_PAGINA = 8;

type Tipo = "ALUNO" | "PROFESSOR" | "ADMINISTRADOR";

/// Ausente quando a conta já está liberada
type StatusCadastro = "PENDENTE" | "APROVADA" | "REJEITADA";

/// Valor do filtro de perfil que lista só as solicitações
const FILTRO_SOLICITACOES = "SOLICITACOES";

interface UsuarioApi {
    id: number;
    nomeUsuario: string;
    usuario: string;
    tipoUsuario?: string;
    aguardandoPrimeiroAcesso?: boolean;
    statusCadastro?: StatusCadastro | null;
    avatar?: string | null;
    dataCadastro?: string;
    dataCriacao?: string;
    criadoEm?: string;
}

interface TurmaApi {
    id: number;
    nome: string;
    alunos?: { id: number }[];
    professor?: { id: number } | null;
}

interface LogLogin {
    usuarioId: number | null;
    dataHora: string;
}

interface Usuario {
    id: number;
    nome: string;
    email: string;
    tipo: Tipo;
    pendente: boolean;
    statusCadastro: StatusCadastro | null;
    cadastro: string | null;
    ultimoAcesso: string | null;
    turmas: string[];
    avatar: string | null;
    excluido: boolean;
}

/// O registro continua na listagem com um e-mail técnico
function contaExcluida(email: string) {
    return email.endsWith("@menteup.invalid");
}

/// Administradores e contas já excluídas não podem ser excluídos
function podeExcluir(u: Usuario) {
    return u.tipo !== "ADMINISTRADOR" && !u.excluido;
}

/// Outros administradores não podem ser editados por aqui, só a própria conta
function podeEditar(u: Usuario, meuId: number | null) {
    return !u.excluido && (u.tipo !== "ADMINISTRADOR" || u.id === meuId);
}

const TIPO: Record<Tipo, { rotulo: string; classe: string; icone: typeof User }> = {
    ALUNO: {rotulo: "Aluno", classe: styles.badgeNeutro, icone: User},
    PROFESSOR: {rotulo: "Professor", classe: styles.badgeMint, icone: GraduationCap},
    ADMINISTRADOR: {rotulo: "Administrador", classe: styles.badgeOuro, icone: ShieldCheck},
};

const STATUS: Record<StatusCadastro, { rotulo: string; situacao: string; classe: string }> = {
    PENDENTE: {rotulo: "Pendente", situacao: "Solicitação aguardando análise", classe: styles.badgeOuro},
    APROVADA: {rotulo: "Aprovado", situacao: "Solicitação aprovada", classe: styles.badgeMint},
    REJEITADA: {rotulo: "Rejeitado", situacao: "Solicitação rejeitada", classe: styles.badgeCoral},
};

function BadgeStatus({status}: { status: StatusCadastro | null }) {
    if (!status) return null;
    const {rotulo, classe} = STATUS[status];
    return <span className={`${styles.badge} ${classe}`}>{rotulo}</span>;
}

/// Professor pendente ou rejeitado ainda não tem acesso
function liberado(u: Usuario) {
    return u.statusCadastro !== "PENDENTE" && u.statusCadastro !== "REJEITADA";
}

function tipoDe(valor?: string): Tipo {
    const v = valor?.toUpperCase();
    return v === "PROFESSOR" || v === "ADMINISTRADOR" ? v : "ALUNO";
}

function identificador(id: number) {
    return `USR-${String(id).padStart(3, "0")}`;
}

function formatar(iso: string | null, comHora = true) {
    if (!iso) return "—";
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "—";
    const dia = data.toLocaleDateString("pt-BR");
    return comHora ? `${dia}, ${data.toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})}` : dia;
}

function BadgeTipo({tipo}: { tipo: Tipo }) {
    const {rotulo, classe, icone: Icone} = TIPO[tipo];
    return (
        <span className={`${styles.badge} ${classe}`}>
            <Icone size={13}/> {rotulo}
        </span>
    );
}

/// Confirmação da exclusão com a senha do administrador (DELETE /usuarios/{id})
function ExcluirUsuario({usuario, onFechar, onExcluido, onDesatualizado}: {
    usuario: Usuario;
    onFechar: () => void;
    onExcluido: () => void;
    onDesatualizado: (mensagem: string) => void;
}) {
    const [senha, setSenha] = useState("");
    const [excluindo, setExcluindo] = useState(false);
    const [erroCampo, setErroCampo] = useState("");
    const [erroGeral, setErroGeral] = useState("");

    async function excluir() {
        if (excluindo) return;
        setErroCampo("");
        setErroGeral("");

        if (!senha.trim()) {
            setErroCampo("Informe a sua senha para confirmar");
            return;
        }

        try {
            setExcluindo(true);
            const resposta = await apiFetch(`/usuarios/${usuario.id}`, {
                method: "DELETE",
                body: JSON.stringify({senha}),
            });

            if (resposta.ok) {
                onExcluido();
                return;
            }

            const falha = await lerErro(resposta, "Não foi possível excluir o usuário.");
            switch (falha.codigo) {
                case "VALIDACAO_FALHOU":
                    setErroCampo(falha.campos?.senha ?? falha.mensagem);
                    break;
                case "SENHA_INCORRETA":
                    setErroCampo("Senha incorreta");
                    setSenha("");
                    break;
                /// A lista está desatualizada, então fecha e recarrega
                case "USUARIO_NAO_ENCONTRADO":
                case "USUARIO_JA_EXCLUIDO":
                    onDesatualizado(falha.mensagem);
                    break;
                case "ACESSO_NEGADO":
                case "SOMENTE_ADMINISTRADOR":
                    setErroGeral("Você não tem permissão para excluir usuários.");
                    break;
                default:
                    setErroGeral(falha.mensagem);
            }
        } catch {
            setErroGeral("Não foi possível conectar ao servidor.");
        } finally {
            setExcluindo(false);
        }
    }

    return (
        <ConfirmarExclusao
            titulo="Excluir usuário?"
            mensagem={<>
                A conta de <strong>{usuario.nome}</strong> ({usuario.email}) será excluída. Essa ação é
                irreversível. Digite a sua senha para confirmar.
            </>}
            processando={excluindo}
            onConfirmar={excluir}
            onCancelar={onFechar}
        >
            {/* /// Enter no campo também confirma */}
            <div onKeyDown={(e) => e.key === "Enter" && excluir()}>
                <CampoSenha
                    id="senha-exclusao"
                    rotulo="Sua senha de administrador"
                    valor={senha}
                    aoMudar={(valor) => {
                        setSenha(valor);
                        setErroCampo("");
                    }}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    ajuda={erroCampo || undefined}
                    estilo={ESTILO_SENHA}
                    autoFocus
                />
            </div>
            {erroGeral && <div className={`${styles.error} ${styles.erroModal}`} role="alert">{erroGeral}</div>}
        </ConfirmarExclusao>
    );
}

/// Edição de nome, e-mail e tipo pelo administrador (PUT /usuarios/atualizar)
function EditarUsuario({usuario, propria, onFechar, onSalvo}: {
    usuario: Usuario;
    propria: boolean;
    onFechar: () => void;
    onSalvo: (conta: ContaEditavel, emailMudou: boolean) => void;
}) {
    const [conta, setConta] = useState<ContaEditavel | null>(null);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [tipo, setTipo] = useState<Tipo>(usuario.tipo);
    const [erroCarga, setErroCarga] = useState("");
    const [erros, setErros] = useState<ErrosEdicao>({});
    const [salvando, setSalvando] = useState(false);

    /// A lista pode estar desatualizada, então os dados vêm do GET /usuarios/{id}
    useEffect(() => {
        carregarConta(usuario.id)
            .then((dados) => {
                setConta(dados);
                setNome(dados.nomeUsuario);
                setEmail(dados.usuario);
                setTipo(tipoDe(dados.tipoUsuario));
            })
            .catch((e: Error) => setErroCarga(e.message));
    }, [usuario.id]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !salvando) onFechar();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onFechar, salvando]);

    /// O tipo de uma conta de administrador não pode ser alterado (nem o próprio)
    const contaAdmin = conta !== null && tipoDe(conta.tipoUsuario) === "ADMINISTRADOR";
    const tipoEnviado: Tipo = contaAdmin ? "ADMINISTRADOR" : tipo;

    const emailMudou = conta !== null && !mesmoEmail(email, conta.usuario);
    const semMudanca = conta !== null && !emailMudou && nome.trim() === conta.nomeUsuario.trim()
        && tipoEnviado === tipoDe(conta.tipoUsuario);

    async function salvar(evento: FormEvent) {
        evento.preventDefault();
        if (!conta || salvando) return;

        const locais = validarEdicao(nome, email);
        setErros(locais);
        if (Object.keys(locais).length > 0) return;

        setSalvando(true);
        const resultado = await atualizarConta({...conta, nomeUsuario: nome, usuario: email, tipoUsuario: tipoEnviado});
        setSalvando(false);

        if (!resultado.ok) {
            setErros(resultado.erros);
            return;
        }
        onSalvo(resultado.conta, !mesmoEmail(resultado.conta.usuario, conta.usuario));
    }

    return (
        <div className={styles.overlay} onClick={() => !salvando && onFechar()}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="editar-titulo"
                 onClick={(e) => e.stopPropagation()}>
                <button type="button" className={styles.modalClose} onClick={onFechar} disabled={salvando}
                        aria-label="Fechar">
                    <X size={18}/>
                </button>
                <h2 id="editar-titulo" className={styles.modalTitle}>Editar usuário</h2>
                <p className={styles.modalSubtitle}>
                    {propria ? "Seus dados de acesso." : <>Dados de <strong>{usuario.nome}</strong> ({identificador(usuario.id)}).</>}
                </p>

                {erroCarga && <div className={styles.error} role="alert">{erroCarga}</div>}
                {!conta && !erroCarga && <p className={styles.muted}>Carregando dados...</p>}

                {conta && (
                    <form onSubmit={salvar} className={styles.formNovo} noValidate>
                        <label>Nome
                            <input className={styles.campo} value={nome} maxLength={LIMITE_NOME} autoComplete="off"
                                   onChange={(e) => {
                                       setNome(e.target.value);
                                       setErros({...erros, nomeUsuario: undefined});
                                   }}/>
                            {erros.nomeUsuario && <span className={styles.erroCampo}>{erros.nomeUsuario}</span>}
                        </label>
                        <label>E-mail
                            <input className={styles.campo} type="email" value={email} autoComplete="off"
                                   onChange={(e) => {
                                       setEmail(e.target.value);
                                       setErros({...erros, usuario: undefined});
                                   }}/>
                            {erros.usuario && <span className={styles.erroCampo}>{erros.usuario}</span>}
                        </label>
                        <label>Tipo de usuário
                            <select className={styles.select} value={tipoEnviado} disabled={contaAdmin}
                                    onChange={(e) => {
                                        setTipo(e.target.value as Tipo);
                                        setErros({...erros, tipoUsuario: undefined});
                                    }}>
                                <option value="ALUNO">Aluno</option>
                                <option value="PROFESSOR">Professor</option>
                                <option value="ADMINISTRADOR">Administrador</option>
                            </select>
                            {contaAdmin && (
                                <span className={styles.ajudaCampo}>
                                    O tipo de uma conta de administrador não pode ser alterado.
                                </span>
                            )}
                            {erros.tipoUsuario && <span className={styles.erroCampo}>{erros.tipoUsuario}</span>}
                        </label>

                        {emailMudou && (
                            <div className={styles.avisoTroca} role="status">
                                {propria
                                    ? "Depois de salvar, você será desconectado e precisará entrar com o novo e-mail."
                                    : `${usuario.nome} será desconectado(a) e precisará entrar com o novo e-mail.`}
                                {" "}Os códigos de verificação passam a ir para o novo endereço: confira se está certo.
                            </div>
                        )}

                        {erros.geral && <div className={styles.error} role="alert">{erros.geral}</div>}

                        <button type="submit" className={styles.primaryButton} disabled={salvando || semMudanca}>
                            <Check size={18}/> {salvando ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

/*
 * Criação de usuário pelo administrador (POST /usuarios).
 * É o único jeito de criar outro ADMINISTRADOR: o cadastro público aceita só Aluno e Professor.
 */
function NovoUsuario({onFechar, onCriado}: { onFechar: () => void; onCriado: (mensagem: string) => void }) {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [tipo, setTipo] = useState<Tipo>("PROFESSOR");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    async function salvar(evento: FormEvent) {
        evento.preventDefault();
        setErro("");

        if (!nome.trim() || !email.trim()) {
            setErro("Preencha o nome e o e-mail.");
            return;
        }

        try {
            setSalvando(true);
            const resposta = await apiFetch("/usuarios", {
                method: "POST",
                body: JSON.stringify({nomeUsuario: nome.trim(), usuario: email.trim(), tipoUsuario: tipo}),
            });

            if (!resposta.ok) {
                setErro((await lerErro(resposta, "Não foi possível criar o usuário.")).mensagem);
                return;
            }

            onCriado(`${TIPO[tipo].rotulo} "${nome.trim()}" criado. O convite para criar a senha foi enviado para ${email.trim()}.`);
        } catch {
            setErro("Não foi possível conectar ao servidor.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className={styles.overlay} onClick={onFechar}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="novo-titulo"
                 onClick={(e) => e.stopPropagation()}>
                <button type="button" className={styles.modalClose} onClick={onFechar} aria-label="Fechar">
                    <X size={18}/>
                </button>
                <h2 id="novo-titulo" className={styles.modalTitle}>Novo usuário</h2>
                <p className={styles.modalSubtitle}>
                    A pessoa recebe um e-mail com um link (válido por 3 dias) para criar a própria senha e aceitar o
                    Termo de Aceite e a Política de Privacidade. Só o administrador pode criar outro administrador.
                </p>

                <form onSubmit={salvar} className={styles.formNovo}>
                    <label>Nome
                        <input className={styles.campo} value={nome} onChange={(e) => setNome(e.target.value)}
                               autoComplete="off"/>
                    </label>
                    <label>E-mail
                        <input className={styles.campo} type="email" value={email}
                               onChange={(e) => setEmail(e.target.value)} autoComplete="off"/>
                    </label>
                    <label>Tipo de usuário
                        <select className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
                            <option value="ALUNO">Aluno</option>
                            <option value="PROFESSOR">Professor</option>
                            <option value="ADMINISTRADOR">Administrador</option>
                        </select>
                    </label>

                    {erro && <div className={styles.error} role="alert">{erro}</div>}

                    <button type="submit" className={styles.primaryButton} disabled={salvando}>
                        <UserPlus size={18}/> {salvando ? "Enviando convite..." : "Criar e enviar convite"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function Usuarios() {
    const navigate = useNavigate();
    const meuId = idDoUsuario(obterUsuarioLogado());
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [busca, setBusca] = useState("");
    const [perfil, setPerfil] = useState("");
    const [pagina, setPagina] = useState(0);
    const [detalhe, setDetalhe] = useState<Usuario | null>(null);
    const [novoAberto, setNovoAberto] = useState(false);
    const [aviso, setAviso] = useState("");
    const [versao, setVersao] = useState(0);
    const [respondendo, setRespondendo] = useState(false);
    const [erroResposta, setErroResposta] = useState("");
    const [excluindo, setExcluindo] = useState<Usuario | null>(null);
    const [editando, setEditando] = useState<Usuario | null>(null);
    const [alerta, setAlerta] = useState("");

    function abrirDetalhe(u: Usuario | null) {
        setErroResposta("");
        setDetalhe(u);
    }

    async function responderSolicitacao(u: Usuario, acao: "aprovar" | "rejeitar") {
        setErroResposta("");
        try {
            setRespondendo(true);
            const resposta = await apiFetch(`/usuarios/${u.id}/${acao}`, {method: "PUT"});

            if (!resposta.ok) {
                const falha = await lerErro(resposta, "Não foi possível responder a solicitação.");
                setErroResposta(falha.mensagem);
                /// Outra aba ou outro clique já respondeu o pedido
                if (falha.codigo === "PEDIDO_NAO_PENDENTE") setVersao((atual) => atual + 1);
                return;
            }

            const atualizado: UsuarioApi = await resposta.json();
            const linha = {...u, statusCadastro: atualizado.statusCadastro ?? null};
            setUsuarios((lista) => lista.map((item) => (item.id === u.id ? linha : item)));
            setDetalhe(null);
            setAviso(acao === "aprovar"
                ? `Cadastro de "${u.nome}" aprovado. A pessoa foi avisada por e-mail.`
                : `Cadastro de "${u.nome}" rejeitado. A pessoa foi avisada por e-mail.`);
        } catch {
            setErroResposta("Não foi possível conectar ao servidor.");
        } finally {
            setRespondendo(false);
        }
    }

    useEffect(() => {
        async function carregar() {
            try {
                const [respUsuarios, respTurmas, respLogs] = await Promise.all([
                    apiFetch("/usuarios/all"),
                    apiFetch("/turmas/all?incluirArquivadas=true"),
                    apiFetch("/logs?acao=LOGIN&resultado=SUCESSO&page=0&size=1000"),
                ]);

                if (!respUsuarios.ok) throw new Error("Falha ao consultar os usuários.");

                const lista: UsuarioApi[] = await respUsuarios.json();
                const turmas: TurmaApi[] = respTurmas.ok ? await respTurmas.json() : [];
                const logs: LogLogin[] = respLogs.ok ? ((await respLogs.json()).content ?? []) : [];

                const ultimo = new Map<number, string>();
                logs.forEach((log) => {
                    if (log.usuarioId == null) return;
                    const atual = ultimo.get(log.usuarioId);
                    if (!atual || new Date(log.dataHora) > new Date(atual)) ultimo.set(log.usuarioId, log.dataHora);
                });

                setUsuarios(lista.map((u) => ({
                    id: u.id,
                    nome: u.nomeUsuario,
                    email: u.usuario,
                    tipo: tipoDe(u.tipoUsuario),
                    pendente: u.aguardandoPrimeiroAcesso === true,
                    statusCadastro: u.statusCadastro ?? null,
                    cadastro: u.dataCadastro ?? u.dataCriacao ?? u.criadoEm ?? null,
                    ultimoAcesso: ultimo.get(u.id) ?? null,
                    avatar: u.avatar ?? null,
                    excluido: contaExcluida(u.usuario),
                    turmas: turmas
                        .filter((t) => t.alunos?.some((a) => a.id === u.id) || t.professor?.id === u.id)
                        .map((t) => t.nome),
                })));
            } catch (error) {
                console.error("Erro ao carregar usuários:", error);
                setErro("Não foi possível carregar os usuários.");
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, [versao]);

    useEffect(() => {
        if (!detalhe) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setDetalhe(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [detalhe]);

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return usuarios.filter((u) =>
            (!termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo))
            && (!perfil
                || (perfil === FILTRO_SOLICITACOES ? u.statusCadastro === "PENDENTE" : u.tipo === perfil))
        );
    }, [usuarios, busca, perfil]);

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const paginaAtual = Math.min(pagina, totalPaginas - 1);
    const visiveis = filtrados.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);
    const inicio = filtrados.length ? paginaAtual * POR_PAGINA + 1 : 0;
    const fim = paginaAtual * POR_PAGINA + visiveis.length;

    /// Contas excluídas ficam fora dos totais
    const ativos = usuarios.filter((u) => !u.excluido);
    const contar = (tipo: Tipo) => ativos.filter((u) => u.tipo === tipo && liberado(u)).length;
    const resumo = [
        {valor: ativos.length, rotulo: "Usuários cadastrados", icone: <Users size={22}/>, cor: styles.corLilas},
        {valor: contar("ALUNO"), rotulo: "Alunos", icone: <User size={22}/>, cor: styles.corMint},
        {valor: contar("PROFESSOR"), rotulo: "Professores", icone: <GraduationCap size={22}/>, cor: styles.corOuro},
        {valor: contar("ADMINISTRADOR"), rotulo: "Administradores", icone: <ShieldCheck size={22}/>, cor: styles.corCoral},
    ];

    const pendentes = usuarios.filter((u) => u.statusCadastro === "PENDENTE").length;
    const vendoConcessoes = perfil === FILTRO_SOLICITACOES;

    function edicaoSalva(u: Usuario, conta: ContaEditavel, emailMudou: boolean) {
        const propria = u.id === meuId;

        /// O e-mail é o login: com ele trocado, o acesso atual deixa de valer
        if (propria && emailMudou) {
            sair();
            deixarAvisoLogin("E-mail alterado. Entre novamente com o novo e-mail.");
            navigate("/login", {replace: true});
            return;
        }

        if (propria) atualizarUsuarioSalvo({nome: conta.nomeUsuario});

        const linha: Usuario = {...u, nome: conta.nomeUsuario, email: conta.usuario, tipo: tipoDe(conta.tipoUsuario)};
        setUsuarios((lista) => lista.map((item) => (item.id === u.id ? linha : item)));
        setEditando(null);
        setAviso(emailMudou
            ? `Dados de "${linha.nome}" atualizados. Como o e-mail mudou, a pessoa foi desconectada e precisa entrar com ${linha.email}.`
            : `Dados de "${linha.nome}" atualizados.`);
    }

    function filtrar(acao: () => void) {
        acao();
        setPagina(0);
    }

    return (
        <AdminLayout>
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>Administração</span>
                    <h1 className={styles.title}>Gestão de usuários</h1>
                    <p className={styles.subtitle}>Contas e perfis dos usuários do MenteUp.</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={`${styles.ghostButton} ${styles.botaoConcessoes} ${vendoConcessoes ? styles.botaoConcessoesAtivo : ""}`}
                        aria-pressed={vendoConcessoes}
                        onClick={() => filtrar(() => setPerfil(vendoConcessoes ? "" : FILTRO_SOLICITACOES))}
                    >
                        <UserCheck size={18}/> Concessões pendentes
                        {/* /// Some quando não houver mais pedidos para responder */}
                        {pendentes > 0 && (
                            <span className={styles.notificacao} aria-label={`${pendentes} pendentes`}>
                                {pendentes > 99 ? "99+" : pendentes}
                            </span>
                        )}
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={() => setNovoAberto(true)}>
                        <UserPlus size={18}/> Novo usuário
                    </button>
                </div>
            </header>

            {aviso && <div className={styles.sucesso} role="status">{aviso}</div>}
            {alerta && <div className={styles.error} role="alert">{alerta}</div>}

            <div className={styles.summary}>
                {resumo.map((item) => (
                    <div key={item.rotulo} className={`${styles.card} ${styles.summaryCard}`}>
                        <span className={item.cor}>{item.icone}</span>
                        <span>
                            <strong>{carregando ? "–" : item.valor}</strong>
                            <small>{item.rotulo}</small>
                        </span>
                    </div>
                ))}
            </div>

            <h2 className={styles.sectionTitle}>{vendoConcessoes ? "Concessões pendentes" : "Todos os usuários"}</h2>

            <div className={styles.userFilters}>
                <label className={`${styles.search} ${styles.searchWide}`}>
                    <Search size={16}/>
                    <input
                        value={busca}
                        onChange={(e) => filtrar(() => setBusca(e.target.value))}
                        placeholder="Buscar por nome ou e-mail"
                        aria-label="Buscar por nome ou e-mail"
                    />
                </label>
                <select value={perfil} onChange={(e) => filtrar(() => setPerfil(e.target.value))} className={styles.select} aria-label="Perfil">
                    <option value="">Todos os perfis</option>
                    <option value="ALUNO">Aluno</option>
                    <option value="PROFESSOR">Professor</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value={FILTRO_SOLICITACOES}>Solicitações pendentes</option>
                </select>
            </div>

            {erro && <div className={styles.error} role="alert">{erro}</div>}

            <div className={`${styles.card} ${styles.tableCard}`}>
                <div className={styles.tableWrap}>
                    <table className={`${styles.table} ${styles.userTable}`}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>E-mail</th>
                                <th>Tipo de usuário</th>
                                <th>Último acesso</th>
                                <th aria-label="Ações"/>
                            </tr>
                        </thead>
                        <tbody>
                            {(carregando || visiveis.length === 0) && (
                                <tr>
                                    <td colSpan={5} className={styles.emptyCell}>
                                        {carregando ? "Carregando usuários..." : "Nenhum usuário encontrado."}
                                    </td>
                                </tr>
                            )}
                            {!carregando && visiveis.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <span className={styles.person}>
                                            <RostoUsuario avatar={u.avatar} nome={u.nome} className={styles.avatar}/>
                                            <span>
                                                <strong>{u.nome}</strong>
                                                <small>{identificador(u.id)}{u.pendente && " · convite pendente"}</small>
                                            </span>
                                        </span>
                                    </td>
                                    <td className={styles.muted}>{u.email}</td>
                                    <td>
                                        <BadgeTipo tipo={u.tipo}/> <BadgeStatus status={u.statusCadastro}/>
                                        {u.excluido && <span className={`${styles.badge} ${styles.badgeCoral}`}>Excluído</span>}
                                    </td>
                                    <td className={`${styles.muted} ${styles.nowrap}`}>{formatar(u.ultimoAcesso)}</td>
                                    <td>
                                        <span className={styles.acoesLinha}>
                                            <button
                                                type="button"
                                                title="Mais informações"
                                                aria-label={`Mais informações sobre ${u.nome}`}
                                                onClick={() => abrirDetalhe(u)}
                                                className={styles.iconButton}
                                            >
                                                <Ellipsis size={18}/>
                                            </button>
                                            {podeEditar(u, meuId) && (
                                                <button
                                                    type="button"
                                                    title="Editar usuário"
                                                    aria-label={`Editar ${u.nome}`}
                                                    onClick={() => {
                                                        setAviso("");
                                                        setAlerta("");
                                                        setEditando(u);
                                                    }}
                                                    className={styles.iconButton}
                                                >
                                                    <Pencil size={18}/>
                                                </button>
                                            )}
                                            {podeExcluir(u) && (
                                                <button
                                                    type="button"
                                                    title="Excluir usuário"
                                                    aria-label={`Excluir ${u.nome}`}
                                                    onClick={() => {
                                                        setAviso("");
                                                        setAlerta("");
                                                        setExcluindo(u);
                                                    }}
                                                    className={`${styles.iconButton} ${styles.iconButtonPerigo}`}
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className={styles.pager}>
                <span>{inicio}-{fim} de {filtrados.length} usuários</span>
                <div className={styles.pagerButtons}>
                    <button
                        type="button"
                        aria-label="Página anterior"
                        disabled={paginaAtual === 0}
                        onClick={() => setPagina(paginaAtual - 1)}
                        className={styles.roundButton}
                    >
                        <ChevronLeft size={18}/>
                    </button>
                    <span className={styles.pageCount}>{paginaAtual + 1} / {totalPaginas}</span>
                    <button
                        type="button"
                        aria-label="Próxima página"
                        disabled={paginaAtual + 1 >= totalPaginas}
                        onClick={() => setPagina(paginaAtual + 1)}
                        className={styles.roundButton}
                    >
                        <ChevronRight size={18}/>
                    </button>
                </div>
            </footer>

            {detalhe && (
                <div className={styles.overlay} onClick={() => setDetalhe(null)}>
                    <div
                        className={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="usuario-titulo"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button type="button" className={styles.modalClose} onClick={() => setDetalhe(null)} aria-label="Fechar">
                            <X size={18}/>
                        </button>
                        <h2 id="usuario-titulo" className={styles.modalTitle}>Detalhes do usuário</h2>
                        <p className={styles.modalSubtitle}>Informações cadastrais da conta selecionada.</p>
                        <div className={styles.modalHead}>
                            <strong>{detalhe.nome}</strong>
                        </div>
                        <dl className={styles.details}>
                            <div><dt>Identificador</dt><dd>{identificador(detalhe.id)}</dd></div>
                            <div><dt>E-mail</dt><dd>{detalhe.email}</dd></div>
                            <div><dt>Tipo de usuário</dt><dd>{TIPO[detalhe.tipo].rotulo}</dd></div>
                            <div><dt>Situação</dt><dd>{
                                detalhe.excluido ? "Conta excluída"
                                : detalhe.statusCadastro && detalhe.statusCadastro !== "APROVADA"
                                    ? STATUS[detalhe.statusCadastro].situacao
                                    : detalhe.pendente ? "Aguardando primeiro acesso (convite enviado)" : "Ativo"
                            }</dd></div>
                            <div><dt>Turmas</dt><dd>{detalhe.turmas.length ? detalhe.turmas.join(", ") : "—"}</dd></div>
                            <div><dt>Data de cadastro</dt><dd>{formatar(detalhe.cadastro, false)}</dd></div>
                            <div><dt>Último acesso</dt><dd>{formatar(detalhe.ultimoAcesso)}</dd></div>
                        </dl>
                        {erroResposta && <div className={styles.error} role="alert">{erroResposta}</div>}
                        {detalhe.statusCadastro === "PENDENTE" && (
                            <div style={{display: "flex", gap: 10, marginBottom: 10}}>
                                <button
                                    type="button"
                                    className={styles.primaryButton}
                                    style={{flex: 1}}
                                    disabled={respondendo}
                                    onClick={() => responderSolicitacao(detalhe, "aprovar")}
                                >
                                    <Check size={18}/> Aprovar
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.closeButton} ${styles.badgeCoral}`}
                                    style={{flex: 1}}
                                    disabled={respondendo}
                                    onClick={() => responderSolicitacao(detalhe, "rejeitar")}
                                >
                                    <X size={18}/> Rejeitar
                                </button>
                            </div>
                        )}
                        <button type="button" className={styles.closeButton} onClick={() => setDetalhe(null)}>
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {excluindo && (
                <ExcluirUsuario
                    usuario={excluindo}
                    onFechar={() => setExcluindo(null)}
                    onExcluido={() => {
                        setAviso(`A conta de "${excluindo.nome}" foi excluída.`);
                        setExcluindo(null);
                        setVersao((atual) => atual + 1);
                    }}
                    onDesatualizado={(mensagem) => {
                        setAlerta(mensagem);
                        setExcluindo(null);
                        setVersao((atual) => atual + 1);
                    }}
                />
            )}

            {editando && (
                <EditarUsuario
                    usuario={editando}
                    propria={editando.id === meuId}
                    onFechar={() => setEditando(null)}
                    onSalvo={(conta, emailMudou) => edicaoSalva(editando, conta, emailMudou)}
                />
            )}

            {novoAberto && (
                <NovoUsuario
                    onFechar={() => setNovoAberto(false)}
                    onCriado={(mensagem) => {
                        setNovoAberto(false);
                        setAviso(mensagem);
                        setVersao((atual) => atual + 1);
                    }}
                />
            )}
        </AdminLayout>
    );
}

export default Usuarios;
