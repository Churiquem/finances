'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CreditCard as CreditCardIcon, Pencil } from 'lucide-react';
import { createCreditCard, updateCreditCard } from '@/services/cards';
import type { CreditCard } from '@/types/database';

export interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardSaved?: (card: CreditCard) => void;
  onCardAdded?: (card: CreditCard) => void;
  editingCard?: CreditCard | null;
}

const PALETTE_COLORS = [
  '#8B5CF6', // Purple (Nubank)
  '#F97316', // Orange (Inter)
  '#3B82F6', // Blue (Itaú / Bradesco)
  '#60A5FA', // Light blue
  '#818CF8', // Indigo
  '#10B981', // Emerald (Sicredi / Sicoob)
  '#059669', // Dark green
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#EF4444', // Red (Santander)
  '#EC4899', // Pink (C6 / Neon)
  '#64748B', // Slate
  '#18181B', // Black / Dark Gray (Black / Infinite)
];

export function CardModal({
  isOpen,
  onClose,
  onCardSaved,
  onCardAdded,
  editingCard = null,
}: CardModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('3');
  const [colorHex, setColorHex] = useState(PALETTE_COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editingCard) {
        setName(editingCard.name);
        setLimitAmount(editingCard.limit_amount != null ? String(editingCard.limit_amount) : '');
        setClosingDay(editingCard.closing_day != null ? String(editingCard.closing_day) : '25');
        setDueDay(editingCard.due_day != null ? String(editingCard.due_day) : '3');
        setColorHex(editingCard.color_hex || PALETTE_COLORS[0]);
      } else {
        setName('');
        setLimitAmount('');
        setClosingDay('25');
        setDueDay('3');
        setColorHex(PALETTE_COLORS[0]);
      }
    }
  }, [isOpen, editingCard]);

  // Verificação condicional DEPOIS de todos os hooks declarados
  if (!isOpen || !mounted) return null;

  const isEditing = Boolean(editingCard);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = parseFloat(limitAmount.replace(',', '.'));
    const numClosing = parseInt(closingDay, 10);
    const numDue = parseInt(dueDay, 10);

    if (!name.trim()) {
      alert('Informe o nome do cartão.');
      return;
    }

    if (isNaN(numLimit) || numLimit < 0) {
      alert('Informe um limite válido (zero ou maior).');
      return;
    }

    if (isNaN(numClosing) || numClosing < 1 || numClosing > 31) {
      alert('O dia de fechamento deve ser entre 1 e 31.');
      return;
    }

    if (isNaN(numDue) || numDue < 1 || numDue > 31) {
      alert('O dia de vencimento deve ser entre 1 e 31.');
      return;
    }

    setLoading(true);
    try {
      if (editingCard) {
        const updated = await updateCreditCard(editingCard.id, {
          name: name.trim(),
          limit_amount: numLimit,
          closing_day: numClosing,
          due_day: numDue,
          color_hex: colorHex,
        });

        if (updated) {
          onCardSaved?.(updated);
          onCardAdded?.(updated);
        }
      } else {
        const created = await createCreditCard({
          name: name.trim(),
          limit_amount: numLimit,
          closing_day: numClosing,
          due_day: numDue,
          color_hex: colorHex,
        });

        onCardSaved?.(created);
        onCardAdded?.(created);
      }

      onClose();
    } catch (err) {
      console.error('Erro ao salvar cartão:', err);
      alert('Erro ao salvar cartão de crédito.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
              style={{ backgroundColor: colorHex }}
            >
              {isEditing ? <Pencil className="h-4 w-4" /> : <CreditCardIcon className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {isEditing ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
              </h2>
              {isEditing && (
                <span className="text-[11px] text-zinc-400">
                  Modifique o nome, limite, vencimento ou cor
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nome do Cartão */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Nome do Cartão
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Nubank Ultravioleta, Inter Black..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
            />
          </div>

          {/* Limite Total */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Limite Total (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="5.000,00"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
            />
          </div>

          {/* Dias de Fechamento e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Dia Fechamento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-purple-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
              />
              <span className="text-[10px] text-zinc-500">Dia de corte da fatura</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Dia Vencimento
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-purple-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
              />
              <span className="text-[10px] text-zinc-500">Dia de pagamento limite</span>
            </div>
          </div>

          {/* Cor do Cartão */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              Cor do Cartão
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PALETTE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColorHex(c)}
                  className={`h-7 w-7 rounded-full transition-transform cursor-pointer ${
                    colorHex.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-7 w-7 rounded-lg border-0 bg-transparent p-0 cursor-pointer"
                title="Cor personalizada"
              />
            </div>
          </div>

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
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-purple-600/30 hover:bg-purple-500 disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {loading
                ? isEditing
                  ? 'Salvando...'
                  : 'Cadastrando...'
                : isEditing
                ? 'Salvar Alterações'
                : 'Cadastrar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Aliased export for backwards compatibility
export const AddCardModal = CardModal;
