'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getReceivables,
  createReceivable,
  deleteReceivable,
  markReceivableAsPaid,
  buildWhatsAppCobranceLink,
  type ReceivableWithAlerts,
} from '@/services/receivables';
import {
  HandCoins,
  Plus,
  MessageCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<ReceivableWithAlerts[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payModalItem, setPayModalItem] = useState<ReceivableWithAlerts | null>(null);
  const [createIncomeOnPay, setCreateIncomeOnPay] = useState(true);

  // Form state for new receivable
  const [debtorName, setDebtorName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReceivables();
      setReceivables(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const totalPending = receivables
    .filter((r) => r.status === 'PENDING')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const totalOverdue = receivables
    .filter((r) => r.status === 'OVERDUE')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const totalPaid = receivables
    .filter((r) => r.status === 'PAID')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const filteredItems = receivables.filter((r) => {
    if (filter === 'PENDING') return r.status === 'PENDING';
    if (filter === 'OVERDUE') return r.status === 'OVERDUE';
    if (filter === 'PAID') return r.status === 'PAID';
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!debtorName.trim() || isNaN(numAmount) || numAmount <= 0 || !dueDate) {
      alert('Preencha os campos obrigatórios com valores válidos.');
      return;
    }

    setFormLoading(true);
    try {
      await createReceivable({
        debtor_name: debtorName.trim(),
        amount: numAmount,
        due_date: dueDate,
        reminder_date: reminderDate || null,
        notes: notes.trim() || null,
        status: 'PENDING',
      });

      // Reset
      setDebtorName('');
      setAmount('');
      setDueDate('');
      setReminderDate('');
      setNotes('');
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!payModalItem) return;
    await markReceivableAsPaid(
      payModalItem.id,
      createIncomeOnPay,
      payModalItem.debtor_name,
      Number(payModalItem.amount)
    );
    setPayModalItem(null);
    loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o empréstimo para "${name}"?`)) return;
    await deleteReceivable(id);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            A Receber & Empréstimos
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Controle de cobranças, datas de vencimento e integração com WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Empréstimo
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

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Pendente */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pendente a Receber
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {formatBRL(totalPending)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {receivables.filter((r) => r.status === 'PENDING').length} pessoas aguardando pagamento
          </p>
        </div>

        {/* Atrasado */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4.5 shadow-xs dark:border-rose-500/30 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Vencidos / Atrasados
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatBRL(totalOverdue)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-300">
            {receivables.filter((r) => r.status === 'OVERDUE').length} cobranças em atraso
          </p>
        </div>

        {/* Recebido */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Já Recebido
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatBRL(totalPaid)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Total quitado no histórico
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setFilter('ALL')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Todos ({receivables.length})
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'PENDING'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Pendentes ({receivables.filter((r) => r.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setFilter('OVERDUE')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'OVERDUE'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Atrasados ({receivables.filter((r) => r.status === 'OVERDUE').length})
        </button>
        <button
          onClick={() => setFilter('PAID')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'PAID'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Pagos ({receivables.filter((r) => r.status === 'PAID').length})
        </button>
      </div>

      {/* Receivables List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800/60" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <HandCoins className="h-10 w-10 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhum empréstimo ou valor a receber encontrado
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              Cadastrar primeiro empréstimo
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const waLink = buildWhatsAppCobranceLink(
              item.debtor_name,
              Number(item.amount),
              item.due_date
            );

            return (
              <div
                key={item.id}
                className={`relative flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-xs transition-all sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900/90 ${
                  item.status === 'OVERDUE'
                    ? 'border-rose-500/40 bg-rose-500/[0.02]'
                    : item.isExpiringSoon
                    ? 'border-amber-500/40'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                      item.status === 'PAID'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : item.status === 'OVERDUE'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <HandCoins className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {item.debtor_name}
                      </h3>

                      {/* Status Badge */}
                      {item.status === 'PAID' && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          PAGO
                        </span>
                      )}
                      {item.status === 'OVERDUE' && (
                        <span className="flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          ATRASADO
                        </span>
                      )}
                      {item.status === 'PENDING' && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          PENDENTE
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>Vencimento: <strong className="text-zinc-700 dark:text-zinc-300">{formatDate(item.due_date)}</strong></span>
                      {item.reminder_date && (
                        <span>Lembrete: {formatDate(item.reminder_date)}</span>
                      )}
                      {item.isExpiringSoon && (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          ⚠️ Vence em {item.daysUntilDue} dias
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="mt-1 text-[11px] text-zinc-400 italic">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <span className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                    {formatBRL(Number(item.amount))}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Botão Cobrar no WhatsApp */}
                    {item.status !== 'PAID' && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 transition-colors"
                        title="Enviar mensagem amigável no WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cobrar no WhatsApp</span>
                        <span className="sm:hidden">WhatsApp</span>
                      </a>
                    )}

                    {/* Botão Dar Baixa */}
                    {item.status !== 'PAID' && (
                      <button
                        onClick={() => setPayModalItem(item)}
                        className="flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                        title="Dar baixa como recebido"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Dar Baixa</span>
                      </button>
                    )}

                    {/* Excluir */}
                    <button
                      onClick={() => handleDelete(item.id, item.debtor_name)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Confirmar Baixa / Recebido */}
      {payModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Confirmar Recebimento
              </h3>
              <button
                onClick={() => setPayModalItem(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Confirmar que você recebeu o valor de{' '}
                <strong className="text-emerald-600 font-bold">
                  {formatBRL(Number(payModalItem.amount))}
                </strong>{' '}
                de <strong>{payModalItem.debtor_name}</strong>?
              </p>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 dark:bg-emerald-950/20">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createIncomeOnPay}
                    onChange={(e) => setCreateIncomeOnPay(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Lançar automaticamente como Renda Extra
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Cria uma transação no mês atual para somar ao seu saldo e orçamento disponível.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => setPayModalItem(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPay}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Empréstimo / A Receber */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Cadastrar Valor a Receber
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Nome do Devedor / Pessoa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pedro Henrique, Mariana..."
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Valor Emprestado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Data Limite (Vencimento)
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Data de Lembrete (Opcional)
                  </label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Empréstimo para compra de remédio, metade da passagem..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {formLoading ? 'Salvando...' : 'Salvar Empréstimo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
