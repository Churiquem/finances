import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  getLocalCreditCards,
  saveLocalCreditCards,
  addLocalCreditCard,
  updateLocalCreditCard,
  deleteLocalCreditCard,
  getLocalInvoices,
  getLocalInvoice,
  markLocalInvoicePaid,
  reopenLocalInvoice,
  saveLocalInvoice,
  getLocalTransactions,
  sortTransactionsDesc,
  calculateBillingMonth,
} from '@/lib/storage/offlineStorage';
import type {
  CreditCard,
  CreditCardInsert,
  CreditCardUpdate,
  CreditCardInvoice,
  CreditCardInvoiceInsert,
  InvoiceStatus,
  Transaction,
} from '@/types/database';
import { differenceInDays, format } from 'date-fns';

export { calculateBillingMonth };

/**
 * Converte com segurança uma string 'YYYY-MM-DD' para objeto Date local (sem desvios de timezone UTC).
 */
export function parseLocalDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('T')[0].split('-');
  return new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
}

/**
 * Determina o mês de competência da fatura (billing_month: 'YYYY-MM') para uma transação.
 * Se o cartão for fornecido, aplica a regra automática de corte pelo closing_day.
 */
export function getTransactionBillingMonth(
  tx: {
    date: string;
    purchase_date?: string | null;
    billing_month?: string | null;
    installment_number?: number | null;
    total_installments?: number | null;
    credit_card_id?: string | null;
  },
  cardOrClosingDay?: CreditCard | number | null
): string {
  const closingDay =
    typeof cardOrClosingDay === 'number'
      ? cardOrClosingDay
      : cardOrClosingDay?.closing_day;

  if (closingDay !== undefined && closingDay !== null) {
    const purchaseDate = tx.purchase_date || tx.date;
    return calculateBillingMonth(
      purchaseDate,
      closingDay,
      tx.installment_number || 1
    );
  }

  return tx.billing_month || tx.date.substring(0, 7);
}

export interface CardInvoiceDetails {
  card: CreditCard;
  invoice: CreditCardInvoice | null;
  status: InvoiceStatus;
  transactions: Transaction[];
  totalAmount: number;
  availableLimit: number;
  dueDateStr: string;
  closingDateStr: string;
  daysUntilDue: number;
  isOverdue: boolean;
  isNearDue: boolean;
  isPostponed?: boolean;
}

export interface CardsSummary {
  totalInvoices: number;
  totalPaid: number;
  totalOpen: number;
  totalLimit: number;
  totalAvailableLimit: number;
  overdueCount: number;
  nearDueCount: number;
  invoices: CardInvoiceDetails[];
}

/**
 * Calcula a data de vencimento da fatura do mês/ano de referência.
 * Se o dia de vencimento for menor que o de fechamento, o vencimento cai no mês seguinte.
 */
export function getInvoiceDueDate(card: CreditCard, year: number, month: number): Date {
  let dueMonth = month;
  let dueYear = year;

  if (card.due_day < card.closing_day) {
    dueMonth = month + 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = year + 1;
    }
  }

  const maxDays = new Date(dueYear, dueMonth, 0).getDate();
  const validDay = Math.min(card.due_day, maxDays);
  return new Date(dueYear, dueMonth - 1, validDay);
}

/**
 * Calcula a data de fechamento da fatura do mês/ano de referência.
 */
export function getInvoiceClosingDate(card: CreditCard, year: number, month: number): Date {
  const maxDays = new Date(year, month, 0).getDate();
  const validDay = Math.min(card.closing_day, maxDays);
  return new Date(year, month - 1, validDay);
}

/**
 * Retorna todos os cartões de crédito cadastrados.
 */
export async function getCreditCards(): Promise<CreditCard[]> {
  if (!isSupabaseConfigured()) {
    return getLocalCreditCards();
  }

  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return getLocalCreditCards();
    }

    return data as CreditCard[];
  } catch (err) {
    console.warn('Erro ao buscar cartões no Supabase, usando localStorage:', err);
    return getLocalCreditCards();
  }
}

/**
 * Cria um novo cartão de crédito.
 */
export async function createCreditCard(payload: CreditCardInsert): Promise<CreditCard> {
  if (!isSupabaseConfigured()) {
    return addLocalCreditCard(payload);
  }

  try {
    const { data, error } = await supabase
      .from('credit_cards')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.warn('Erro ao criar cartão no Supabase, gravando em localStorage:', error);
      return addLocalCreditCard(payload);
    }

    // Mantém sincronizado no local
    const local = getLocalCreditCards();
    local.push(data as CreditCard);
    saveLocalCreditCards(local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finances-cards-changed'));
      window.dispatchEvent(new CustomEvent('finances-data-changed'));
      window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    }

    return data as CreditCard;
  } catch (err) {
    console.warn('Falha de rede ao criar cartão, usando localStorage:', err);
    const localCard = addLocalCreditCard(payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finances-cards-changed'));
      window.dispatchEvent(new CustomEvent('finances-data-changed'));
      window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    }
    return localCard;
  }
}

/**
 * Atualiza dados de um cartão de crédito.
 */
export async function updateCreditCard(
  id: string,
  payload: CreditCardUpdate
): Promise<CreditCard | null> {
  let updatedCard: CreditCard | null = null;

  if (!isSupabaseConfigured()) {
    updatedCard = updateLocalCreditCard(id, payload);
  } else {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        console.warn('Erro ao atualizar cartão no Supabase, atualizando local:', error);
        updatedCard = updateLocalCreditCard(id, payload);
      } else {
        updateLocalCreditCard(id, payload);
        updatedCard = data as CreditCard;
      }
    } catch (err) {
      console.warn('Erro ao atualizar cartão no Supabase:', err);
      updatedCard = updateLocalCreditCard(id, payload);
    }
  }

  if (updatedCard && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-cards-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }

  return updatedCard;
}

/**
 * Remove um cartão de crédito.
 */
export async function deleteCreditCard(id: string): Promise<{ success: boolean; error?: string }> {
  // Validação preliminar de transações vinculadas
  const localRes = deleteLocalCreditCard(id);
  if (!localRes.success) {
    return localRes;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-cards-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao excluir cartão no Supabase:', error);
    }
    return { success: true };
  } catch (err) {
    console.warn('Falha de rede ao excluir cartão no Supabase:', err);
    return { success: true };
  }
}

/**
 * Retorna faturas e transações consolidadas para todos os cartões em determinado mês/ano.
 */
export async function getCardInvoices(
  year: number,
  month: number
): Promise<CardInvoiceDetails[]> {
  const cards = await getCreditCards();

  // Busca transações locais ou via Supabase
  let allTransactions: Transaction[] = [];
  let allInvoices: CreditCardInvoice[] = [];

  if (!isSupabaseConfigured()) {
    allTransactions = getLocalTransactions();
    allInvoices = getLocalInvoices();
  } else {
    try {
      const [txRes, invRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('credit_card_invoices').select('*').eq('year', year).eq('month', month),
      ]);

      allTransactions = (txRes.data as Transaction[]) || getLocalTransactions();
      allInvoices = (invRes.data as CreditCardInvoice[]) || getLocalInvoices();
    } catch {
      allTransactions = getLocalTransactions();
      allInvoices = getLocalInvoices();
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetBillingMonth = `${year}-${String(month).padStart(2, '0')}`;

  return cards.map((card) => {
    // Transações deste cartão neste mês (ordenadas com novas compras no topo e parcelas herdadas no final)
    const cardTransactions = sortTransactionsDesc(
      allTransactions.filter((tx) => {
        if (tx.credit_card_id !== card.id) return false;
        const bMonth = getTransactionBillingMonth(tx, card);
        return bMonth === targetBillingMonth;
      }),
      targetBillingMonth
    );

    const totalAmount = cardTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    // Fatura registrada no banco ou local
    const invoice = allInvoices.find(
      (inv) => inv.credit_card_id === card.id && inv.year === year && inv.month === month
    ) || null;

    // Se a fatura tiver due_date (override individual), usa essa data
    const dueDate = invoice?.due_date
      ? parseLocalDate(invoice.due_date)
      : getInvoiceDueDate(card, year, month);

    const closingDate = getInvoiceClosingDate(card, year, month);

    const dueZero = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    dueZero.setHours(0, 0, 0, 0);

    const daysUntilDue = differenceInDays(dueZero, today);
    const isPaid = invoice?.status === 'PAID';
    const isPostponed = Boolean(invoice?.is_postponed);

    // Condição de atraso: só ativada se hoje > invoice.due_date E não estiver paga E não estiver postergada
    const isOverdue = !isPaid && !isPostponed && daysUntilDue < 0 && totalAmount > 0;
    const isNearDue = !isPaid && !isPostponed && !isOverdue && daysUntilDue >= 0 && daysUntilDue <= 3 && totalAmount > 0;

    let status: InvoiceStatus = 'OPEN';
    if (isPaid) {
      status = 'PAID';
    } else if (isOverdue) {
      status = 'OVERDUE';
    } else {
      status = 'OPEN';
    }

    // Calcula limite utilizado em faturas ABERTAS em geral para este cartão
    const cardOpenTransactions = allTransactions.filter((tx) => {
      if (tx.credit_card_id !== card.id) return false;
      const bMonth = getTransactionBillingMonth(tx, card);
      const [txYearStr, txMonthStr] = bMonth.split('-');
      const txYear = Number(txYearStr);
      const txMonth = Number(txMonthStr);
      const invForTx = allInvoices.find(
        (i) => i.credit_card_id === card.id && i.year === txYear && i.month === txMonth
      );
      return invForTx?.status !== 'PAID';
    });
    const totalOpenOnCard = cardOpenTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const availableLimit = Math.max(0, Number(card.limit_amount) - totalOpenOnCard);

    return {
      card,
      invoice,
      status,
      transactions: cardTransactions,
      totalAmount,
      availableLimit,
      dueDateStr: format(dueDate, 'dd/MM/yyyy'),
      closingDateStr: format(closingDate, 'dd/MM/yyyy'),
      daysUntilDue,
      isOverdue,
      isNearDue,
      isPostponed,
    };
  });
}

/**
 * Retorna o resumo consolidado de todos os cartões para o mês informado.
 */
export async function getCardsSummary(year: number, month: number): Promise<CardsSummary> {
  const invoices = await getCardInvoices(year, month);

  const totalInvoices = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((acc, i) => acc + i.totalAmount, 0);
  const totalOpen = totalInvoices - totalPaid;
  const totalLimit = invoices.reduce((acc, i) => acc + Number(i.card.limit_amount || 0), 0);
  const totalAvailableLimit = invoices.reduce((acc, i) => acc + i.availableLimit, 0);

  const overdueCount = invoices.filter((i) => i.isOverdue).length;
  const nearDueCount = invoices.filter((i) => i.isNearDue).length;

  return {
    totalInvoices,
    totalPaid,
    totalOpen,
    totalLimit,
    totalAvailableLimit,
    overdueCount,
    nearDueCount,
    invoices,
  };
}

/**
 * Retorna o montante total de faturas de cartão de crédito que foram pagas
 * (dinheiro efetivamente debitado da conta corrente) no mês/ano indicado.
 */
export async function getPaidInvoicesCashOutflow(year: number, month: number): Promise<number> {
  let allInvoices: CreditCardInvoice[] = [];
  let allTransactions: Transaction[] = [];

  if (!isSupabaseConfigured()) {
    allInvoices = getLocalInvoices();
    allTransactions = getLocalTransactions();
  } else {
    try {
      const [invRes, txRes] = await Promise.all([
        supabase.from('credit_card_invoices').select('*').eq('status', 'PAID'),
        supabase.from('transactions').select('*').eq('payment_method', 'CREDIT'),
      ]);
      allInvoices = (invRes.data as CreditCardInvoice[]) || getLocalInvoices();
      allTransactions = (txRes.data as Transaction[]) || getLocalTransactions();
    } catch {
      allInvoices = getLocalInvoices();
      allTransactions = getLocalTransactions();
    }
  }

  const targetMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const paidInThisMonth = allInvoices.filter((inv) => {
    if (inv.status !== 'PAID') return false;
    if (inv.paid_at) {
      return inv.paid_at.startsWith(targetMonthPrefix);
    }
    return inv.year === year && inv.month === month;
  });

  if (paidInThisMonth.length === 0) return 0;

  const cards = await getCreditCards();
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  let totalCashOutflow = 0;
  for (const inv of paidInThisMonth) {
    const invMonthStr = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
    const invTxs = allTransactions.filter((tx) => {
      if (tx.credit_card_id !== inv.credit_card_id) return false;
      const card = cardMap.get(tx.credit_card_id);
      const bMonth = getTransactionBillingMonth(tx, card);
      return bMonth === invMonthStr;
    });
    totalCashOutflow += invTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  return totalCashOutflow;
}

/**
 * Marca uma fatura como paga (status = PAID).
 * Não gera despesa duplicada de categorias, atuando como baixa de conciliação de caixa.
 */
export async function markInvoiceAsPaid(
  cardId: string,
  year: number,
  month: number
): Promise<CreditCardInvoice> {
  markLocalInvoicePaid(cardId, year, month);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
  }

  if (!isSupabaseConfigured()) {
    const inv = getLocalInvoice(cardId, year, month);
    return inv!;
  }

  try {
    const { data, error } = await supabase
      .from('credit_card_invoices')
      .upsert(
        {
          credit_card_id: cardId,
          year,
          month,
          status: 'PAID',
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'credit_card_id,year,month' }
      )
      .select()
      .single();

    if (error || !data) {
      console.warn('Erro ao marcar fatura no Supabase:', error);
      return getLocalInvoice(cardId, year, month)!;
    }

    return data as CreditCardInvoice;
  } catch (err) {
    console.warn('Erro de rede ao marcar fatura no Supabase:', err);
    return getLocalInvoice(cardId, year, month)!;
  }
}

/**
 * Reabre uma fatura que havia sido marcada como paga (status = OPEN).
 */
export async function reopenInvoice(
  cardId: string,
  year: number,
  month: number
): Promise<CreditCardInvoice> {
  reopenLocalInvoice(cardId, year, month);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
  }

  if (!isSupabaseConfigured()) {
    const inv = getLocalInvoice(cardId, year, month);
    return inv!;
  }

  try {
    const { data, error } = await supabase
      .from('credit_card_invoices')
      .upsert(
        {
          credit_card_id: cardId,
          year,
          month,
          status: 'OPEN',
          paid_at: null,
        },
        { onConflict: 'credit_card_id,year,month' }
      )
      .select()
      .single();

    if (error || !data) {
      console.warn('Erro ao reabrir fatura no Supabase:', error);
      return getLocalInvoice(cardId, year, month)!;
    }

    return data as CreditCardInvoice;
  } catch (err) {
    console.warn('Erro de rede ao reabrir fatura no Supabase:', err);
    return getLocalInvoice(cardId, year, month)!;
  }
}

/**
 * Atualiza pontualmente a data de vencimento e/ou o postergamento de uma fatura específica.
 * Salva esse override no registro da fatura (card_invoices).
 * Se a nova data de vencimento for definida para o futuro ou a fatura for marcada como postergada,
 * o status da fatura DEVE alternar imediatamente de "ATRASADA" para "ABERTA".
 */
export async function updateInvoiceDueDate(
  cardId: string,
  year: number,
  month: number,
  dueDate: string | null,
  isPostponed: boolean = false
): Promise<CreditCardInvoice> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const localInv = getLocalInvoice(cardId, year, month);
  const isPaid = localInv?.status === 'PAID';

  let newStatus: InvoiceStatus = 'OPEN';
  if (isPaid) {
    newStatus = 'PAID';
  } else if (!isPostponed && dueDate) {
    const dueObj = parseLocalDate(dueDate);
    dueObj.setHours(0, 0, 0, 0);
    if (today.getTime() > dueObj.getTime()) {
      newStatus = 'OVERDUE';
    } else {
      newStatus = 'OPEN';
    }
  } else if (!isPostponed && !dueDate) {
    const cards = await getCreditCards();
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      const defaultDue = getInvoiceDueDate(card, year, month);
      defaultDue.setHours(0, 0, 0, 0);
      if (today.getTime() > defaultDue.getTime()) {
        newStatus = 'OVERDUE';
      } else {
        newStatus = 'OPEN';
      }
    }
  }

  const payload: CreditCardInvoiceInsert = {
    credit_card_id: cardId,
    year,
    month,
    due_date: dueDate,
    is_postponed: isPostponed,
    status: newStatus,
  };

  const saved = saveLocalInvoice(payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
  }

  if (!isSupabaseConfigured()) {
    return saved;
  }

  try {
    const { data, error } = await supabase
      .from('credit_card_invoices')
      .upsert(
        {
          credit_card_id: cardId,
          year,
          month,
          due_date: dueDate,
          is_postponed: isPostponed,
          status: newStatus,
        },
        { onConflict: 'credit_card_id,year,month' }
      )
      .select()
      .single();

    if (error || !data) {
      console.warn('Erro ao atualizar vencimento da fatura no Supabase:', error);
      return saved;
    }

    return data as CreditCardInvoice;
  } catch (err) {
    console.warn('Erro de rede ao atualizar vencimento no Supabase:', err);
    return saved;
  }
}
