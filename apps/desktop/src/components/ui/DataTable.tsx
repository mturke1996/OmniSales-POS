import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { CaretUpDown } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

export function DataTable<T>({
  data,
  columns,
  emptyMessage = "لا توجد بيانات",
  className,
  stickyHeader = true,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={cn("overflow-x-auto rounded-panel border border-paper-line/70", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead
          className={cn(
            "bg-paper text-xs text-ink-mute",
            stickyHeader && "sticky top-0 z-10 shadow-[0_1px_0_rgb(var(--paper-line)/0.8)]"
          )}
        >
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-start font-semibold whitespace-nowrap"
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 transition hover:text-ink"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <CaretUpDown size={12} />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {!table.getRowModel().rows.length ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-14 text-center text-sm text-ink-mute"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-paper-line/50 transition hover:bg-paper/60"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
