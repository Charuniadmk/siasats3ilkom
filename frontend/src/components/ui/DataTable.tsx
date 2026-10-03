import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Checkbox from './Checkbox';
import Select from './Select';

export interface TableSort { key: string; direction: 'asc' | 'desc' }
export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
}
interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  getRowLabel: (row: T) => string;
  sort: TableSort;
  onSortChange: (sort: TableSort) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  caption: string;
}

export default function DataTable<T>({ columns, data, getRowId, getRowLabel, sort, onSortChange, selectedIds, onSelectionChange, meta, onPageChange, onPageSizeChange, loading, error, onRetry, emptyMessage = 'Data tidak ditemukan.', caption }: DataTableProps<T>) {
  const ids = data.map(getRowId);
  const selected = new Set(selectedIds);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  const disabled = Boolean(loading || error);
  return <div aria-busy={loading}>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-xs text-secondary"><tr>
          <th className="w-12 px-5 py-4"><Checkbox aria-label="Pilih semua data pada halaman ini" disabled={disabled || !ids.length} checked={ids.length > 0 && selectedCount === ids.length} indeterminate={selectedCount > 0 && selectedCount < ids.length} onChange={(event) => onSelectionChange(event.target.checked ? [...new Set([...selectedIds, ...ids])] : selectedIds.filter((id) => !ids.includes(id)))} /></th>
          {columns.map((column) => <th key={column.key} className="px-5 py-4 font-medium" aria-sort={column.sortable ? sort.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}>
            {column.sortable ? <button type="button" disabled={disabled} onClick={() => onSortChange({ key: column.key, direction: sort.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc' })} className="inline-flex items-center gap-2 hover:text-accent disabled:opacity-50" aria-label={`Urutkan ${column.header}`}>
              {column.header}{sort.key !== column.key ? <ArrowUpDown size={14} aria-hidden="true" /> : sort.direction === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
            </button> : column.header}
          </th>)}
        </tr></thead>
        <tbody className="divide-y divide-border">
          {loading ? <tr><td colSpan={columns.length + 1} className="p-12 text-center text-secondary"><span role="status">Memuat data...</span></td></tr> : error ? <tr><td colSpan={columns.length + 1} className="p-10 text-center"><p role="alert" className="text-error">{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 text-accent">Coba kembali</button>}</td></tr> : !data.length ? <tr><td colSpan={columns.length + 1} className="p-12 text-center text-secondary">{emptyMessage}</td></tr> : data.map((row) => <tr key={getRowId(row)} className={selected.has(getRowId(row)) ? 'bg-blue-50/60' : 'hover:bg-surface/50'}>
            <td className="px-5 py-5"><Checkbox aria-label={`Pilih ${getRowLabel(row)}`} checked={selected.has(getRowId(row))} onChange={(event) => onSelectionChange(event.target.checked ? [...selectedIds, getRowId(row)] : selectedIds.filter((id) => id !== getRowId(row)))} /></td>
            {columns.map((column) => <td key={column.key} className="px-5 py-5">{column.render(row)}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-secondary">
      <p>{selectedCount} data dipilih pada halaman ini</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><span>Data per halaman</span><Select aria-label="Data per halaman" value={String(meta?.limit ?? 20)} disabled={disabled} onValueChange={(value) => onPageSizeChange(Number(value))} className="w-24" options={[10, 20, 50, 100].map((limit) => ({ value: String(limit), label: String(limit) }))} /></div>
        <span>Halaman {meta?.page ?? 1} dari {Math.max(meta?.totalPages ?? 0, 1)}</span>
        <button type="button" aria-label="Halaman sebelumnya" disabled={disabled || !meta || meta.page <= 1} onClick={() => meta && onPageChange(meta.page - 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Halaman selanjutnya" disabled={disabled || !meta || meta.page >= meta.totalPages} onClick={() => meta && onPageChange(meta.page + 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  </div>;
}
