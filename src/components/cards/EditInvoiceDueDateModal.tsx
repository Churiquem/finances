'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CreditCard, CreditCardInvoice } from '@/types/database';
import { parseLocalDate } from '@/services/cards';
import { differenceInDays } from 'date-fns';
import {
  Calendar,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface EditInvoiceDueDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard;
  invoice: CreditCardInvoice | null;
  year: number;
  month: number;
  defaultDueDateStr: string;
  currentDueDateStr: string;
  onSaveDueDate: (newDueDate: string, isPostponed: boolean) => Promise<void>;
  onResetToDefault: () => Promise<void>;
}

export function EditInvoiceDueDateModal({
  isOpen,
  onClose,
  card,
  invoice,
  year,
  month,
  defaultDueDateStr,
  currentDueDateStr,
  onSaveDueDate,
  onResetToDefault,
}: EditInvoiceDueDateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [isPostponed, setIsPostponed] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (invoice?.due_date) {
        setDueDate(invoice.due_date.split('T')[0]);
      } else {
        // Inicializa com a data atual formatada como YYYY-MM-DD
        try {
          const [d, m, y] = currentDueDateStr.split('/');
          if (d && m && y) {
            setDueDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
          } else {
            setDueDate(new Date().toISOString().split('T')[0]);
          }
        } catch {
          setDueDate(new Date().toISOString().split('T')[0]);
        }
      }
      setIsPostponed(Boolean(invoice?.is_postponed));
    }
  }, [isOpen, invoice, currentDueDateStr]);

  if (!isOpen || !mounted) return null;

  // Calcula previsão de status em tempo real
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let predictedStatus: 'OPEN' | 'OVERDUE' | 'POSTPONED' = 'OPEN';
  let diffDays = 0;

  if (dueDate) {
    try {
      const selectedObj = parseLocalDate(dueDate);
      selectedObj.setHours(0, 0, 0, 0);
      diffDays = differenceInDays(selectedObj, today);

      if (isPostponed) {
        predictedStatus = 'POSTPONED';
      } else if (diffDays < 0) {
        predictedStatus = 'OVERDUE';
      } else {
        predictedStatus = 'OPEN';
      }
    } catch {
      predictedStatus = isPostponed ? 'POSTPONED' : 'OPEN';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      alert('Por favor, selecione uma data de vencimento válida.');
      return;
    }

    setSaving(true);
    try {
      await onSaveDueDate(dueDate, isPostponed);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar novo vencimento:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        `Deseja restaurar a data de vencimento para o padrão do cartão (${defaultDueDateStr})?`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await onResetToDefault();
      onClose();
    } catch (err) {
      console.error('Erro ao restaurar vencimento:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasOverride = Boolean(invoice?.due_date || invoice?.is_postponed);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 text-zinc-100">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Editar Vencimento da Fatura
              </h2>
              <p className="text-xs text-zinc-400">
                Competência {String(month).padStart(2, '0')}/{year} • {card.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informações Atuais */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Regra padrão do cartão:</span>
            <span className="font-semibold text-zinc-200">
              Dia {card.due_day} ({defaultDueDateStr})
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Vencimento atual desta fatura:</span>
            <span className="font-semibold text-purple-300">
              {currentDueDateStr}
            </span>
          </div>
          {hasOverride && (
            <div className="pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-[11px] text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Esta fatura possui ajuste individual de vencimento.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              <span>Nova Data de Vencimento Completa (Ano-Mês-Dia)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 transition-colors"
            />
            <p className="text-[11px] text-zinc-400">
              Você pode postergar para qualquer mês ou ano (ex: para o próximo mês ou ano que vem).
            </p>
          </div>

          {/* Opção de Postergamento Manual */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPostponed}
                onChange={(e) => setIsPostponed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-200">
                  Marcar formalmente como Fatura Postergada
                </span>
                <p className="text-[11px] text-zinc-400">
                  Faturas postergadas permanecem em status Aberto e nunca ativam o alerta de atraso.
                </p>
              </div>
            </label>
          </div>

          {/* Previsão de Status Resultante */}
          <div
            className={`rounded-xl border p-3 flex items-center gap-2.5 text-xs ${
              predictedStatus === 'POSTPONED'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : predictedStatus === 'OPEN'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {predictedStatus === 'POSTPONED' ? (
              <Clock className="h-4 w-4 shrink-0 text-amber-400" />
            ) : predictedStatus === 'OPEN' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <div>
              <span className="font-semibold">
                Status resultante:{' '}
                {predictedStatus === 'POSTPONED'
                  ? 'ABERTA (Postergada)'
                  : predictedStatus === 'OPEN'
                  ? 'ABERTA (Dentro do prazo)'
                  : 'ATRASADA (Data já expirou)'}
              </span>
              <p className="text-[11px] opacity-80">
                {predictedStatus === 'POSTPONED'
                  ? 'A fatura será tratada como postergada e não cobrará atraso.'
                  : predictedStatus === 'OPEN'
                  ? diffDays === 0
                    ? 'A fatura vence exatamente hoje.'
                    : `Vencerá em ${diffDays} dia(s).`
                  : `Venceu há ${Math.abs(diffDays)} dia(s).`}
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-2">
            {hasOverride ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-purple-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !dueDate}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50 cursor-pointer shadow-xs shadow-purple-600/30"
              >
                {saving ? 'Salvando...' : 'Salvar Vencimento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
