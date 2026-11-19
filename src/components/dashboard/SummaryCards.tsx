'use client';

import React from 'react';
import type { MonthBudgetSummary } from '@/services/budget';
import { Wallet, TrendingDown, CreditCard, PiggyBank } from 'lucide-react';

interface SummaryCardsProps {
  summary: MonthBudgetSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const isPositiveRealBalance = summary.realAccountBalance >= 0;
  const isPositiveProjected = summary.projectedFreeBalance >= 0;

  const renderInvoiceBadge = (status: MonthBudgetSummary['monthInvoiceStatus']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
            PAGA
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-600/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-400/20 dark:text-rose-300">
            VENCIDA
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
            ABERTA
          </span>
        );
      case 'NO_INVOICE':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            SEM FATURA
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Saldo em Conta Real (Fluxo de Caixa) */}
      <div
        className={`group relative overflow-hidden rounded-2xl border p-4.5 shadow-xs transition-all hover:shadow-md ${
          isPositiveRealBalance
            ? 'border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-950/20'
            : 'border-rose-500/30 bg-rose-500/5 dark:border-rose-500/30 dark:bg-rose-950/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Saldo em Conta Real
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isPositiveRealBalance
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <Wallet className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span
            className={`text-2xl font-black tracking-tight ${
              isPositiveRealBalance
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatBRL(summary.realAccountBalance)}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              isPositiveRealBalance
                ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300'
                : 'bg-rose-600/10 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300'
            }`}
          >
            {isPositiveRealBalance ? 'POSITIVO' : 'DÉFICIT'}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Inicial: {formatBRL(summary.startingBalance)}</span>
          <span>Caixa: -{formatBRL(summary.totalCashOutflow)}</span>
        </div>
      </div>

      {/* 2. Consumo do Mês (Competência Total) */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Consumo do Mês
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <TrendingDown className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatBRL(summary.totalMonthlyConsumption)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Conta: {formatBRL(summary.cashExpenses)}</span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            Cartão: {formatBRL(summary.cardExpenses)}
          </span>
        </div>
      </div>

      {/* 3. Fatura do Mês (Cartão de Crédito) */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Fatura do Mês
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <CreditCard className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatBRL(summary.monthInvoiceTotal)}
          </span>
          {renderInvoiceBadge(summary.monthInvoiceStatus)}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          {summary.monthInvoiceStatus === 'PAID' ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Fatura quitada
            </span>
          ) : summary.monthInvoiceStatus === 'NO_INVOICE' ? (
            <span>Sem lançamentos no cartão</span>
          ) : (
            <>
              <span>Pago: {formatBRL(summary.monthInvoicePaid)}</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Aberto: {formatBRL(Math.max(0, summary.monthInvoiceTotal - summary.monthInvoicePaid))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 4. Projeção de Sobra Livre */}
      <div
        className={`group relative overflow-hidden rounded-2xl border p-4.5 shadow-xs transition-all hover:shadow-md ${
          isPositiveProjected
            ? 'border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-950/20'
            : 'border-rose-500/30 bg-rose-500/5 dark:border-rose-500/30 dark:bg-rose-950/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Projeção Sobra Livre
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isPositiveProjected
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <PiggyBank className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span
            className={`text-2xl font-black tracking-tight ${
              isPositiveProjected
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatBRL(summary.projectedFreeBalance)}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              isPositiveProjected
                ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300'
                : 'bg-rose-600/10 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300'
            }`}
          >
            {isPositiveProjected ? 'MARGEM POSITIVA' : 'ATENÇÃO'}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Margem p/ variáveis</span>
          <span
            className={`font-semibold ${
              isPositiveProjected
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.savingsRatePercentage.toFixed(1)}% sobra
          </span>
        </div>
      </div>
    </div>
  );
}
