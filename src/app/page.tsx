'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import {
  getMonthData,
  deleteTransaction,
  saveMonthStartingBalance,
  type MonthData,
  type TransactionWithCategory,
} from '@/services/budget';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { TransactionListSection } from '@/components/dashboard/TransactionListSection';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { CategoryDistributionChart } from '@/components/dashboard/charts/CategoryDistributionChart';
import { MonthlyComparisonChart } from '@/components/dashboard/charts/MonthlyComparisonChart';
import { InvoiceAlertCard } from '@/components/dashboard/InvoiceAlertCard';
import { CategoryManagerModal } from '@/components/categories/CategoryManagerModal';
import { SlidersHorizontal, RefreshCw, Tag } from 'lucide-react';

export default function DashboardPage() {
  const { year, month, formattedMonth } = useMonth();
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingStartingBalance, setIsEditingStartingBalance] = useState(false);
  const [tempStartingBalance, setTempStartingBalance] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const monthData = await getMonthData(year, month);
      setData(monthData);
    } catch (err) {
      console.error('Falha ao carregar orçamento:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Atualiza automaticamente quando um lançamento ou categoria é adicionado/atualizado
  useEffect(() => {
    const handleDataChanged = () => {
      loadData(false);
    };

    window.addEventListener('finance:transaction-created', handleDataChanged);
    window.addEventListener('finances-data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('finance:transaction-created', handleDataChanged);
      window.removeEventListener('finances-data-changed', handleDataChanged);
    };
  }, [loadData]);

  const handleDelete = async (
    tx: TransactionWithCategory,
    deleteMode: 'SINGLE' | 'FUTURE' | 'ALL' = 'SINGLE'
  ) => {
    const ok = await deleteTransaction(
      tx.id,
      tx.installment_group_id,
      tx.installment_number,
      deleteMode
    );
    if (ok) {
      loadData(false);
    }
  };

  const handleOpenAddModal = (presetType?: string) => {
    window.dispatchEvent(
      new CustomEvent('finance:open-add-modal', {
        detail: { type: presetType || 'EXPENSE' },
      })
    );
  };

  const handleSaveStartingBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempStartingBalance.replace(',', '.'));
    if (isNaN(val)) return;

    await saveMonthStartingBalance(year, month, val);
    setIsEditingStartingBalance(false);
    loadData(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Visão Geral Orçamentária
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Balanço e fluxo de caixa de <strong className="text-zinc-700 dark:text-zinc-300">{formattedMonth}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Gerenciar Categorias */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Tag className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Categorias</span>
          </button>

          {/* Ajustar Saldo Inicial */}
          <button
            onClick={() => {
              setTempStartingBalance(
                data?.summary.startingBalance.toString() || '0'
              );
              setIsEditingStartingBalance(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Ajustar Saldo Inicial</span>
            <span className="sm:hidden">Saldo Inicial</span>
          </button>

          {/* Recarregar */}
          <button
            onClick={() => loadData(false)}
            title="Recarregar dados"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Starting Balance Modal */}
      {isEditingStartingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Ajustar Sobra do Mês Passado
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Defina manualmente o saldo que transitou para {formattedMonth}.
            </p>

            <form onSubmit={handleSaveStartingBalance} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Saldo Inicial (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tempStartingBalance}
                  onChange={(e) => setTempStartingBalance(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingStartingBalance(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerta de Faturas Próximas ou Vencidas */}
      <InvoiceAlertCard />

      {/* Main Content: Skeletons or Summary & Blocks */}
      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 1. 4 Summary Cards */}
          <SummaryCards summary={data.summary} />

          {/* 2. Seção Intermediária: Gráficos Analíticos com Recharts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Gráfico de Rosca de Categorias */}
            <CategoryDistributionChart
              fixedExpenses={data.transactions.fixedExpenses}
              variableExpenses={data.transactions.variableExpenses}
            />

            {/* Gráfico de Comparativo Semestral */}
            <MonthlyComparisonChart
              year={year}
              month={month}
            />
          </div>

          {/* 3. Seções / Blocos da Planilha Financeira */}
          <TransactionListSection
            fixedExpenses={data.transactions.fixedExpenses}
            variableExpenses={data.transactions.variableExpenses}
            salary={data.transactions.salary}
            extraIncome={data.transactions.extraIncome}
            investmentsOutflow={data.transactions.investmentsOutflow}
            categories={data.categories}
            year={year}
            month={month}
            onDeleteTransaction={handleDelete}
            onOpenAddModal={handleOpenAddModal}
          />
        </>
      )}

      {/* Modal de Gestão de Categorias */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={() => loadData(false)}
      />
    </div>
  );
}
