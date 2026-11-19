'use client';

import React, { useState, useEffect, useRef } from 'react';
import type {
  Category,
  TransactionType,
  CreditCard,
  PaymentMethod,
  Transaction,
} from '@/types/database';
import type { TransactionWithCategory } from '@/services/budget';
import { updateTransactionWithScope, getCategories } from '@/services/budget';
import { getCreditCards } from '@/services/cards';
import {
  Check,
  X,
  CreditCard as CreditCardIcon,
  Wallet,
  AlertTriangle,
} from 'lucide-react';

export interface InlineTransactionEditorProps {
  transaction: TransactionWithCategory;
  categories?: Category[];
  onCancel: () => void;
  onSaved?: (updatedTransaction?: Transaction | null) => void;
}

export function InlineTransactionEditor({
  transaction,
  categories,
  onCancel,
  onSaved,
}: InlineTransactionEditorProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);
  const [description, setDescription] = useState(transaction.description || '');
  const [amount, setAmount] = useState(
    transaction.amount !== undefined && transaction.amount !== null
      ? transaction.amount.toString()
      : ''
  );
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    transaction.payment_method || 'CASH'
  );
  const [creditCardId, setCreditCardId] = useState<string>(
    transaction.credit_card_id || ''
  );
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categoryId, setCategoryId] = useState<string>(
    transaction.category_id || ''
  );
  const [date, setDate] = useState<string>(
    transaction.purchase_date || transaction.date
  );
  const [updateMode, setUpdateMode] = useState<'SINGLE' | 'FUTURE'>('SINGLE');
  const [loading, setLoading] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountInputRef.current?.focus();
    amountInputRef.current?.select();
  }, []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
    } else {
      getCategories().then((cats) => {
        if (cats && cats.length > 0) {
          setLocalCategories(cats);
        }
      });
    }

    getCreditCards().then((cards) => {
      setCreditCards(cards);
    });
  }, [categories]);

  useEffect(() => {
    setDescription(transaction.description || '');
    setAmount(
      transaction.amount !== undefined && transaction.amount !== null
        ? transaction.amount.toString()
        : ''
    );
    setType(transaction.type);
    setCategoryId(transaction.category_id || '');
    setDate(transaction.purchase_date || transaction.date);
    setPaymentMethod(transaction.payment_method || 'CASH');
    setCreditCardId(transaction.credit_card_id || '');
    setUpdateMode('SINGLE');
  }, [transaction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const isInstallment =
    Boolean(transaction.installment_group_id) &&
    Boolean(transaction.total_installments && transaction.total_installments > 1);

  const filteredCategories = localCategories.filter((cat) => {
    if (type === 'SALARY' || type === 'EXTRA_INCOME' || type === 'INCOME') {
      return cat.type === 'INCOME';
    }
    if (type === 'FIXED_EXPENSE') {
      return cat.type === 'FIXED_EXPENSE';
    }
    return cat.type === 'EXPENSE';
  });

  const saveChanges = async () => {
    if (loading) return;
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Preencha a descrição e um valor válido maior que zero.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateTransactionWithScope(
        transaction.id,
        {
          description: description.trim(),
          amount: numAmount,
          type,
          category_id: categoryId || null,
          date,
          purchase_date: date,
          payment_method: paymentMethod,
          credit_card_id: paymentMethod === 'CREDIT' ? creditCardId || null : null,
        },
        transaction.installment_group_id,
        transaction.installment_number,
        isInstallment ? updateMode : 'SINGLE'
      );

      onSaved?.(updated);
    } catch (err) {
      console.error('Erro ao atualizar lançamento:', err);
      alert('Não foi possível salvar as alterações do lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveChanges();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault();
        void saveChanges();
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      onClick={(e) => e.stopPropagation()}
      className="border-t border-zinc-200/80 dark:border-zinc-700/60 bg-zinc-100/70 dark:bg-zinc-800/50 px-4 py-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {/* Seletor compacto de Tipo de Lançamento */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { label: 'Variável', value: 'EXPENSE' },
          { label: 'Fixa', value: 'FIXED_EXPENSE' },
          { label: 'Salário', value: 'SALARY' },
          { label: 'Extra', value: 'EXTRA_INCOME' },
          { label: 'Entrada', value: 'INCOME' },
          { label: 'Investimento', value: 'INVESTMENT_OUTFLOW' },
        ].map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => setType(item.value as TransactionType)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
              type === item.value
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Linha 1: Campos menores alinhados horizontalmente (Valor, Data, Meio de Pagamento) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
        <div className="sm:col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Valor (R$)
          </label>
          <input
            ref={amountInputRef}
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Data
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-hidden dark:[color-scheme:dark] cursor-pointer"
          />
        </div>

        <div className="sm:col-span-5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Meio de Pagamento
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-2.5 text-xs font-semibold transition-all cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              Conta / PIX
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CREDIT')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-2.5 text-xs font-semibold transition-all cursor-pointer ${
                paymentMethod === 'CREDIT'
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/40 shadow-xs'
                  : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <CreditCardIcon className="h-3.5 w-3.5" />
              Cartão
            </button>
          </div>
        </div>
      </div>

      {/* Linha 2: Campos maiores (Descrição, Categoria, Cartão) */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
        <div className={paymentMethod === 'CREDIT' ? 'sm:col-span-5' : 'sm:col-span-7'}>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Descrição
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className={paymentMethod === 'CREDIT' ? 'sm:col-span-4' : 'sm:col-span-5'}>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Categoria
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-hidden cursor-pointer [&>option]:bg-white dark:[&>option]:bg-zinc-900"
          >
            <option value="">Sem categoria</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {paymentMethod === 'CREDIT' && (
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Cartão de Crédito
            </label>
            <select
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-purple-500 focus:outline-hidden cursor-pointer [&>option]:bg-white dark:[&>option]:bg-zinc-900"
            >
              <option value="">Selecione...</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  💳 {card.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Opção de Escopo de Edição para Parcelamento */}
      {isInstallment && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-500/30 bg-purple-950/20 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Parcela {transaction.installment_number}/{transaction.total_installments}:
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name={`updateMode-${transaction.id}`}
                value="SINGLE"
                checked={updateMode === 'SINGLE'}
                onChange={() => setUpdateMode('SINGLE')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span>Apenas esta</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name={`updateMode-${transaction.id}`}
                value="FUTURE"
                checked={updateMode === 'FUTURE'}
                onChange={() => setUpdateMode('FUTURE')}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span>Esta e futuras</span>
            </label>
          </div>
        </div>
      )}

      {/* Rodapé com botões no canto inferior direito */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar (Esc)
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" />
          {loading ? 'Salvando...' : 'Salvar (Enter)'}
        </button>
      </div>
    </form>
  );
}
