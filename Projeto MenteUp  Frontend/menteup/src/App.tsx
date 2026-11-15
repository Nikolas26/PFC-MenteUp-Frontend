import { lazy, Suspense, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/login";
import PrivateRoute from "./routes/privateRoute";
import Footer from "./Footer";

/// Páginas carregadas sob demanda: o navegador só baixa o código de uma tela quando ela é aberta
const Cadastro = lazy(() => import("./pages/cadastro"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const PrimeiroAcesso = lazy(() => import("./pages/PrimeiroAcesso"));
const DashboardAluno = lazy(() => import("./pages/aluno/dashboardAluno"));
const AtividadesAluno = lazy(() => import("./pages/aluno/atividadesAluno"));
const TurmasAluno = lazy(() => import("./pages/aluno/turmasAluno"));
const Ranking = lazy(() => import("./pages/aluno/Ranking"));
const Conquistas = lazy(() => import("./pages/aluno/Conquistas"));
const ResponderAtividadesAluno = lazy(() => import("./pages/aluno/ResponderAtividadeAluno"));
const DesafiosAluno = lazy(() => import("./pages/Desafio/desafiosAluno.tsx"));
const JogarDesafio = lazy(() => import("./pages/Desafio/JogarDesafio.tsx"));
const DashboardProfessor = lazy(() => import("./pages/professor/dashboardProfessor.tsx"));
const AtividadesProfessor = lazy(() => import("./pages/professor/atividadesProfessor"));
const VisualizarAtividadeProfessor = lazy(() => import("./pages/professor/VisualizarAtividadeProfessor"));
const EditarAtividadeProfessor = lazy(() => import("./pages/professor/EditarAtividadeProfessor"));
const CriarAtividadeProfessor = lazy(() => import("./pages/professor/CriarAtividadeProfessor"));
const DashboardAdmin = lazy(() => import("./pages/Administrador/DashboardAdministrador.tsx"));
const Usuarios = lazy(() => import("./pages/Administrador/usuario"));
const VisualizarAtividadeAdministrador = lazy(() => import("./pages/Administrador/VisualizarAtividadeAdministrador"));
const EditarAtividadeAdministrador = lazy(() => import("./pages/Administrador/EditarAtividadeAdministrador"));
const CriarAtividadeAdministrador = lazy(() => import("./pages/Administrador/CriarAtividadeAdministrador"));
const AtividadesAdministrador = lazy(() => import("./pages/Administrador/AtividadesAdministrador"));
const LogsAdministrador = lazy(() => import("./pages/Administrador/LogsAdministrador.tsx"));
const TurmasGestao = lazy(() => import("./pages/Desafio/TurmasGestao.tsx"));
const DetalheTurma = lazy(() => import("./pages/Desafio/DetalheTurma.tsx"));
const DesafiosGestao = lazy(() => import("./pages/Desafio/DesafiosGestao.tsx"));
const CriarDesafio = lazy(() => import("./pages/Desafio/CriarDesafio.tsx"));
const ConduzirDesafio = lazy(() => import("./pages/Desafio/ConduzirDesafio.tsx"));
const DesempenhoAluno = lazy(() => import("./pages/Desempenho/DesempenhoAluno.tsx"));
const Verificar2FA = lazy(() => import("./pages/Verificar2FA.tsx"));
const TermoAceite = lazy(() => import("./pages/TermoAceite"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const NovoAceite = lazy(() => import("./pages/NovoAceite"));
const MeusDados = lazy(() => import("./pages/MeusDados"));
const Desempenho = lazy(() => import("./pages/Desempenho/Desempenho.tsx"));
const MeuPerfil = lazy(() => import("./pages/Perfil/MeuPerfil.tsx"));


function App() {
    const navigate = useNavigate();

    useEffect(() => {

        function receberMensagem(event: MessageEvent) {

            if (event.data?.tipo === "ABRIR_ATIVIDADES") {
                navigate("/aluno/atividades");
            }
        }

        navigator.serviceWorker.addEventListener(
            "message",
            receberMensagem
        );

        return () => {
            navigator.serviceWorker.removeEventListener(
                "message",
                receberMensagem
            );
        };

    }, [navigate]);
    const location = useLocation();
    const notificacoesAtivas = useRef(false);

    /// O Firebase só é baixado e iniciado para quem já entrou; confere de novo a cada troca de tela
    useEffect(() => {
        if (notificacoesAtivas.current || !localStorage.getItem("token")) return;
        notificacoesAtivas.current = true;

        import("./firebase/fcmService")
            .then(({ ouvirNotificacoesFCM }) => ouvirNotificacoesFCM())
            .catch(() => {
                notificacoesAtivas.current = false;
            });
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen flex-col">

            <main className="flex-1">

                {/* Cada página é baixada só quando é aberta pela primeira vez */}
                <Suspense fallback={<CarregandoPagina />}>
                <Routes>

                    {/* PÚBLICO */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/cadastro" element={<Cadastro />} />
                    <Route path="/verificar-2fa" element={<Verificar2FA />} />
                    <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                    <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                    <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />

                    {/* MEUS DADOS EM FORMATO DE LEITURA */}
                    <Route
                        path="/meus-dados"
                        element={
                            <PrivateRoute permitido={["ALUNO", "PROFESSOR", "ADMINISTRADOR"]}>
                                <MeusDados />
                            </PrivateRoute>
                        }
                    />

                    {/* NOVA VERSÃO DO TERMO OU DA POLÍTICA */}
                    <Route
                        path="/novo-aceite"
                        element={
                            <PrivateRoute permitido={["ALUNO", "PROFESSOR", "ADMINISTRADOR"]}>
                                <NovoAceite />
                            </PrivateRoute>
                        }
                    />


                    {/* ALUNO */}
                    <Route
                        path="/aluno/dashboard"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <DashboardAluno />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/aluno/perfil"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <MeuPerfil perfil="ALUNO" />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/aluno/turmas"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <TurmasAluno />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/aluno/atividades"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <AtividadesAluno />
                            </PrivateRoute>
                        }

                    />
                    <Route
                        path="/aluno/ranking"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <Ranking />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/aluno/conquistas"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <Conquistas />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/aluno/atividades/responder/:id"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <ResponderAtividadesAluno />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/aluno/desafios"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <DesafiosAluno />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/aluno/desafios/:id"
                        element={
                            <PrivateRoute permitido={["ALUNO"]}>
                                <JogarDesafio />
                            </PrivateRoute>
                        }
                    />

                    {/* PROFESSOR */}
                    <Route
                        path="/professor/dashboard"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <DashboardProfessor />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/perfil"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <MeuPerfil perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/professor/atividades"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <AtividadesProfessor />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/professor/turmas"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <TurmasGestao perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/turmas/:id"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <DetalheTurma perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/desafios"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <DesafiosGestao perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/desafios/criar"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <CriarDesafio perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/desafios/:id/editar"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <CriarDesafio perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/desafios/:id"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <ConduzirDesafio perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/atividades/criar"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <CriarAtividadeProfessor />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/atividades/:id"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <VisualizarAtividadeProfessor />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/atividades/editar/:id"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <EditarAtividadeProfessor />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/professor/desempenho/:turmaId/alunos/:alunoId"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <DesempenhoAluno perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/professor/desempenho"
                        element={
                            <PrivateRoute permitido={["PROFESSOR"]}>
                                <Desempenho perfil="PROFESSOR" />
                            </PrivateRoute>
                        }
                    />

                    {/* ADMINISTRADOR */}
                    <Route
                        path="/administrador/turmas"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <TurmasGestao perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/turmas/:id"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <DetalheTurma perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/desafios"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <DesafiosGestao perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/desafios/criar"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <CriarDesafio perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/desafios/:id/editar"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <CriarDesafio perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/desafios/:id"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <ConduzirDesafio perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/dashboard"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <DashboardAdmin />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/administrador/perfil"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <MeuPerfil perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />


                    <Route
                        path="/administrador/usuarios"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <Usuarios />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/atividades"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <AtividadesAdministrador />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/atividades/criar"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <CriarAtividadeAdministrador />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/atividades/:id"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <VisualizarAtividadeAdministrador />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/atividades/editar/:id"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <EditarAtividadeAdministrador />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/logs"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <LogsAdministrador />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/desempenho/:turmaId/alunos/:alunoId"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <DesempenhoAluno perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/desempenho"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <Desempenho perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/administrador/ranking"
                        element={
                            <PrivateRoute permitido={["ADMINISTRADOR"]}>
                                <Ranking perfil="ADMINISTRADOR" />
                            </PrivateRoute>
                        }
                    />
                    {/* DOCUMENTOS */}
                    <Route
                        path="/termo-de-aceite"
                        element={<TermoAceite />}
                    />

                    <Route
                        path="/politica-privacidade"
                        element={<PoliticaPrivacidade />}
                    />


                </Routes>
                </Suspense>

            </main>

            <Footer />

        </div>
    );
}

/// Aparece enquanto o arquivo da página está sendo baixado
function CarregandoPagina() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
            <span style={{ color: "var(--mu-text-muted)" }}>Carregando...</span>
        </div>
    );
}

export default App;
