'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import {
  getCardsSummary,
  markInvoiceAsPaid,
  reopenInvoice,
  deleteCreditCard,
  updateInvoiceDueDate,
  getInvoiceDueDate,
  type CardsSummary,
  type CardInvoiceDetails,
} from '@/services/cards';
import { getCategories } from '@/services/budget';
import type { Category, CreditCard } from '@/types/database';
import { CardModal } from '@/components/cards/AddCardModal';
import { EditInvoiceDueDateModal } from '@/components/cards/EditInvoiceDueDateModal';
import { format } from 'date-fns';
import {
  CreditCard as CreditCardIcon,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Calendar,
  ShieldCheck,
  Trash2,
  Receipt,
  RotateCcw,
  Pencil,
} from 'lucide-react';

export default function CardsPage() {
  const { year, month, formattedMonth } = useMonth();
  const [summary, setSummary] = useState<CardsSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [processingCardId, setProcessingCardId] = useState<string | null>(null);
  const [isDueDateModalOpen, setIsDueDateModalOpen] = useState(false);
  const [editingDueDateInvoice, setEditingDueDateInvoice] = useState<CardInvoiceDetails | null>(null);

  const handleOpenAddCard = () => {
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const loadData = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      const [sum, cats] = await Promise.all([
        getCardsSummary(year, month),
        getCategories(),
      ]);
      setSummary(sum);
      setCategories(cats);

      if (sum.invoices.length > 0 && !selectedCardId) {
        setSelectedCardId(sum.invoices[0].card.id);
      } else if (sum.invoices.length > 0 && selectedCardId) {
        // Verifica se o selecionado ainda existe
        if (!sum.invoices.some((i) => i.card.id === selectedCardId)) {
          setSelectedCardId(sum.invoices[0].card.id);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar dados de cartões:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedCardId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    const handleDataChange = () => loadData(false);
    window.addEventListener('finances-invoices-changed', handleDataChange);
    window.addEventListener('finances-cards-changed', handleDataChange);
    window.addEventListener('finances-data-changed', handleDataChange);
    window.addEventListener('finance:transaction-created', handleDataChange);

    return () => {
      window.removeEventListener('finances-invoices-changed', handleDataChange);
      window.removeEventListener('finances-cards-changed', handleDataChange);
      window.removeEventListener('finances-data-changed', handleDataChange);
      window.removeEventListener('finance:transaction-created', handleDataChange);
    };
  }, [loadData]);

  const handleToggleInvoicePaid = async (cardId: string, currentStatus: string) => {
    setProcessingCardId(cardId);
    try {
      if (currentStatus === 'PAID') {
        await reopenInvoice(cardId, year, month);
      } else {
        await markInvoiceAsPaid(cardId, year, month);
      }
      await loadData(false);
    } catch (err) {
      console.error('Erro ao atualizar status da fatura:', err);
      alert('Não foi possível alterar o status da fatura.');
    } finally {
      setProcessingCardId(null);
    }
  };

  const handleDeleteCard = async (card: CreditCard) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o cartão "${card.name}"? Esta ação é irreversível.`
      )
    ) {
      return;
    }

    const res = await deleteCreditCard(card.id);
    if (!res.success) {
      alert(res.error || 'Não foi possível excluir o cartão.');
      return;
    }

    setSelectedCardId(null);
    await loadData(false);
  };

  const handleOpenEditDueDate = (invoiceDetails: CardInvoiceDetails) => {
    setEditingDueDateInvoice(invoiceDetails);
    setIsDueDateModalOpen(true);
  };

  const handleSaveDueDate = async (newDueDate: string, isPostponed: boolean) => {
    if (!editingDueDateInvoice) return;
    try {
      await updateInvoiceDueDate(
        editingDueDateInvoice.card.id,
        year,
        month,
        newDueDate,
        isPostponed
      );
      await loadData(false);
    } catch (err) {
      console.error('Erro ao atualizar vencimento:', err);
      alert('Não foi possível salvar o novo vencimento.');
    }
  };

  const handleResetDueDate = async () => {
    if (!editingDueDateInvoice) return;
    try {
      await updateInvoiceDueDate(
        editingDueDateInvoice.card.id,
        year,
        month,
        null,
        false
      );
      await loadData(false);
    } catch (err) {
      console.error('Erro ao restaurar vencimento:', err);
      alert('Não foi possível restaurar o vencimento padrão.');
    }
  };

  const selectedInvoice: CardInvoiceDetails | undefined = summary?.invoices.find(
    (i) => i.card.id === selectedCardId
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Cartões de Crédito & Faturas
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Gestão consolidada de limites, datas de corte e compras de{' '}
            <strong className="text-zinc-700 dark:text-zinc-300">{formattedMonth}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddCard}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs shadow-purple-600/30 hover:bg-purple-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Novo Cartão</span>
          </button>

          <button
            onClick={() => loadData(false)}
            title="Recarregar dados"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Consolidado de Faturas */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Faturas do Mês ({formattedMonth})
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatBRL(summary.totalInvoices)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Soma total de compras em {summary.invoices.length} cartão(ões)
            </p>
          </div>

          {/* Total Pago no Mês */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Total Faturas Pagas
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatBRL(summary.totalPaid)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {summary.totalOpen > 0
                ? `Resta pagar ${formatBRL(summary.totalOpen)} em faturas abertas`
                : 'Todas as faturas do mês estão quitadas!'}
            </p>
          </div>

          {/* Limite Total Disponível */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Limite Total Disponível
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {formatBRL(summary.totalAvailableLimit)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Limite global de {formatBRL(summary.totalLimit)}
            </p>
          </div>
        </div>
      )}

      {/* Lista Visual dos Cartões de Crédito */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4 text-purple-400" />
            Meus Cartões de Crédito
          </h2>
          <span className="text-xs text-zinc-500">
            Clique em um cartão para inspecionar os lançamentos
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-3xl border border-zinc-800 bg-zinc-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : !summary || summary.invoices.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-3">
              <CreditCardIcon className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-200">Nenhum cartão cadastrado</h3>
            <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
              Cadastre seus cartões de crédito para acompanhar faturas, controlar limites e
              organizar suas compras parceladas automaticamente.
            </p>
            <button
              onClick={handleOpenAddCard}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Cadastrar Primeiro Cartão
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.invoices.map((invDetail) => {
              const { card, totalAmount, availableLimit, status, dueDateStr } =
                invDetail;
              const isSelected = card.id === selectedCardId;
              const usedPct =
                card.limit_amount > 0
                  ? Math.min(100, Math.round(((card.limit_amount - availableLimit) / card.limit_amount) * 100))
                  : 0;

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`relative cursor-pointer rounded-3xl p-5 transition-all select-none border ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10 bg-zinc-900'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Top Bar do Cartão */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full shadow-xs ring-2 ring-white/20"
                        style={{ backgroundColor: card.color_hex }}
                      />
                      <h3 className="text-sm font-bold text-zinc-100">{card.name}</h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : invDetail.invoice?.is_postponed
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : status === 'OVERDUE'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {status === 'PAID'
                          ? 'Paga'
                          : invDetail.invoice?.is_postponed
                          ? 'Postergada'
                          : status === 'OVERDUE'
                          ? 'Atrasada'
                          : 'Aberta'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCard(card);
                        }}
                        title="Editar Cartão"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fatura do Mês */}
                  <div className="mt-4">
                    <span className="text-[11px] font-medium text-zinc-400">
                      Fatura de {formattedMonth}
                    </span>
                    <div className="text-2xl font-bold tracking-tight text-zinc-100">
                      {formatBRL(totalAmount)}
                    </div>
                  </div>

                  {/* Barra de Limite */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Limite Utilizado ({usedPct}%)</span>
                      <span>Disponível: {formatBRL(availableLimit)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${usedPct}%`,
                          backgroundColor:
                            usedPct > 85 ? '#EF4444' : usedPct > 60 ? '#F59E0B' : card.color_hex,
                        }}
                      />
                    </div>
                  </div>

                  {/* Datas de Fechamento e Vencimento */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-500" />
                      <span>Fecha: dia {card.closing_day}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <span>
                        {invDetail.invoice?.due_date ? `Vence: ${dueDateStr}` : `Vence: dia ${card.due_day}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalhamento de Faturas por Cartão */}
      {selectedInvoice && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-xs"
                style={{ backgroundColor: selectedInvoice.card.color_hex }}
              >
                <CreditCardIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-100">
                    Fatura {selectedInvoice.card.name}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      selectedInvoice.status === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedInvoice.invoice?.is_postponed
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : selectedInvoice.status === 'OVERDUE'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {selectedInvoice.status === 'PAID'
                      ? 'Fatura Paga'
                      : selectedInvoice.invoice?.is_postponed
                      ? 'Fatura Postergada'
                      : selectedInvoice.status === 'OVERDUE'
                      ? 'Fatura Atrasada'
                      : 'Fatura Aberta'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                  <span>Fechamento em {selectedInvoice.closingDateStr}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>Vencimento em</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDueDate(selectedInvoice)}
                      className="inline-flex items-center gap-1 font-semibold text-zinc-200 underline decoration-dotted underline-offset-4 hover:text-purple-400 transition-colors cursor-pointer"
                      title="Clique para editar o vencimento desta fatura"
                    >
                      <span>{selectedInvoice.dueDateStr}</span>
                      <Pencil className="h-3 w-3 text-zinc-400" />
                    </button>
                  </span>
                  {selectedInvoice.invoice?.due_date && (
                    <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-300 border border-purple-500/20">
                      Data ajustada
                    </span>
                  )}
                  {selectedInvoice.invoice?.is_postponed && (
                    <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                      Postergada
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleOpenEditDueDate(selectedInvoice)}
                title="Editar Vencimento desta Fatura"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:border-purple-500/40 hover:bg-zinc-800 hover:text-purple-300 transition-colors cursor-pointer shadow-xs"
              >
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                <span>Editar Vencimento</span>
              </button>

              <button
                onClick={() =>
                  handleToggleInvoicePaid(selectedInvoice.card.id, selectedInvoice.status)
                }
                disabled={processingCardId === selectedInvoice.card.id}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                  selectedInvoice.status === 'PAID'
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {selectedInvoice.status === 'PAID' ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Reabrir Fatura</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {processingCardId === selectedInvoice.card.id
                        ? 'Processando...'
                        : 'Marcar Fatura como Paga'}
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleEditCard(selectedInvoice.card)}
                title="Editar Cartão"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-400 transition-colors cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleDeleteCard(selectedInvoice.card)}
                title="Excluir Cartão"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabela de Lançamentos da Fatura */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Itens e Compras da Fatura ({selectedInvoice.transactions.length})
              </h4>
              <span className="text-xs font-semibold text-zinc-200">
                Subtotal:{' '}
                <span className="text-emerald-400">
                  {formatBRL(selectedInvoice.totalAmount)}
                </span>
              </span>
            </div>

            {selectedInvoice.transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800/80 p-8 text-center">
                <p className="text-xs text-zinc-400">
                  Nenhuma compra lançada neste cartão em {formattedMonth}.
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Ao cadastrar uma nova despesa ou parcelamento, selecione &quot;Cartão de Crédito&quot; e
                  este cartão para que apareça aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-zinc-500">
                      <th className="pb-3 font-medium">Descrição</th>
                      <th className="pb-3 font-medium">Categoria</th>
                      <th className="pb-3 font-medium">Data da Compra</th>
                      <th className="pb-3 font-medium">Parcela</th>
                      <th className="pb-3 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                    {selectedInvoice.transactions.map((tx) => {
                      const cat = categories.find((c) => c.id === tx.category_id);
                      const displayDate = (tx.purchase_date || tx.date).split('-').reverse().join('/');

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3 font-medium text-zinc-100 flex items-center gap-2">
                            <span>{tx.description}</span>
                          </td>
                          <td className="py-3">
                            {cat ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: `${cat.color_hex}15`,
                                  color: cat.color_hex,
                                  border: `1px solid ${cat.color_hex}30`,
                                }}
                              >
                                {cat.name}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[10px]">Sem categoria</span>
                            )}
                          </td>
                          <td className="py-3 text-zinc-400">
                            {displayDate}
                          </td>
                          <td className="py-3 text-zinc-400">
                            {tx.total_installments && tx.total_installments > 1 ? (
                              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                                {tx.installment_number}/{tx.total_installments}
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-[10px]">À vista</span>
                            )}
                          </td>
                          <td className="py-3 text-right font-bold text-zinc-100">
                            {formatBRL(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição de Cartão */}
      <CardModal
        isOpen={isCardModalOpen}
        editingCard={editingCard}
        onClose={() => {
          setIsCardModalOpen(false);
          setEditingCard(null);
        }}
        onCardSaved={async (savedCard) => {
          setSelectedCardId(savedCard.id);
          await loadData(false);
        }}
      />

      {/* Modal de Edição de Vencimento / Postergamento da Fatura */}
      {editingDueDateInvoice && (
        <EditInvoiceDueDateModal
          isOpen={isDueDateModalOpen}
          onClose={() => {
            setIsDueDateModalOpen(false);
            setEditingDueDateInvoice(null);
          }}
          card={editingDueDateInvoice.card}
          invoice={editingDueDateInvoice.invoice}
          year={year}
          month={month}
          defaultDueDateStr={format(getInvoiceDueDate(editingDueDateInvoice.card, year, month), 'dd/MM/yyyy')}
          currentDueDateStr={editingDueDateInvoice.dueDateStr}
          onSaveDueDate={handleSaveDueDate}
          onResetToDefault={handleResetDueDate}
        />
      )}
    </div>
  );
}
