import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createTransaction } from './budget';
import {
  getLocalReceivables,
  addLocalReceivable,
  updateLocalReceivable,
  deleteLocalReceivable,
} from '@/lib/storage/offlineStorage';
import type {
  LoanReceivable,
  LoanReceivableInsert,
  LoanReceivableUpdate,
} from '@/types/database';
import { differenceInDays, parseISO } from 'date-fns';

export interface ReceivableWithAlerts extends LoanReceivable {
  isOverdue: boolean;
  isExpiringSoon: boolean; // vence nos próximos 3 dias ou hoje
  daysUntilDue: number;
}

/**
 * Avalia dinamicamente alertas de vencimento e atraso para um empréstimo/recebível.
 */
export function evaluateReceivableAlerts(r: LoanReceivable): ReceivableWithAlerts {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = parseISO(r.due_date);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = differenceInDays(due, today);

  const isOverdue = r.status !== 'PAID' && daysUntilDue < 0;
  const isExpiringSoon = r.status === 'PENDING' && daysUntilDue >= 0 && daysUntilDue <= 3;

  return {
    ...r,
    status: isOverdue ? 'OVERDUE' : r.status,
    isOverdue,
    isExpiringSoon,
    daysUntilDue,
  };
}

/**
 * Busca todos os valores a receber / empréstimos ordenados por vencimento.
 */
export async function getReceivables(): Promise<ReceivableWithAlerts[]> {
  if (!isSupabaseConfigured()) {
    return getLocalReceivables().map(evaluateReceivableAlerts);
  }

  try {
    const { data, error } = await supabase
      .from('loans_receivable')
      .select('*')
      .order('due_date', { ascending: true });

    if (error || !data || data.length === 0) {
      return getLocalReceivables().map(evaluateReceivableAlerts);
    }

    return (data as LoanReceivable[]).map(evaluateReceivableAlerts);
  } catch (err) {
    console.warn('Supabase inacessível, recuperando recebíveis de localStorage:', err);
    return getLocalReceivables().map(evaluateReceivableAlerts);
  }
}

/**
 * Cadastra um novo valor a receber / empréstimo.
 */
export async function createReceivable(
  payload: LoanReceivableInsert
): Promise<LoanReceivable | null> {
  if (!isSupabaseConfigured()) {
    return addLocalReceivable(payload);
  }

  try {
    const { data, error } = await supabase
      .from('loans_receivable')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Erro ao criar recebível no Supabase, salvando em localStorage:', error);
      return addLocalReceivable(payload);
    }
    return data;
  } catch (err) {
    console.warn('Falha de rede com Supabase, salvando em localStorage:', err);
    return addLocalReceivable(payload);
  }
}

/**
 * Atualiza um valor a receber.
 */
export async function updateReceivable(
  id: string,
  payload: LoanReceivableUpdate
): Promise<LoanReceivable | null> {
  if (!isSupabaseConfigured()) {
    return updateLocalReceivable(id, payload);
  }

  try {
    const { data, error } = await supabase
      .from('loans_receivable')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Erro ao atualizar no Supabase, usando localStorage:', error);
      return updateLocalReceivable(id, payload);
    }
    return data;
  } catch (err) {
    console.warn('Falha de rede com Supabase, usando localStorage:', err);
    return updateLocalReceivable(id, payload);
  }
}

/**
 * Remove um valor a receber.
 */
export async function deleteReceivable(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return deleteLocalReceivable(id);
  }

  try {
    const { error } = await supabase
      .from('loans_receivable')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Erro ao excluir no Supabase, removendo de localStorage:', error);
      return deleteLocalReceivable(id);
    }
    return true;
  } catch (err) {
    console.warn('Falha de rede com Supabase, removendo de localStorage:', err);
    return deleteLocalReceivable(id);
  }
}

/**
 * Dá baixa como pago. Opcionalmente gera um lançamento de EXTRA_INCOME no mês atual.
 */
export async function markReceivableAsPaid(
  id: string,
  createIncomeTransaction = true,
  debtorName = '',
  amount = 0
): Promise<boolean> {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('loans_receivable')
          .update({ status: 'PAID' })
          .eq('id', id);

        if (error) {
          updateLocalReceivable(id, { status: 'PAID' });
        }
      } catch {
        updateLocalReceivable(id, { status: 'PAID' });
      }
    } else {
      updateLocalReceivable(id, { status: 'PAID' });
    }

    if (createIncomeTransaction && amount > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      await createTransaction({
        description: `Recebimento de empréstimo: ${debtorName}`,
        amount,
        type: 'EXTRA_INCOME',
        date: todayStr,
        category_id: null,
        month_summary_id: '',
        installment_group_id: null,
        installment_number: null,
        total_installments: null,
      });
    }

    return true;
  } catch (err) {
    console.error('Falha ao processar baixa de recebível:', err);
    return false;
  }
}

/**
 * Gera URL de mensagem personalizada para cobrança no WhatsApp.
 */
export function buildWhatsAppCobranceLink(
  debtorName: string,
  amount: number,
  dueDateStr: string
): string {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);

  let formattedDate = dueDateStr;
  try {
    const [year, month, day] = dueDateStr.split('-');
    formattedDate = `${day}/${month}/${year}`;
  } catch {
    // fallback
  }

  const message = `Olá, ${debtorName}! Tudo bem? Passando para lembrar com carinho do valor de ${formatBRL(amount)} combinado para o dia ${formattedDate}. Segue minha chave Pix se preferir! Qualquer dúvida estou por aqui. Um abraço!`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

