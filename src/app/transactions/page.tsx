'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import {
  getMonthData,
  deleteTransaction,
  sortTransactionsDesc,
  type MonthData,
  type TransactionWithCategory,
} from '@/services/budget';
import { TransactionRow } from '@/components/dashboard/TransactionRow';
import { ImportReviewModal } from '@/components/importer/ImportReviewModal';
import {
  ReceiptText,
  Search,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';

export default function TransactionsPage() {
  const { year, month, formattedMonth } = useMonth();
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMonthData(year, month);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();

    const handleDataChange = () => loadData();
    window.addEventListener('finances-data-changed', handleDataChange);
    window.addEventListener('finance:transaction-created', handleDataChange);
    return () => {
      window.removeEventListener('finances-data-changed', handleDataChange);
      window.removeEventListener('finance:transaction-created', handleDataChange);
    };
  }, [loadData]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const currentYearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const allTransactions = sortTransactionsDesc(data?.transactions.all || [], currentYearMonth);

  const filtered = sortTransactionsDesc(
    allTransactions.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.category?.name.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === 'ALL' || tx.type === typeFilter;

      return matchesSearch && matchesType;
    }),
    currentYearMonth
  );

  const handleDelete = async (tx: TransactionWithCategory) => {
    if (tx.installment_group_id && tx.total_installments && tx.total_installments > 1) {
      const deleteAll = confirm(
        `"${tx.description}" é uma compra parcelada (${tx.installment_number}/${tx.total_installments}).\n\nClique em OK para excluir TODAS as parcelas deste grupo, ou Cancelar para excluir apenas esta parcela.`
      );
      if (deleteAll) {
        await deleteTransaction(tx.id, tx.installment_group_id, tx.installment_number, 'ALL');
      } else {
        await deleteTransaction(tx.id, tx.installment_group_id, tx.installment_number, 'SINGLE');
      }
    } else {
      if (!confirm(`Deseja excluir "${tx.description}"?`)) return;
      await deleteTransaction(tx.id);
    }
    loadData();
  };

  const handleOpenAddModal = () => {
    window.dispatchEvent(
      new CustomEvent('finance:open-add-modal', {
        detail: { type: 'EXPENSE' },
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Lançamentos do Mês
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Todas as transações registradas em <strong className="text-zinc-700 dark:text-zinc-300">{formattedMonth}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4 text-emerald-500" />
            Importar Extrato
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </button>
          <button
            onClick={loadData}
            title="Recarregar"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { label: 'Todos', value: 'ALL' },
            { label: 'Fixas', value: 'FIXED_EXPENSE' },
            { label: 'Variáveis', value: 'EXPENSE' },
            { label: 'Salário', value: 'SALARY' },
            { label: 'Extras', value: 'EXTRA_INCOME' },
            { label: 'Entradas', value: 'INCOME' },
            { label: 'Investimentos', value: 'INVESTMENT_OUTFLOW' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === t.value
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table/List */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">
            Carregando movimentações...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <ReceiptText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhuma movimentação encontrada
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Altere os filtros ou adicione um novo lançamento para {formattedMonth}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                formatBRL={formatBRL}
                formatDate={formatDate}
                editingTransactionId={editingTransactionId}
                setEditingTransactionId={setEditingTransactionId}
                categories={data?.categories || []}
                onDelete={() => handleDelete(tx)}
                onUpdated={loadData}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Importação de Extratos e Faturas */}
      <ImportReviewModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={loadData}
      />
    </div>
  );
}
