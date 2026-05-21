"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

type Props<T> = {
  items: T[];
  pageSize?: number;
  label: string;
  className?: string;
  style?: CSSProperties;
  empty?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
};

export default function PaginatedList<T>({
  items,
  pageSize = 8,
  label,
  className,
  style,
  empty,
  renderItem,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visibleItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  if (items.length === 0) {
    return <>{empty ?? null}</>;
  }

  return (
    <div className="paginated-list-shell">
      <div className={className} style={style}>
        {visibleItems.map((item, index) => renderItem(item, (safePage - 1) * pageSize + index))}
      </div>

      {totalPages > 1 ? (
        <div className="pagination-bar">
          <div className="pagination-controls">
            <button type="button" className="button button-outline pagination-button" onClick={() => setPage(1)} disabled={safePage <= 1}>
              <ChevronsLeft size={16} />
              Primera
            </button>
            <button type="button" className="button button-outline pagination-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1}>
              <ChevronLeft size={16} />
              Anterior
            </button>
            <button type="button" className="button button-outline pagination-button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage >= totalPages}>
              Siguiente
              <ChevronRight size={16} />
            </button>
            <button type="button" className="button button-outline pagination-button" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}>
              Ultima
              <ChevronsRight size={16} />
            </button>
          </div>
          <div className="pagination-meta">
            {label}: pagina {safePage} de {totalPages} - {items.length} total
          </div>
        </div>
      ) : null}
    </div>
  );
}
