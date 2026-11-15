/// Nome de cada ação do histórico, do jeito que a pessoa entende
const ACOES: Record<string, string> = {
    LOGIN: "Entrada no sistema",
    FALHA_LOGIN: "Tentativa de entrada que falhou",
    CADASTRAR_USUARIO: "Criação da conta",
    ACEITAR_TERMO: "Aceite do Termo e da Política",
    ALTERAR_SENHA: "Troca de senha",
    REDEFINIR_SENHA: "Nova senha criada pelo link do e-mail",
    EXPORTAR_DADOS: "Consulta ou download dos seus dados",
    EXCLUIR_PROPRIA_CONTA: "Exclusão da própria conta",
    CONSULTAR_LOGS: "Consulta ao histórico do sistema",
    ALTERACAO_PERMISSAO: "Mudança de permissão",
    ERRO_SISTEMA: "Erro no sistema",
    CRIAR_TURMA: "Turma criada",
    EDITAR_TURMA: "Turma alterada",
    ADICIONAR_ALUNO_TURMA: "Aluno colocado na turma",
    REMOVER_ALUNO_TURMA: "Aluno retirado da turma",
    CRIAR_ATIVIDADE: "Atividade criada",
    EDITAR_ATIVIDADE: "Atividade alterada",
    PUBLICAR_ATIVIDADE: "Atividade publicada",
    EXCLUIR_ATIVIDADE: "Atividade excluída",
    INICIAR_ATIVIDADE: "Atividade iniciada",
    CONCLUIR_ATIVIDADE: "Atividade concluída",
    CRIAR_QUESTAO: "Questão criada",
    EDITAR_QUESTAO: "Questão alterada",
    EXCLUIR_QUESTAO: "Questão excluída",
    RESPONDER_QUESTAO: "Questão respondida",
    CRIAR_DESAFIO: "Desafio criado",
    EDITAR_DESAFIO: "Desafio alterado",
    INICIAR_DESAFIO: "Desafio iniciado",
    ENCERRAR_DESAFIO: "Desafio encerrado",
    EXCLUIR_DESAFIO: "Desafio excluído",
    DESBLOQUEAR_CONQUISTA: "Conquista desbloqueada",
};

/// Nomes dos campos que aparecem nas listas
const CAMPOS: Record<string, string> = {
    nome: "Nome",
    titulo: "Título",
    descricao: "Descrição",
    turma: "Turma",
    status: "Situação",
    pontuacao: "Pontuação",
    pontos: "Pontos",
    acertos: "Acertos",
    totalQuestoes: "Total de questões",
    comentario: "Comentário do professor",
    comentarioProfessor: "Comentário do professor",
    concluidaEm: "Concluída em",
    concluidoEm: "Concluído em",
    desbloqueadaEm: "Desbloqueada em",
    dataCriacao: "Criada em",
    dataHora: "Data",
    xp: "XP",
};

const PERFIS: Record<string, string> = {
    ALUNO: "Aluno",
    PROFESSOR: "Professor",
    ADMINISTRADOR: "Administrador",
};

const DOCUMENTOS: Record<string, string> = {
    TERMO: "Termo de Aceite",
    POLITICA: "Política de Privacidade",
};

/// Transforma "EXCLUIR_PROPRIA_CONTA" em "Excluir propria conta" quando não há tradução pronta
function deCodigo(codigo: string): string {
    const texto = codigo.toLowerCase().replace(/_/g, " ");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/// Transforma "totalQuestoes" em "Total questoes" quando não há tradução pronta
function deCampo(campo: string): string {
    const texto = campo.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const nomeDaAcao = (acao: string) => ACOES[acao] ?? deCodigo(acao);
export const nomeDoCampo = (campo: string) => CAMPOS[campo] ?? deCampo(campo);
export const nomeDoPerfil = (perfil: string) => PERFIS[perfil] ?? deCodigo(perfil);
export const nomeDoDocumento = (tipo: string) => DOCUMENTOS[tipo] ?? deCodigo(tipo);

const DATA = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/// Diz se o texto é uma data vinda do servidor
export const ehData = (valor: unknown): valor is string => typeof valor === "string" && DATA.test(valor);

/// Mostra "2026-11-15T16:21:54" como "15/11/2026 às 16:21"
export function dataHora(valor: string): string {
    const partes = valor.match(DATA);
    if (!partes) return valor;
    const [, ano, mes, dia, hora, minuto] = partes;
    return hora ? `${dia}/${mes}/${ano} às ${hora}:${minuto}` : `${dia}/${mes}/${ano}`;
}

/// Só o dia: "15/11/2026"
export function soData(valor: string): string {
    const partes = valor.match(DATA);
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : valor;
}

/// Só a hora: "16:21"
export function soHora(valor: string): string {
    const partes = valor.match(DATA);
    return partes && partes[4] ? `${partes[4]}:${partes[5]}` : "";
}

/// Qualquer valor em texto: datas formatadas, sim ou não, códigos legíveis
export function valorLegivel(valor: unknown): string {
    if (valor === null || valor === undefined) return "";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    if (typeof valor === "number") return valor.toLocaleString("pt-BR");
    if (ehData(valor)) return dataHora(valor);
    if (typeof valor === "string") return /^[A-Z_]+$/.test(valor) ? deCodigo(valor) : valor;
    if (Array.isArray(valor)) return valor.map(valorLegivel).filter(Boolean).join(", ");
    if (typeof valor === "object") {
        const objeto = valor as Record<string, unknown>;
        return valorLegivel(objeto.nome ?? objeto.titulo ?? "");
    }
    return String(valor);
}
