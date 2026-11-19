'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Category, TransactionType, TransactionInsert, CreditCard, PaymentMethod } from '@/types/database';
import { getCreditCards, calculateBillingMonth } from '@/services/cards';
import { getCategories } from '@/services/budget';
import { X, Check, CreditCard as CreditCardIcon, Wallet } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddTransaction: (payload: TransactionInsert) => Promise<void>;
  defaultType?: string;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  categories,
  onAddTransaction,
  defaultType = 'EXPENSE',
}: AddTransactionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories || []);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(
    (defaultType as TransactionType) || 'EXPENSE'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [creditCardId, setCreditCardId] = useState<string>('');
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState('');
  const [installmentValueMode, setInstallmentValueMode] = useState<'TOTAL' | 'PER_INSTALLMENT'>('TOTAL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setLocalCategories(categories);
    }
  }, [categories]);

  useEffect(() => {
    const refreshCategories = async () => {
      try {
        const cats = await getCategories();
        if (cats && cats.length > 0) {
          setLocalCategories(cats);
        }
      } catch (err) {
        console.warn('Erro ao atualizar categorias no AddTransactionModal:', err);
      }
    };

    window.addEventListener('finances-categories-changed', refreshCategories);
    window.addEventListener('finances-data-changed', refreshCategories);
    return () => {
      window.removeEventListener('finances-categories-changed', refreshCategories);
      window.removeEventListener('finances-data-changed', refreshCategories);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      getCreditCards().then((cards) => {
        setCreditCards(cards);
        if (cards.length > 0 && (!creditCardId || !cards.some((c) => c.id === creditCardId))) {
          setCreditCardId(cards[0].id);
        }
      });
      getCategories().then((cats) => {
        if (cats && cats.length > 0) {
          setLocalCategories(cats);
        }
      });
    }
  }, [isOpen, creditCardId]);

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const totalInst = Math.max(1, Number(totalInstallments) || 1);
  const startInst = Math.max(1, Math.min(totalInst, Number(installmentNumber) || 1));
  const remainingInstallmentsCount = Math.max(1, totalInst - startInst + 1);

  const calculatedInstallmentAmount = isInstallment && totalInst > 1
    ? installmentValueMode === 'TOTAL'
      ? Math.round((numAmount / totalInst) * 100) / 100
      : numAmount
    : numAmount;

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const formatMonthYearPreview = (dateStr: string) => {
    try {
      const [y, m] = dateStr.split('-');
      return `${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  if (!isOpen || !mounted) return null;

  const filteredCategories = localCategories.filter((cat) => {
    if (type === 'SALARY' || type === 'EXTRA_INCOME' || type === 'INCOME') {
      return cat.type === 'INCOME';
    }
    if (type === 'FIXED_EXPENSE') {
      return cat.type === 'FIXED_EXPENSE';
    }
    return cat.type === 'EXPENSE';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert('Preencha a descrição e um valor válido maior que zero.');
      return;
    }

    setLoading(true);
    try {
      const realPurchaseDate = isInstallment && purchaseDate ? purchaseDate : date;
      const selectedCard = paymentMethod === 'CREDIT' ? creditCards.find((c) => c.id === creditCardId) : undefined;
      const targetBillingMonth = selectedCard
        ? calculateBillingMonth(realPurchaseDate, selectedCard.closing_day, isInstallment ? startInst : 1)
        : date.substring(0, 7);

      await onAddTransaction({
        description: description.trim(),
        amount: isInstallment ? calculatedInstallmentAmount : numAmount,
        type,
        category_id: categoryId || (filteredCategories[0]?.id ?? null),
        date: realPurchaseDate,
        purchase_date: realPurchaseDate,
        billing_month: targetBillingMonth,
        month_summary_id: '', // será preenchido pelo service
        installment_group_id: isInstallment ? crypto.randomUUID() : null,
        installment_number: isInstallment ? startInst : null,
        total_installments: isInstallment ? totalInst : null,
        payment_method: paymentMethod,
        credit_card_id: paymentMethod === 'CREDIT' ? (creditCardId || null) : null,
      });

      // Reset form
      setDescription('');
      setAmount('');
      setIsInstallment(false);
      setTotalInstallments(1);
      setInstallmentNumber(1);
      setPurchaseDate('');
      setInstallmentValueMode('TOTAL');
      setPaymentMethod('CASH');
      onClose();
    } catch (err) {
      console.error('Erro ao adicionar transação:', err);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Novo Lançamento
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tipo de Lançamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Tipo de Lançamento
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {[
                { label: 'Despesa Variável', value: 'EXPENSE' },
                { label: 'Mensalidade Fixa', value: 'FIXED_EXPENSE' },
                { label: 'Salário', value: 'SALARY' },
                { label: 'Renda Extra', value: 'EXTRA_INCOME' },
                { label: 'Entrada / Rendimento', value: 'INCOME' },
                { label: 'Investimento', value: 'INVESTMENT_OUTFLOW' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setType(item.value as TransactionType)}
                  className={`rounded-xl px-2.5 py-2 text-[11px] font-semibold transition-all cursor-pointer text-center ${
                    type === item.value
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meio de Pagamento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Meio de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-xs'
                    : 'border border-zinc-700/60 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <Wallet className="h-4 w-4" />
                Conta / PIX
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'CREDIT'
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/40 shadow-xs'
                    : 'border border-zinc-700/60 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <CreditCardIcon className="h-4 w-4" />
                Cartão de Crédito
              </button>
            </div>
          </div>

          {/* Seleção do Cartão de Crédito quando ativo */}
          {paymentMethod === 'CREDIT' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Cartão de Crédito
              </label>
              {creditCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-400">
                  Nenhum cartão cadastrado. Cadastre um cartão na aba Cartões.
                </div>
              ) : (
                <select
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-purple-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
                >
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id} className="bg-zinc-900 text-zinc-100">
                      💳 {card.name} (Fecha dia {card.closing_day} / Vence dia {card.due_day})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Supermercado, Aluguel, Salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Valor (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Data
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden [color-scheme:dark] cursor-pointer"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-zinc-100"
            >
              <option value="" className="bg-zinc-900 text-zinc-100">Sem categoria</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-zinc-900 text-zinc-100">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Parcelamento (opcional) */}
          {type === 'EXPENSE' && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsInstallment(checked);
                    if (checked && totalInstallments <= 1) {
                      setTotalInstallments(2);
                    }
                  }}
                  className="h-4 w-4 rounded-md border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors cursor-pointer">
                  Compra Parcelada?
                </span>
              </label>

              {isInstallment && (
                <div className="mt-3 space-y-3 pt-3 border-t border-zinc-800">
                  {/* Seletor do modo de valor: Total vs Cada Parcela */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                      O valor informado ({formatBRL(numAmount)}) é:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInstallmentValueMode('TOTAL')}
                        className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                          installmentValueMode === 'TOTAL'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-xs'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        Valor Total da Compra
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstallmentValueMode('PER_INSTALLMENT')}
                        className={`py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                          installmentValueMode === 'PER_INSTALLMENT'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-xs'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        Valor de Cada Parcela
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Parcela Atual
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={totalInstallments}
                        value={installmentNumber}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setInstallmentNumber(Math.max(1, Math.min(totalInstallments, val)));
                        }}
                        className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Total de Parcelas
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={72}
                        value={totalInstallments}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setTotalInstallments(val);
                          if (installmentNumber > val) {
                            setInstallmentNumber(val);
                          }
                        }}
                        className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {startInst > 1 && (
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Data Original da Compra (opcional)
                      </label>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                      />
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Informa a data em que a compra foi realizada originalmente. Se vazio, utiliza a data do lançamento.
                      </p>
                    </div>
                  )}

                  {/* Prévia Informativa em Tempo Real */}
                  {numAmount > 0 && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                      <p className="font-semibold">
                        Serão lançadas {remainingInstallmentsCount} {remainingInstallmentsCount === 1 ? 'parcela' : 'parcelas'} de {formatBRL(calculatedInstallmentAmount)} a partir de {formatMonthYearPreview(date)}
                        {startInst > 1 ? ` (parcelas ${startInst}/${totalInst} a ${totalInst}/${totalInst}).` : '.'}
                      </p>
                      {installmentValueMode === 'TOTAL' && totalInst > 1 && (
                        <p className="text-[11px] text-emerald-400/80 mt-0.5">
                          Valor total da compra: {formatBRL(numAmount)} dividido em {totalInst}x.
                        </p>
                      )}
                      {installmentValueMode === 'PER_INSTALLMENT' && totalInst > 1 && (
                        <p className="text-[11px] text-emerald-400/80 mt-0.5">
                          Valor total acumulado ({totalInst}x): {formatBRL(numAmount * totalInst)}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
