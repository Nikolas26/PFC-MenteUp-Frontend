import { ChevronLeft, ChevronRight } from "lucide-react";

import styles from "./Paginacao.module.css";

interface PaginacaoProps {
    pagina: number;
    totalPaginas: number;
    total: number;
    inicio: number;
    fim: number;
    /** Nome dos itens no plural, ex: "atividades" */
    rotulo: string;
    irPara: (pagina: number) => void;
}

/// Rodapé de paginação no mesmo padrão da Gestão de usuários; some quando tudo cabe em uma página
export default function Paginacao({ pagina, totalPaginas, total, inicio, fim, rotulo, irPara }: PaginacaoProps) {
    if (totalPaginas <= 1) return null;

    return (
        <footer className={styles.pager}>
            <span>{inicio}-{fim} de {total.toLocaleString("pt-BR")} {rotulo}</span>
            <div className={styles.pagerButtons}>
                <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={pagina === 0}
                    onClick={() => irPara(pagina - 1)}
                    className={styles.roundButton}
                >
                    <ChevronLeft size={18}/>
                </button>
                <span className={styles.pageCount}>{pagina + 1} / {totalPaginas}</span>
                <button
                    type="button"
                    aria-label="Próxima página"
                    disabled={pagina + 1 >= totalPaginas}
                    onClick={() => irPara(pagina + 1)}
                    className={styles.roundButton}
                >
                    <ChevronRight size={18}/>
                </button>
            </div>
        </footer>
    );
}
