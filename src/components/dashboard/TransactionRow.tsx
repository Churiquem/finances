'use client';

import React from 'react';
import type { TransactionWithCategory } from '@/services/budget';
import type { Category } from '@/types/database';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { getCategoryIcon } from '@/lib/icons';
import { InlineTransactionEditor } from './InlineTransactionEditor';

export interface TransactionRowProps {
  tx: TransactionWithCategory;
  formatBRL: (v: number) => string;
  formatDate: (d: string) => string;
  editingTransactionId: string | null;
  setEditingTransactionId: React.Dispatch<React.SetStateAction<string | null>>;
  categories?: Category[];
  onDelete?: () => void;
  onUpdated?: () => void;
}

export function TransactionRow({
  tx,
  formatBRL,
  formatDate,
  editingTransactionId,
  setEditingTransactionId,
  categories,
  onDelete,
  onUpdated,
}: TransactionRowProps) {
  const isIncome =
    tx.type === 'SALARY' || tx.type === 'EXTRA_INCOME' || tx.type === 'INCOME';
  const isEditing = editingTransactionId === tx.id;
  const CategoryIcon = getCategoryIcon(tx.category?.icon);

  const handleToggleEdit = () => {
    setEditingTransactionId((prev) => (prev === tx.id ? null : tx.id));
  };

  return (
    <div
      className={`transition-all ${
        isEditing
          ? 'bg-zinc-100/60 dark:bg-zinc-800/50 ring-1 ring-emerald-500/30 rounded-xl my-1 overflow-hidden'
          : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
      }`}
    >
      {/* Linha principal clicável */}
      <div
        onClick={handleToggleEdit}
        className="group flex items-center justify-between px-4 py-3 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Category color pill or icon */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs shadow-xs"
            style={{ backgroundColor: tx.category?.color_hex || '#64748B' }}
          >
            <CategoryIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {tx.description}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="inline-flex items-center rounded-sm px-1.5 py-0.2 text-[10px] font-semibold text-white truncate max-w-[120px]"
                style={{ backgroundColor: tx.category?.color_hex || '#64748B' }}
              >
                {tx.category?.name || 'Geral'}
              </span>

              <span className="flex items-center gap-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                <Calendar className="h-3 w-3" />
                {formatDate(tx.purchase_date || tx.date)}
              </span>

              {tx.total_installments && tx.installment_number && (
                <span className="rounded bg-zinc-100 px-1 py-0.2 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {tx.installment_number}/{tx.total_installments}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-3">
          <span
            className={`text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {isIncome ? '+' : '-'} {formatBRL(Number(tx.amount))}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleEdit();
            }}
            title="Editar lançamento"
            className={`p-1 transition-all cursor-pointer ${
              isEditing
                ? 'opacity-100 text-emerald-500'
                : 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-emerald-500'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Excluir lançamento"
              className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Gaveta expansível de edição inline */}
      {isEditing && (
        <InlineTransactionEditor
          transaction={tx}
          categories={categories}
          onCancel={() => setEditingTransactionId(null)}
          onSaved={() => {
            setEditingTransactionId(null);
            onUpdated?.();
          }}
        />
      )}
    </div>
  );
}
