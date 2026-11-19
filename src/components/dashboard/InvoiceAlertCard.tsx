'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getCardInvoices, markInvoiceAsPaid, type CardInvoiceDetails } from '@/services/cards';

export function InvoiceAlertCard() {
  const [alerts, setAlerts] = useState<CardInvoiceDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingCardId, setPayingCardId] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);

  const fetchAlerts = useCallback(async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Busca faturas do mês atual
      const currentInvoices = await getCardInvoices(currentYear, currentMonth);

      // Filtra as que estão vencidas ou vencendo nos próximos 3 dias (e possuem saldo > 0)
      const critical = currentInvoices.filter((i) => i.isOverdue || i.isNearDue);

      setAlerts(critical);
    } catch (err) {
      console.error('Erro ao buscar alertas de faturas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    const handleDataChange = () => fetchAlerts();
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
  }, [fetchAlerts]);

  const handleQuickPay = async (cardId: string) => {
    try {
      setPayingCardId(cardId);
      const now = new Date();
      await markInvoiceAsPaid(cardId, now.getFullYear(), now.getMonth() + 1);
      await fetchAlerts();
    } catch (err) {
      console.error('Erro ao pagar fatura:', err);
    } finally {
      setPayingCardId(null);
    }
  };

  if (loading || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => {
        const isOverdue = alert.isOverdue;

        return (
          <div
            key={alert.card.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm transition-all ${
              isOverdue
                ? 'border-red-500/40 bg-red-950/20 text-red-100'
                : 'border-amber-500/40 bg-amber-950/20 text-amber-100'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {isOverdue ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5 animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: alert.card.color_hex }}
                  />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Fatura {alert.card.name}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isOverdue
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isOverdue
                      ? 'Fatura Vencida'
                      : alert.daysUntilDue === 0
                      ? 'Vence Hoje!'
                      : `Vence em ${alert.daysUntilDue} dia(s)`}
                  </span>
                </div>

                <p className="mt-1 text-xs text-zinc-400">
                  Total de <span className="font-semibold text-zinc-200">{formatCurrency(alert.totalAmount)}</span> com
                  vencimento em <span className="font-semibold text-zinc-200">{alert.dueDateStr}</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <button
                onClick={() => handleQuickPay(alert.card.id)}
                disabled={payingCardId === alert.card.id}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {payingCardId === alert.card.id ? 'Processando...' : 'Marcar como Paga'}
              </button>

              <Link
                href="/cards"
                className="flex items-center gap-1 rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Ver Fatura
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
