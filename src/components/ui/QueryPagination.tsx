"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  label: string;
  pageNumber: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
};

export default function QueryPagination({
  label,
  pageNumber,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, pageNumber), safeTotalPages);
  const pageOptions = useMemo(
    () => Array.from({ length: safeTotalPages }, (_, index) => index + 1),
    [safeTotalPages],
  );

  function updateQuery(nextPage: number, nextPageSize: number = pageSize) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    params.set("limit", String(nextPageSize));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  if (totalItems === 0) {
    return null;
  }

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="pagination-bar">
      <div className="pagination-controls">
        <button type="button" className="button button-outline pagination-button" onClick={() => updateQuery(1)} disabled={safePage <= 1}>
          <ChevronsLeft size={16} />
          Primera
        </button>
        <button type="button" className="button button-outline pagination-button" onClick={() => updateQuery(safePage - 1)} disabled={safePage <= 1}>
          <ChevronLeft size={16} />
          Anterior
        </button>
        <button type="button" className="button button-outline pagination-button" onClick={() => updateQuery(safePage + 1)} disabled={safePage >= safeTotalPages}>
          Siguiente
          <ChevronRight size={16} />
        </button>
        <button type="button" className="button button-outline pagination-button" onClick={() => updateQuery(safeTotalPages)} disabled={safePage >= safeTotalPages}>
          Ultima
          <ChevronsRight size={16} />
        </button>
      </div>

      <div className="pagination-meta">
        <span>
          {label}: {startItem}-{endItem} de {totalItems}
        </span>
        <select
          className="select pagination-select"
          value={String(safePage)}
          onChange={(event) => updateQuery(Number(event.target.value))}
          aria-label={`Ir a pagina de ${label}`}
        >
          {pageOptions.map((page) => (
            <option key={page} value={page}>
              Ir a pagina {page}
            </option>
          ))}
        </select>
        <select
          className="select pagination-select"
          value={String(pageSize)}
          onChange={(event) => updateQuery(1, Number(event.target.value))}
          aria-label={`Cantidad por pagina de ${label}`}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} por pagina
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
