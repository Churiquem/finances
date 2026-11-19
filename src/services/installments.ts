import { addMonths, format, parseISO } from 'date-fns';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getCreditCards, calculateBillingMonth } from './cards';
import {
  addLocalTransaction,
  deleteLocalInstallments,
  updateLocalInstallments,
} from '@/lib/storage/offlineStorage';
import type { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database';

export interface CreateInstallmentsParams {
  description: string;
  amountPerInstallment: number;
  type: TransactionInsert['type'];
  categoryId: string | null;
  startDate: string; // YYYY-MM-DD
  totalInstallments: number;
  startInstallment?: number;
  paymentMethod?: TransactionInsert['payment_method'];
  creditCardId?: string | null;
  purchaseDate?: string;
}

/**
 * Cria todas as parcelas subsequentes de uma despesa no banco de dados.
 */
export async function createInstallmentGroup(
  params: CreateInstallmentsParams
): Promise<Transaction[]> {
  const {
    description,
    amountPerInstallment,
    type,
    categoryId,
    startDate,
    totalInstallments,
    startInstallment = 1,
    paymentMethod = 'CASH',
    creditCardId = null,
    purchaseDate,
  } = params;

  if (totalInstallments <= 1) {
    throw new Error('Total de parcelas deve ser maior que 1.');
  }

  const groupId = crypto.randomUUID();
  const parsedStartDate = parseISO(startDate);
  const createdTransactions: Transaction[] = [];

  // Remove qualquer sufixo de parcelamento existente no título original
  const cleanDescription = description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
  const start = Math.max(1, Number(startInstallment) || 1);
  const realPurchaseDate = purchaseDate || startDate;

  let cardClosingDay: number | null = null;
  if (creditCardId) {
    const cards = await getCreditCards();
    const foundCard = cards.find((c) => c.id === creditCardId);
    if (foundCard) {
      cardClosingDay = foundCard.closing_day;
    }
  }

  for (let i = start; i <= totalInstallments; i++) {
    let billingMonthStr: string;
    let year: number;
    let month: number;

    if (cardClosingDay !== null) {
      billingMonthStr = calculateBillingMonth(realPurchaseDate, cardClosingDay, i);
      const [by, bm] = billingMonthStr.split('-').map(Number);
      year = by;
      month = bm;
    } else {
      const monthOffset = i - start;
      const installmentDate = addMonths(parsedStartDate, monthOffset);
      billingMonthStr = format(installmentDate, 'yyyy-MM');
      year = installmentDate.getFullYear();
      month = installmentDate.getMonth() + 1;
    }

    const payload: TransactionInsert = {
      description: `${cleanDescription} (${i}/${totalInstallments})`,
      amount: amountPerInstallment,
      type,
      category_id: categoryId,
      date: realPurchaseDate,
      purchase_date: realPurchaseDate,
      billing_month: billingMonthStr,
      month_summary_id: '',
      installment_group_id: groupId,
      installment_number: i,
      total_installments: totalInstallments,
      payment_method: paymentMethod,
      credit_card_id: creditCardId,
    };

    if (!isSupabaseConfigured()) {
      const localTx = addLocalTransaction(payload);
      createdTransactions.push(localTx);
      continue;
    }

    try {
      // Garante que o months_summary do mês da parcela exista
      const { data: monthSummary } = await supabase
        .from('months_summary')
        .upsert({ year, month }, { onConflict: 'year,month' })
        .select()
        .single();

      payload.month_summary_id = monthSummary?.id || '';

      const { data: tx, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();

      if (!error && tx) {
        createdTransactions.push(tx);
      } else {
        console.warn(`Erro no Supabase para parcela ${i}, salvando em localStorage:`, error);
        createdTransactions.push(addLocalTransaction(payload));
      }
    } catch (err) {
      console.warn(`Falha na rede para parcela ${i}, salvando em localStorage:`, err);
      createdTransactions.push(addLocalTransaction(payload));
    }
  }

  return createdTransactions;
}

/**
 * Exclui uma parcela individual ou esta e todas as parcelas futuras do grupo.
 */
export async function deleteInstallment(
  transactionId: string,
  groupId: string | null,
  installmentNumber: number | null,
  deleteMode: 'SINGLE' | 'FUTURE' | 'ALL' = 'SINGLE'
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return deleteLocalInstallments(transactionId, groupId, installmentNumber, deleteMode);
  }

  try {
    if (!groupId || deleteMode === 'SINGLE') {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        return deleteLocalInstallments(transactionId, groupId, installmentNumber, deleteMode);
      }
      return true;
    }

    if (deleteMode === 'ALL') {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', groupId);

      if (error) {
        return deleteLocalInstallments(transactionId, groupId, installmentNumber, deleteMode);
      }
      return true;
    }

    if (deleteMode === 'FUTURE' && installmentNumber !== null) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', groupId)
        .gte('installment_number', installmentNumber);

      if (error) {
        return deleteLocalInstallments(transactionId, groupId, installmentNumber, deleteMode);
      }
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Falha de rede com Supabase, deletando em localStorage:', err);
    return deleteLocalInstallments(transactionId, groupId, installmentNumber, deleteMode);
  }
}

/**
 * Atualiza uma parcela individual ou esta e todas as parcelas futuras do grupo.
 */
export async function updateInstallment(
  transactionId: string,
  groupId: string | null,
  installmentNumber: number | null,
  updates: Partial<TransactionUpdate>,
  updateMode: 'SINGLE' | 'FUTURE' = 'SINGLE'
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return updateLocalInstallments(transactionId, groupId, installmentNumber, updates, updateMode);
  }

  try {
    if (!groupId || updateMode === 'SINGLE') {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId);

      if (!error) {
        updateLocalInstallments(transactionId, groupId, installmentNumber, updates, 'SINGLE');
        return true;
      }
      return updateLocalInstallments(transactionId, groupId, installmentNumber, updates, 'SINGLE');
    }

    if (updateMode === 'FUTURE' && installmentNumber !== null) {
      const cleanDescription = updates.description
        ? updates.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
        : null;

      const { data: futureTxs, error: fetchErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('installment_group_id', groupId)
        .gte('installment_number', installmentNumber);

      if (!fetchErr && futureTxs && futureTxs.length > 0) {
        await Promise.all(
          futureTxs.map((tx) => {
            const itemUpdates: Partial<TransactionUpdate> = { ...updates };
            if (cleanDescription && tx.total_installments) {
              itemUpdates.description = `${cleanDescription} (${tx.installment_number}/${tx.total_installments})`;
            }
            if (tx.id !== transactionId && updates.date) {
              delete itemUpdates.date;
            }
            return supabase.from('transactions').update(itemUpdates).eq('id', tx.id);
          })
        );
      }

      updateLocalInstallments(transactionId, groupId, installmentNumber, updates, 'FUTURE');
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Falha de rede com Supabase em updateInstallment, usando localStorage:', err);
    return updateLocalInstallments(transactionId, groupId, installmentNumber, updates, updateMode);
  }
}
