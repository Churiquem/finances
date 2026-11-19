'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { TransactionWithCategory } from '@/services/budget';
import { getCategories, sortTransactionsDesc } from '@/services/budget';
import type { Category } from '@/types/database';
import { TransactionRow } from './TransactionRow';
import {
  Layers,
  CreditCard,
  TrendingUp,
  PlusCircle,
  PieChart,
  AlertTriangle,
  X,
} from 'lucide-react';

interface TransactionListSectionProps {
  fixedExpenses: TransactionWithCategory[];
  variableExpenses: TransactionWithCategory[];
  salary: TransactionWithCategory[];
  extraIncome: TransactionWithCategory[];
  investmentsOutflow: TransactionWithCategory[];
  categories?: Category[];
  year?: number;
  month?: number;
  onDeleteTransaction?: (
    tx: TransactionWithCategory,
    deleteMode?: 'SINGLE' | 'FUTURE' | 'ALL'
  ) => void;
  onOpenAddModal?: (presetType?: string) => void;
}

export function TransactionListSection({
  fixedExpenses,
  variableExpenses,
  salary,
  extraIncome,
  investmentsOutflow,
  categories,
  year,
  month,
  onDeleteTransaction,
  onOpenAddModal,
}: TransactionListSectionProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FIXED' | 'VARIABLE' | 'INCOME' | 'INVESTMENT'>('ALL');
  const [installmentToDelete, setInstallmentToDelete] = useState<TransactionWithCategory | null>(null);
  const [deleteMode, setDeleteMode] = useState<'SINGLE' | 'FUTURE' | 'ALL'>('SINGLE');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories || []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories(categories);
    } else {
      getCategories().then((cats) => setAvailableCategories(cats));
    }
  }, [categories]);

  useEffect(() => {
    const handleCats = () => {
      getCategories().then((cats) => setAvailableCategories(cats));
    };
    window.addEventListener('finances-categories-changed', handleCats);
    return () => {
      window.removeEventListener('finances-categories-changed', handleCats);
    };
  }, []);

  const currentYearMonth = year && month ? `${year}-${String(month).padStart(2, '0')}` : undefined;

  const sortedFixedExpenses = useMemo(() => sortTransactionsDesc(fixedExpenses || [], currentYearMonth), [fixedExpenses, currentYearMonth]);
  const sortedVariableExpenses = useMemo(() => sortTransactionsDesc(variableExpenses || [], currentYearMonth), [variableExpenses, currentYearMonth]);
  const sortedSalary = useMemo(() => sortTransactionsDesc(salary || [], currentYearMonth), [salary, currentYearMonth]);
  const sortedExtraIncome = useMemo(() => sortTransactionsDesc(extraIncome || [], currentYearMonth), [extraIncome, currentYearMonth]);
  const sortedInvestmentsOutflow = useMemo(() => sortTransactionsDesc(investmentsOutflow || [], currentYearMonth), [investmentsOutflow, currentYearMonth]);
  const sortedAllIncome = useMemo(
    () => sortTransactionsDesc([...(salary || []), ...(extraIncome || [])], currentYearMonth),
    [salary, extraIncome, currentYearMonth]
  );

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

  const sumTotal = (list: TransactionWithCategory[]) =>
    list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalIncome = sumTotal(sortedAllIncome);
  const totalFixed = sumTotal(sortedFixedExpenses);
  const totalVariable = sumTotal(sortedVariableExpenses);
  const totalInvestments = sumTotal(sortedInvestmentsOutflow);

  const handleDeleteClick = (tx: TransactionWithCategory) => {
    if (tx.installment_group_id && tx.total_installments && tx.total_installments > 1) {
      setInstallmentToDelete(tx);
      setDeleteMode('SINGLE');
    } else {
      if (confirm(`Deseja excluir "${tx.description}"?`)) {
        onDeleteTransaction?.(tx, 'SINGLE');
      }
    }
  };

  const handleConfirmInstallmentDelete = () => {
    if (!installmentToDelete) return;
    onDeleteTransaction?.(installmentToDelete, deleteMode);
    setInstallmentToDelete(null);
  };

  return (
    <div id="lancamentos" className="space-y-4">
      {/* Modal de Confirmação de Exclusão de Parcelamento */}
      {installmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Excluir Lançamento Parcelado
                </h3>
              </div>
              <button
                onClick={() => setInstallmentToDelete(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                "{installmentToDelete.description}" é uma compra parcelada (parcela{' '}
                {installmentToDelete.installment_number} de{' '}
                {installmentToDelete.total_installments}).
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Como você deseja aplicar a exclusão?
              </p>

              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-2.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="SINGLE"
                    checked={deleteMode === 'SINGLE'}
                    onChange={() => setDeleteMode('SINGLE')}
                    className="text-emerald-600"
                  />
                  <span>Apenas esta parcela ({installmentToDelete.installment_number}/{installmentToDelete.total_installments})</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-2.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="FUTURE"
                    checked={deleteMode === 'FUTURE'}
                    onChange={() => setDeleteMode('FUTURE')}
                    className="text-emerald-600"
                  />
                  <span>Esta e todas as parcelas futuras</span>
                </label>

                <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-2.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="ALL"
                    checked={deleteMode === 'ALL'}
                    onChange={() => setDeleteMode('ALL')}
                    className="text-emerald-600"
                  />
                  <span>Todas as parcelas deste grupo</span>
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setInstallmentToDelete(null)}
                className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInstallmentDelete}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-500"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Filter Header */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Todos os Blocos
          </button>
          <button
            onClick={() => setActiveTab('FIXED')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'FIXED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Mensalidades Fixas ({sortedFixedExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('VARIABLE')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'VARIABLE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Despesas Variáveis ({sortedVariableExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('INCOME')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'INCOME'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Ganhos / Entradas ({sortedAllIncome.length})
          </button>
          {sortedInvestmentsOutflow.length > 0 && (
            <button
              onClick={() => setActiveTab('INVESTMENT')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'INVESTMENT'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Aportes ({sortedInvestmentsOutflow.length})
            </button>
          )}
        </div>
      </div>

      {/* Grid of Blocks (Spreadsheet visual structure) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* BLOCO 1: MENSALIDADES FIXAS */}
        {(activeTab === 'ALL' || activeTab === 'FIXED') && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Mensalidades Fixas
                  </h3>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Contas recorrentes e compromissos
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {formatBRL(totalFixed)}
                </span>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                  {sortedFixedExpenses.length} lançamentos
                </span>
              </div>
            </div>

            <div className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {sortedFixedExpenses.length === 0 ? (
                <EmptyState
                  text="Nenhuma mensalidade fixa cadastrada neste mês."
                  onAdd={() => onOpenAddModal?.('FIXED_EXPENSE')}
                />
              ) : (
                sortedFixedExpenses.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    formatBRL={formatBRL}
                    formatDate={formatDate}
                    editingTransactionId={editingTransactionId}
                    setEditingTransactionId={setEditingTransactionId}
                    categories={availableCategories}
                    onDelete={() => handleDeleteClick(tx)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-zinc-100 p-2.5 bg-zinc-50/40 dark:border-zinc-800/80 dark:bg-zinc-900/30">
              <button
                onClick={() => onOpenAddModal?.('FIXED_EXPENSE')}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar Mensalidade Fixa
              </button>
            </div>
          </div>
        )}

        {/* BLOCO 2: DESPESAS VARIÁVEIS */}
        {(activeTab === 'ALL' || activeTab === 'VARIABLE') && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Despesas Variáveis
                  </h3>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Alimentação, transporte, lazer e mercado
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {formatBRL(totalVariable)}
                </span>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                  {sortedVariableExpenses.length} lançamentos
                </span>
              </div>
            </div>

            <div className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {sortedVariableExpenses.length === 0 ? (
                <EmptyState
                  text="Nenhuma despesa variável cadastrada neste mês."
                  onAdd={() => onOpenAddModal?.('EXPENSE')}
                />
              ) : (
                sortedVariableExpenses.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    formatBRL={formatBRL}
                    formatDate={formatDate}
                    editingTransactionId={editingTransactionId}
                    setEditingTransactionId={setEditingTransactionId}
                    categories={availableCategories}
                    onDelete={() => handleDeleteClick(tx)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-zinc-100 p-2.5 bg-zinc-50/40 dark:border-zinc-800/80 dark:bg-zinc-900/30">
              <button
                onClick={() => onOpenAddModal?.('EXPENSE')}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 hover:border-amber-500 hover:text-amber-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-amber-400 dark:hover:text-amber-300 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar Despesa Variável
              </button>
            </div>
          </div>
        )}

        {/* BLOCO 3: GANHOS / ENTRADAS EXTRAS */}
        {(activeTab === 'ALL' || activeTab === 'INCOME') && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Ganhos & Entradas Extras
                  </h3>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Salário, freelances e outros rendimentos
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(totalIncome)}
                </span>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                  {sortedAllIncome.length} entradas
                </span>
              </div>
            </div>

            <div className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {sortedAllIncome.length === 0 ? (
                <EmptyState
                  text="Nenhuma receita lançada neste mês."
                  onAdd={() => onOpenAddModal?.('SALARY')}
                />
              ) : (
                sortedAllIncome.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    formatBRL={formatBRL}
                    formatDate={formatDate}
                    editingTransactionId={editingTransactionId}
                    setEditingTransactionId={setEditingTransactionId}
                    categories={availableCategories}
                    onDelete={() => handleDeleteClick(tx)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-zinc-100 p-2.5 bg-zinc-50/40 dark:border-zinc-800/80 dark:bg-zinc-900/30">
              <button
                onClick={() => onOpenAddModal?.('EXTRA_INCOME')}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-2 text-xs font-medium text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar Ganho / Extra
              </button>
            </div>
          </div>
        )}

        {/* BLOCO 4: APORTES DE INVESTIMENTO */}
        {(activeTab === 'ALL' || activeTab === 'INVESTMENT') && sortedInvestmentsOutflow.length > 0 && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
                  <PieChart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Aportes de Investimento
                  </h3>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Saídas direcionadas à formação de patrimônio
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  {formatBRL(totalInvestments)}
                </span>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
                  {sortedInvestmentsOutflow.length} aportes
                </span>
              </div>
            </div>

            <div className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {sortedInvestmentsOutflow.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  formatBRL={formatBRL}
                  formatDate={formatDate}
                  editingTransactionId={editingTransactionId}
                  setEditingTransactionId={setEditingTransactionId}
                  categories={availableCategories}
                  onDelete={() => handleDeleteClick(tx)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text, onAdd }: { text: string; onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{text}</p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
        >
          Cadastrar primeiro lançamento
        </button>
      )}
    </div>
  );
}
