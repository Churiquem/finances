import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createInstallmentGroup, deleteInstallment, updateInstallment } from './installments';
import {
  getPaidInvoicesCashOutflow,
  getCardsSummary,
  getCreditCards,
  calculateBillingMonth,
  getTransactionBillingMonth,
  type CardsSummary,
} from './cards';
import {
  getLocalCategories,
  addLocalCategory,
  updateLocalCategory,
  deleteLocalCategory as deleteLocalCat,
  getLocalTransactions,
  addLocalTransaction,
  updateLocalTransaction,
  deleteLocalTransaction,
  getLocalMonthSummary,
  saveLocalMonthSummary,
} from '@/lib/storage/offlineStorage';
import { subMonths } from 'date-fns';
import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  MonthSummary,
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionType,
} from '@/types/database';

export interface TransactionWithCategory extends Transaction {
  category?: Category | null;
}

export interface MonthBudgetSummary {
  year: number;
  month: number;
  monthSummaryId?: string;
  isClosed: boolean;

  // Saldo Inicial em Conta Corrente
  startingBalance: number;       // Saldo em conta herdado do mês anterior

  // Entradas em Conta Corrente
  totalAccountIncome: number;    // Salários + Extras + Rendimentos
  totalSalary: number;           // Apenas Salário
  totalExtraIncome: number;      // Entradas Extras / Rendimentos
  
  // Saídas da Conta Corrente (Fluxo de Caixa)
  totalCashOutflow: number;      // Despesas em Conta (Dinheiro/PIX) + Aportes em Conta + Faturas de Cartão Pagas
  cashExpenses: number;          // Despesas totais pagas em dinheiro/PIX (Fixas + Variáveis)
  cashFixedExpenses: number;     // Despesas fixas pagas em dinheiro/PIX
  cashVariableExpenses: number;  // Despesas variáveis pagas em dinheiro/PIX
  paidInvoicesAmount: number;    // Faturas pagas no mês (saída real da conta)
  
  // Saldo Real em Conta Corrente
  realAccountBalance: number;    // (startingBalance + totalAccountIncome) - totalCashOutflow

  // Consumo Total do Mês (Competência)
  totalMonthlyConsumption: number; // Despesas em Conta + Despesas no Cartão (Fixas + Variáveis) + Aportes
  cardExpenses: number;          // Compras no cartão no mês (Fixas + Variáveis)
  cardFixedExpenses: number;     // Despesas fixas no cartão
  cardVariableExpenses: number;  // Despesas variáveis no cartão
  totalInvestmentsOutflow: number; // Aportes de Investimentos

  // Fatura de Cartão do Mês
  monthInvoiceTotal: number;     // Valor total das faturas com competência neste mês
  monthInvoicePaid: number;      // Valor já pago das faturas deste mês
  monthInvoiceStatus: 'PAID' | 'OPEN' | 'OVERDUE' | 'NO_INVOICE';

  // Projeção de Sobra Livre
  projectedFreeBalance: number;  // (startingBalance + totalAccountIncome) - cashFixedExpenses - totalInvestmentsOutflow - monthInvoiceTotal

  // Compatibilidade com código legado e gráficos existentes
  totalIncome: number;           // = totalAccountIncome
  totalExpenses: number;         // = totalMonthlyConsumption
  totalFixedExpenses: number;    // = cashFixedExpenses + cardFixedExpenses
  totalVariableExpenses: number; // = cashVariableExpenses + cardVariableExpenses
  finalBalance: number;          // = realAccountBalance
  savingsRatePercentage: number; // % sobre receitas em conta
}

export interface MonthData {
  summary: MonthBudgetSummary;
  transactions: {
    fixedExpenses: TransactionWithCategory[];
    variableExpenses: TransactionWithCategory[];
    salary: TransactionWithCategory[];
    extraIncome: TransactionWithCategory[];
    investmentsOutflow: TransactionWithCategory[];
    all: TransactionWithCategory[];
  };
  categories: Category[];
}

/**
 * Retorna as datas de início e fim no formato YYYY-MM-DD para um mês/ano.
 */
export function getMonthDateRange(year: number, month: number) {
  const paddedMonth = String(month).padStart(2, '0');
  const startDate = `${year}-${paddedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

/**
 * Calcula o resumo financeiro a partir de uma lista de transações, saldo inicial,
 * faturas pagas no mês e resumo de faturas de cartões de crédito.
 */
export function calculateBudgetSummary(
  transactions: TransactionWithCategory[],
  startingBalance: number,
  year: number,
  month: number,
  isClosed = false,
  monthSummaryId?: string,
  paidInvoicesAmount = 0,
  cardSummary?: CardsSummary | null
): MonthBudgetSummary {
  let totalSalary = 0;
  let totalExtraIncome = 0;
  
  let cashFixedExpenses = 0;
  let cashVariableExpenses = 0;
  let cardFixedExpenses = 0;
  let cardVariableExpenses = 0;
  let totalInvestmentsOutflow = 0;

  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    const isCredit = t.payment_method === 'CREDIT' || Boolean(t.credit_card_id);

    switch (t.type) {
      case 'SALARY':
        totalSalary += amount;
        break;
      case 'EXTRA_INCOME':
      case 'INCOME':
        totalExtraIncome += amount;
        break;
      case 'FIXED_EXPENSE':
        if (isCredit) {
          cardFixedExpenses += amount;
        } else {
          cashFixedExpenses += amount;
        }
        break;
      case 'EXPENSE':
        if (isCredit) {
          cardVariableExpenses += amount;
        } else {
          cashVariableExpenses += amount;
        }
        break;
      case 'INVESTMENT_OUTFLOW':
        totalInvestmentsOutflow += amount;
        break;
    }
  }

  // 1. Entradas em Conta Corrente
  const totalAccountIncome = totalSalary + totalExtraIncome;

  // 2. Despesas em Conta vs Cartão
  const cashExpenses = cashFixedExpenses + cashVariableExpenses;
  const cardExpenses = cardFixedExpenses + cardVariableExpenses;

  // 3. Saídas da Conta Corrente (Fluxo de Caixa)
  const totalCashOutflow = cashExpenses + totalInvestmentsOutflow + paidInvoicesAmount;

  // 4. Saldo em Conta Real
  const realAccountBalance = (startingBalance + totalAccountIncome) - totalCashOutflow;

  // 5. Consumo Total do Mês (Competência)
  const totalMonthlyConsumption = cashExpenses + cardExpenses + totalInvestmentsOutflow;

  // 6. Fatura do Mês
  const monthInvoiceTotal = cardSummary ? cardSummary.totalInvoices : cardExpenses;
  const monthInvoicePaid = cardSummary ? cardSummary.totalPaid : 0;
  let monthInvoiceStatus: 'PAID' | 'OPEN' | 'OVERDUE' | 'NO_INVOICE' = 'NO_INVOICE';

  if (cardSummary && cardSummary.invoices.length > 0) {
    if (cardSummary.overdueCount > 0) {
      monthInvoiceStatus = 'OVERDUE';
    } else if (cardSummary.totalOpen <= 0) {
      monthInvoiceStatus = 'PAID';
    } else {
      monthInvoiceStatus = 'OPEN';
    }
  } else if (monthInvoiceTotal > 0) {
    monthInvoiceStatus = 'OPEN';
  }

  // 7. Projeção de Sobra Livre
  // Saldo Inicial + Entradas em Conta - Despesas Fixas em Conta - Fatura do Mês a Vencer/Paga - Aportes
  const projectedFreeBalance = (startingBalance + totalAccountIncome) - cashFixedExpenses - totalInvestmentsOutflow - monthInvoiceTotal;

  // Compatibilidade com cálculos e gráficos legados
  const totalIncome = totalAccountIncome;
  const totalExpenses = totalMonthlyConsumption;
  const totalFixedExpenses = cashFixedExpenses + cardFixedExpenses;
  const totalVariableExpenses = cashVariableExpenses + cardVariableExpenses;
  const finalBalance = realAccountBalance;

  const totalAvailable = totalAccountIncome + startingBalance;
  const savingsRatePercentage = totalAvailable > 0 ? (realAccountBalance / totalAvailable) * 100 : 0;

  return {
    year,
    month,
    monthSummaryId,
    isClosed,
    startingBalance,
    totalAccountIncome,
    totalSalary,
    totalExtraIncome,
    totalCashOutflow,
    cashExpenses,
    cashFixedExpenses,
    cashVariableExpenses,
    paidInvoicesAmount,
    realAccountBalance,
    totalMonthlyConsumption,
    cardExpenses,
    cardFixedExpenses,
    cardVariableExpenses,
    totalInvestmentsOutflow,
    monthInvoiceTotal,
    monthInvoicePaid,
    monthInvoiceStatus,
    projectedFreeBalance,
    totalIncome,
    totalExpenses,
    totalFixedExpenses,
    totalVariableExpenses,
    finalBalance,
    savingsRatePercentage,
  };
}

/**
 * Obtém ou calcula dinamicamente o Saldo Inicial (Sobra do Mês Passado)
 * Regra: Se o mês atual tiver starting_balance fixado em months_summary, utiliza.
 * Caso contrário, calcula dinamicamente a sobra líquida do mês anterior:
 * (Sobra Anterior + Receitas Anteriores - Saídas Anteriores).
 */
export async function getStartingBalanceForMonth(year: number, month: number): Promise<number> {
  if (!isSupabaseConfigured()) {
    const localSummary = getLocalMonthSummary(year, month);
    if (localSummary && (localSummary.is_closed || Number(localSummary.starting_balance) !== 0)) {
      return Number(localSummary.starting_balance);
    }
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevSummary = getLocalMonthSummary(prevYear, prevMonth);
    const prevStarting = Number(prevSummary?.starting_balance || 0);

    const { startDate: prevStart, endDate: prevEnd } = getMonthDateRange(prevYear, prevMonth);
    const prevTxs = getLocalTransactions().filter((t) => t.date >= prevStart && t.date <= prevEnd);
    const prevPaidInvoices = await getPaidInvoicesCashOutflow(prevYear, prevMonth);

    if (prevTxs.length === 0 && prevPaidInvoices === 0) return prevStarting;

    let prevIncome = 0;
    let prevCashExpenses = 0;
    for (const t of prevTxs) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'SALARY' || t.type === 'EXTRA_INCOME' || t.type === 'INCOME') {
        prevIncome += amt;
      } else if (
        t.type === 'FIXED_EXPENSE' ||
        t.type === 'EXPENSE' ||
        t.type === 'INVESTMENT_OUTFLOW'
      ) {
        const isCard = t.payment_method === 'CREDIT' || Boolean(t.credit_card_id);
        if (!isCard) {
          prevCashExpenses += amt;
        }
      }
    }
    return (prevStarting + prevIncome) - (prevCashExpenses + prevPaidInvoices);
  }

  try {
    // 1. Verifica se existe registro para o mês atual em months_summary
    const { data: currentSummary, error: currentErr } = await supabase
      .from('months_summary')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (!currentErr && currentSummary) {
      if (currentSummary.is_closed || Number(currentSummary.starting_balance) !== 0) {
        return Number(currentSummary.starting_balance);
      }
    }

    // 2. Rolagem Automática: calcular a sobra líquida do mês anterior (Fluxo de Caixa / Saldo Real)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    // Busca o months_summary do mês anterior
    const { data: prevSummary } = await supabase
      .from('months_summary')
      .select('*')
      .eq('year', prevYear)
      .eq('month', prevMonth)
      .maybeSingle();

    const prevStarting = Number(prevSummary?.starting_balance || 0);

    // Busca transações do mês anterior
    const { startDate: prevStart, endDate: prevEnd } = getMonthDateRange(prevYear, prevMonth);
    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('amount, type, payment_method, credit_card_id')
      .gte('date', prevStart)
      .lte('date', prevEnd);

    const prevPaidInvoices = await getPaidInvoicesCashOutflow(prevYear, prevMonth);

    if ((!prevTransactions || prevTransactions.length === 0) && prevPaidInvoices === 0) {
      return prevStarting;
    }

    let prevIncome = 0;
    let prevCashExpenses = 0;

    for (const t of prevTransactions || []) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'SALARY' || t.type === 'EXTRA_INCOME' || t.type === 'INCOME') {
        prevIncome += amt;
      } else if (
        t.type === 'FIXED_EXPENSE' ||
        t.type === 'EXPENSE' ||
        t.type === 'INVESTMENT_OUTFLOW'
      ) {
        const isCard = t.payment_method === 'CREDIT' || Boolean(t.credit_card_id);
        if (!isCard) {
          prevCashExpenses += amt;
        }
      }
    }

    // Sobra Líquida do Mês Anterior em Conta = (Sobra Anterior + Receitas - Saídas em Conta - Faturas Pagas)
    const dynamicPreviousLeftover = (prevStarting + prevIncome) - (prevCashExpenses + prevPaidInvoices);
    return dynamicPreviousLeftover;
  } catch (error) {
    console.warn('Erro ao calcular rolagem automática no Supabase, usando cálculo local:', error);
    const localSummary = getLocalMonthSummary(year, month);
    return Number(localSummary?.starting_balance || 0);
  }
}

/**
 * Busca todas as categorias cadastradas no banco ou localStorage.
 */
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return getLocalCategories();
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return getLocalCategories();
    }

    return data as Category[];
  } catch {
    return getLocalCategories();
  }
}

/**
 * Ordena uma lista de transações em ordem decrescente:
 * 1º critério: Data da transação (mais recente primeiro)
 * 2º critério de desempate: Data de criação (created_at) se existir
 */
export function sortTransactionsDesc<T extends { date: string; purchase_date?: string | null; created_at?: string }>(
  transactions: T[],
  currentYearMonth?: string
): T[] {
  return [...transactions].sort((a, b) => {
    const aDate = a.purchase_date || a.date;
    const bDate = b.purchase_date || b.date;

    if (currentYearMonth) {
      const aIsCurrentCycle = aDate.startsWith(currentYearMonth);
      const bIsCurrentCycle = bDate.startsWith(currentYearMonth);

      if (aIsCurrentCycle && !bIsCurrentCycle) return -1;
      if (!aIsCurrentCycle && bIsCurrentCycle) return 1;
    }

    // 1º critério: Data da transação (decrescente: mais recente primeiro)
    const dateDiff = new Date(bDate).getTime() - new Date(aDate).getTime();
    if (dateDiff !== 0) return dateDiff;

    // 2º critério de desempate: Data de criação (created_at) se existir
    if (b.created_at && a.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return 0;
  });
}

async function getLocalMonthData(
  year: number,
  month: number,
  startDate: string,
  endDate: string
): Promise<MonthData> {
  const categories = getLocalCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const startingBalance = await getStartingBalanceForMonth(year, month);
  const localSummary = getLocalMonthSummary(year, month);
  const cards = await getCreditCards();
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const targetBillingMonth = `${year}-${String(month).padStart(2, '0')}`;
  const raw = getLocalTransactions().filter((t) => {
    const card = t.credit_card_id ? cardMap.get(t.credit_card_id) : undefined;
    const bMonth = getTransactionBillingMonth(t, card);
    return bMonth === targetBillingMonth;
  });

  const transactions: TransactionWithCategory[] = sortTransactionsDesc(
    raw.map((t) => ({
      ...t,
      category: t.category_id ? catMap.get(t.category_id) || null : null,
    })),
    targetBillingMonth
  );

  const [paidInvoicesAmount, cardsSummary] = await Promise.all([
    getPaidInvoicesCashOutflow(year, month),
    getCardsSummary(year, month),
  ]);

  const summary = calculateBudgetSummary(
    transactions,
    startingBalance,
    year,
    month,
    localSummary?.is_closed ?? false,
    localSummary?.id,
    paidInvoicesAmount,
    cardsSummary
  );

  return {
    summary,
    transactions: {
      fixedExpenses: transactions.filter((t) => t.type === 'FIXED_EXPENSE'),
      variableExpenses: transactions.filter((t) => t.type === 'EXPENSE'),
      salary: transactions.filter((t) => t.type === 'SALARY'),
      extraIncome: transactions.filter((t) => t.type === 'EXTRA_INCOME' || t.type === 'INCOME'),
      investmentsOutflow: transactions.filter((t) => t.type === 'INVESTMENT_OUTFLOW'),
      all: transactions,
    },
    categories,
  };
}

/**
 * Carrega todos os dados do orçamento para um determinado mês/ano:
 * - Saldo Inicial (calculado ou persistido)
 * - Transações com categorias agrupadas
 * - Resumo consolidado do mês
 */
export async function getMonthData(year: number, month: number): Promise<MonthData> {
  const { startDate, endDate } = getMonthDateRange(year, month);

  if (!isSupabaseConfigured()) {
    return getLocalMonthData(year, month, startDate, endDate);
  }

  try {
    // 1. Busca resumo existente
    const { data: monthSummary } = await supabase
      .from('months_summary')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    // 2. Obtém saldo inicial
    const startingBalance = await getStartingBalanceForMonth(year, month);

    const targetBillingMonth = `${year}-${String(month).padStart(2, '0')}`;

    // Data de início estendida para abranger compras do ciclo anterior com corte no meio/início do mês
    const prevDate = new Date(year, month - 2, 1);
    const prevStartDate = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`;

    // 3. Busca transações do mês com relacionamento de categoria
    const { data: rawTransactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .or(`billing_month.eq.${targetBillingMonth},and(date.gte.${prevStartDate},date.lte.${endDate})`)
      .order('date', { ascending: false });

    const categories = await getCategories();

    if (txError || !rawTransactions) {
      return getLocalMonthData(year, month, startDate, endDate);
    }

    const cards = await getCreditCards();
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    const matchingRaw = (rawTransactions as any[]).filter((item) => {
      const card = item.credit_card_id ? cardMap.get(item.credit_card_id) : undefined;
      const bMonth = getTransactionBillingMonth(item, card);
      return bMonth === targetBillingMonth;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions: TransactionWithCategory[] = sortTransactionsDesc(
      matchingRaw.map((item) => ({
        ...item,
        category: item.category || null,
      })),
      targetBillingMonth
    );

    if (transactions.length === 0 && (!monthSummary || !monthSummary.is_closed)) {
      return getLocalMonthData(year, month, startDate, endDate);
    }

    const [paidInvoicesAmount, cardsSummary] = await Promise.all([
      getPaidInvoicesCashOutflow(year, month),
      getCardsSummary(year, month),
    ]);

    const summary = calculateBudgetSummary(
      transactions,
      startingBalance,
      year,
      month,
      monthSummary?.is_closed ?? false,
      monthSummary?.id,
      paidInvoicesAmount,
      cardsSummary
    );

    return {
      summary,
      transactions: {
        fixedExpenses: transactions.filter((t) => t.type === 'FIXED_EXPENSE'),
        variableExpenses: transactions.filter((t) => t.type === 'EXPENSE'),
        salary: transactions.filter((t) => t.type === 'SALARY'),
        extraIncome: transactions.filter((t) => t.type === 'EXTRA_INCOME' || t.type === 'INCOME'),
        investmentsOutflow: transactions.filter((t) => t.type === 'INVESTMENT_OUTFLOW'),
        all: transactions,
      },
      categories,
    };
  } catch (err) {
    console.warn('Falha ao buscar dados do mês via Supabase, usando localStorage:', err);
    return getLocalMonthData(year, month, startDate, endDate);
  }
}

export interface MonthlyComparisonData {
  year: number;
  month: number;
  label: string; // Ex: "Abr/26"
  income: number;
  expenses: number;
  balance: number;
}

const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Obtém o histórico comparativo dos últimos 6 meses até o mês selecionado.
 * Calcula dinamicamente Entradas, Saídas e Sobra Líquida real para cada mês.
 */
export async function getLast6MonthsComparison(
  targetYear: number,
  targetMonth: number
): Promise<MonthlyComparisonData[]> {
  const baseDate = new Date(targetYear, targetMonth - 1, 1);
  const monthsToFetch: Array<{ year: number; month: number; label: string }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = subMonths(baseDate, i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label = `${SHORT_MONTHS[m - 1]}/${String(y).slice(2)}`;
    monthsToFetch.push({ year: y, month: m, label });
  }

  try {
    const results = await Promise.all(
      monthsToFetch.map(async ({ year, month, label }) => {
        try {
          const mData = await getMonthData(year, month);
          const income = Math.round((mData.summary.totalIncome || 0) * 100) / 100;
          const expenses = Math.round((mData.summary.totalExpenses || 0) * 100) / 100;
          const balance = Math.round((income - expenses) * 100) / 100;

          return {
            year,
            month,
            label,
            income,
            expenses,
            balance,
          };
        } catch {
          return {
            year,
            month,
            label,
            income: 0,
            expenses: 0,
            balance: 0,
          };
        }
      })
    );

    return results;
  } catch (err) {
    console.warn('Erro ao buscar comparativo semestral:', err);
    return [];
  }
}

/**
 * Cria uma nova categoria.
 */
export async function createCategory(payload: CategoryInsert): Promise<Category | null> {
  let created: Category | null = null;

  if (!isSupabaseConfigured()) {
    created = addLocalCategory(payload);
  } else {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        console.warn('Erro ao criar categoria no Supabase, usando localStorage:', error);
        created = addLocalCategory(payload);
      } else {
        created = data as Category;
      }
    } catch (err) {
      console.warn('Falha de rede com Supabase, usando localStorage:', err);
      created = addLocalCategory(payload);
    }
  }

  if (created && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-categories-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
  }

  return created;
}

/**
 * Atualiza uma categoria existente.
 */
export async function updateCategory(id: string, payload: CategoryUpdate): Promise<Category | null> {
  const localUpdated = updateLocalCategory(id, payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-categories-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
  }

  if (!isSupabaseConfigured()) {
    return localUpdated;
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Erro ao atualizar categoria no Supabase:', error);
      return localUpdated;
    }
    return data;
  } catch (err) {
    console.warn('Falha ao atualizar categoria no Supabase:', err);
    return localUpdated;
  }
}

/**
 * Exclui uma categoria verificando se existem transações vinculadas.
 */
export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  let result: { success: boolean; error?: string };

  if (!isSupabaseConfigured()) {
    result = deleteLocalCat(id);
  } else {
    try {
      const { count, error: countErr } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);

      if (countErr) {
        console.warn('Erro ao verificar transações da categoria no Supabase:', countErr);
      }

      if (count && count > 0) {
        return {
          success: false,
          error: `Esta categoria não pode ser excluída pois possui ${count} lançamento(s) vinculado(s).`,
        };
      }

      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        result = deleteLocalCat(id);
      } else {
        result = { success: true };
      }
    } catch (err) {
      console.warn('Falha de rede com Supabase ao excluir categoria, tentando localmente:', err);
      result = deleteLocalCat(id);
    }
  }

  if (result.success && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-categories-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
  }

  return result;
}

/**
 * Cria ou atualiza o saldo inicial de um mês em months_summary.
 */
export async function saveMonthStartingBalance(
  year: number,
  month: number,
  startingBalance: number
): Promise<MonthSummary | null> {
  if (!isSupabaseConfigured()) {
    return saveLocalMonthSummary(year, month, startingBalance);
  }

  try {
    const { data, error } = await supabase
      .from('months_summary')
      .upsert(
        {
          year,
          month,
          starting_balance: startingBalance,
        },
        { onConflict: 'year,month' }
      )
      .select()
      .single();

    if (error) {
      return saveLocalMonthSummary(year, month, startingBalance);
    }
    return data;
  } catch {
    return saveLocalMonthSummary(year, month, startingBalance);
  }
}

/**
 * Cria uma nova transação associando ao mês correspondente.
 * Se tiver total_installments > 1, gera o parcelamento completo para os meses subsequentes.
 */
export async function createTransaction(
  payload: TransactionInsert
): Promise<Transaction | null> {
  let createdTx: Transaction | null = null;
  const toInsert: TransactionInsert = { ...payload };

  // Regra automática de corte pelo closing_day para cartões de crédito
  if (toInsert.credit_card_id) {
    const cards = await getCreditCards();
    const card = cards.find((c) => c.id === toInsert.credit_card_id);
    if (card) {
      const pDate = toInsert.purchase_date || toInsert.date || new Date().toISOString().split('T')[0];
      toInsert.billing_month = calculateBillingMonth(
        pDate,
        card.closing_day,
        toInsert.installment_number || 1
      );
    }
  }

  if (toInsert.total_installments && toInsert.total_installments > 1) {
    const created = await createInstallmentGroup({
      description: toInsert.description,
      amountPerInstallment: toInsert.amount,
      type: toInsert.type,
      categoryId: toInsert.category_id || null,
      startDate: toInsert.date || new Date().toISOString().split('T')[0],
      purchaseDate: toInsert.purchase_date || toInsert.date || new Date().toISOString().split('T')[0],
      totalInstallments: toInsert.total_installments,
      startInstallment: toInsert.installment_number || 1,
      paymentMethod: toInsert.payment_method,
      creditCardId: toInsert.credit_card_id,
    });
    createdTx = created[0] || null;
  } else if (!isSupabaseConfigured()) {
    createdTx = addLocalTransaction(toInsert);
  } else {
    try {
      const billingMonthToUse = toInsert.billing_month || (toInsert.date || new Date().toISOString()).substring(0, 7);
      const [bmYearStr, bmMonthStr] = billingMonthToUse.split('-');
      const year = Number(bmYearStr);
      const month = Number(bmMonthStr);

      // Garante que months_summary existe
      const { data: summary } = await supabase
        .from('months_summary')
        .upsert({ year, month }, { onConflict: 'year,month' })
        .select()
        .single();

      toInsert.month_summary_id = summary?.id || toInsert.month_summary_id;

      const { data, error } = await supabase
        .from('transactions')
        .insert(toInsert)
        .select()
        .single();

      if (error) {
        console.warn('Erro ao criar transação no Supabase, usando localStorage:', error);
        createdTx = addLocalTransaction(toInsert);
      } else {
        createdTx = data;
      }
    } catch (err) {
      console.warn('Falha de rede com Supabase, salvando em localStorage:', err);
      createdTx = addLocalTransaction(toInsert);
    }
  }

  if (createdTx && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }

  return createdTx;
}

/**
 * Atualiza uma transação existente.
 */
export async function updateTransaction(
  id: string,
  payload: TransactionUpdate
): Promise<Transaction | null> {
  const toUpdate = { ...payload };

  const existingTx = !isSupabaseConfigured()
    ? getLocalTransactions().find((t) => t.id === id)
    : (await supabase.from('transactions').select('*').eq('id', id).maybeSingle()).data;

  const cardId = payload.credit_card_id !== undefined ? payload.credit_card_id : existingTx?.credit_card_id;
  if (cardId) {
    const cards = await getCreditCards();
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      const pDate = payload.purchase_date || payload.date || existingTx?.purchase_date || existingTx?.date || new Date().toISOString().split('T')[0];
      const instNum = payload.installment_number ?? existingTx?.installment_number ?? 1;
      toUpdate.billing_month = calculateBillingMonth(pDate, card.closing_day, instNum);
    }
  }

  const effectiveDate = toUpdate.billing_month ? `${toUpdate.billing_month}-01` : (toUpdate.date || existingTx?.date);
  if (effectiveDate) {
    const txDate = new Date(effectiveDate);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;
    if (isSupabaseConfigured()) {
      try {
        const { data: summary } = await supabase
          .from('months_summary')
          .upsert({ year, month }, { onConflict: 'year,month' })
          .select()
          .single();
        if (summary) {
          toUpdate.month_summary_id = summary.id;
        }
      } catch (e) {
        console.warn('Erro ao verificar months_summary na atualização:', e);
      }
    }
  }

  let result: Transaction | null = null;

  if (!isSupabaseConfigured()) {
    result = updateLocalTransaction(id, toUpdate);
  } else {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(toUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        console.warn('Erro ao atualizar transação no Supabase, usando localStorage:', error);
        result = updateLocalTransaction(id, toUpdate);
      } else {
        updateLocalTransaction(id, toUpdate);
        result = data as Transaction;
      }
    } catch (err) {
      console.warn('Falha de rede com Supabase, usando localStorage:', err);
      result = updateLocalTransaction(id, toUpdate);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }

  return result;
}

/**
 * Atualiza uma transação individual ou em lote (caso seja parcelada).
 */
export async function updateTransactionWithScope(
  id: string,
  payload: TransactionUpdate,
  groupId: string | null = null,
  installmentNumber: number | null = null,
  updateMode: 'SINGLE' | 'FUTURE' = 'SINGLE'
): Promise<Transaction | null> {
  if (groupId && updateMode !== 'SINGLE') {
    await updateInstallment(id, groupId, installmentNumber, payload, updateMode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finances-data-changed'));
      window.dispatchEvent(new CustomEvent('finance:transaction-created'));
      window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    }
    return null;
  }

  return updateTransaction(id, payload);
}

/**
 * Remove uma transação pelo ID com suporte a exclusão em lote de parcelas.
 */
export async function deleteTransaction(
  id: string,
  groupId: string | null = null,
  installmentNumber: number | null = null,
  deleteMode: 'SINGLE' | 'FUTURE' | 'ALL' = 'SINGLE'
): Promise<boolean> {
  let success = false;

  if (groupId && deleteMode !== 'SINGLE') {
    success = await deleteInstallment(id, groupId, installmentNumber, deleteMode);
  } else if (!isSupabaseConfigured()) {
    success = deleteLocalTransaction(id);
  } else {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao deletar transação no Supabase, usando localStorage:', error);
        success = deleteLocalTransaction(id);
      } else {
        success = true;
      }
    } catch (err) {
      console.warn('Falha de rede com Supabase, deletando em localStorage:', err);
      success = deleteLocalTransaction(id);
    }
  }

  if (success && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }

  return success;
}

