import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  MonthSummary,
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  LoanReceivable,
  LoanReceivableInsert,
  LoanReceivableUpdate,
  Investment,
  InvestmentInsert,
  InvestmentUpdate,
  InvestmentYieldHistory,
  CreditCard,
  CreditCardInsert,
  CreditCardUpdate,
  CreditCardInvoice,
  CreditCardInvoiceInsert,
  CreditCardInvoiceUpdate,
} from '@/types/database';

const KEYS = {
  CATEGORIES: 'finances_categories',
  TRANSACTIONS: 'finances_transactions',
  MONTHS_SUMMARY: 'finances_months_summary',
  RECEIVABLES: 'finances_receivables',
  INVESTMENTS: 'finances_investments',
  YIELD_HISTORY: 'finances_yield_history',
  CREDIT_CARDS: 'finances_credit_cards',
  INVOICES: 'finances_invoices',
  INITIALIZED: 'finances_initialized',
};

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function getItem<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Erro ao ler ${key} do localStorage:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Erro ao gravar ${key} no localStorage:`, e);
  }
}

// -----------------------------------------------------------------------------
// DADOS DEFAULT INICIAIS
// -----------------------------------------------------------------------------

export function getDefaultCategories(): Category[] {
  return [
    { id: 'cat-1', name: 'Salário', type: 'INCOME', color_hex: '#10B981', icon: 'briefcase', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-2', name: 'Renda Extra', type: 'INCOME', color_hex: '#059669', icon: 'trending-up', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-3', name: 'Aluguel & Moradia', type: 'FIXED_EXPENSE', color_hex: '#3B82F6', icon: 'home', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-4', name: 'Internet & Luz', type: 'FIXED_EXPENSE', color_hex: '#60A5FA', icon: 'zap', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-5', name: 'Streaming & Assinaturas', type: 'FIXED_EXPENSE', color_hex: '#818CF8', icon: 'tv', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-6', name: 'Alimentação & Mercado', type: 'EXPENSE', color_hex: '#F59E0B', icon: 'shopping-cart', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-7', name: 'Transporte & Combustível', type: 'EXPENSE', color_hex: '#EF4444', icon: 'car', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-8', name: 'Lazer & Restaurantes', type: 'EXPENSE', color_hex: '#8B5CF6', icon: 'coffee', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-9', name: 'Reserva & Aportes', type: 'EXPENSE', color_hex: '#14B8A6', icon: 'pie-chart', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-10', name: 'Compras & Eletrônicos', type: 'EXPENSE', color_hex: '#EC4899', icon: 'shopping-bag', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'cat-11', name: 'Saúde & Cuidados', type: 'EXPENSE', color_hex: '#06B6D4', icon: 'smile', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
}

export function getDefaultCreditCards(): CreditCard[] {
  return [
    {
      id: 'card-1',
      name: 'Nubank Ultravioleta',
      limit_amount: 5000.00,
      closing_day: 25,
      due_day: 3,
      color_hex: '#8B5CF6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'card-2',
      name: 'Inter Mastercard Black',
      limit_amount: 8000.00,
      closing_day: 28,
      due_day: 5,
      color_hex: '#F97316',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export function getDefaultTransactions(): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'tx-seed-1',
      description: 'Salário Mensal',
      amount: 8500.00,
      type: 'SALARY',
      category_id: 'cat-1',
      date: `${year}-${month}-05`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-2',
      description: 'Consultoria Freelance Dev',
      amount: 1450.00,
      type: 'EXTRA_INCOME',
      category_id: 'cat-2',
      date: `${year}-${month}-15`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-3',
      description: 'Aluguel do Apartamento',
      amount: 2200.00,
      type: 'FIXED_EXPENSE',
      category_id: 'cat-3',
      date: `${year}-${month}-10`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-4',
      description: 'Conta de Luz (Enel)',
      amount: 195.40,
      type: 'FIXED_EXPENSE',
      category_id: 'cat-4',
      date: `${year}-${month}-12`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-5',
      description: 'Internet Fibra 600MB',
      amount: 129.90,
      type: 'FIXED_EXPENSE',
      category_id: 'cat-4',
      date: `${year}-${month}-15`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-6',
      description: 'Netflix + Spotify + YouTube Premium',
      amount: 98.70,
      type: 'FIXED_EXPENSE',
      category_id: 'cat-5',
      date: `${year}-${month}-08`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CREDIT',
      credit_card_id: 'card-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-7',
      description: 'Supermercado Mensal',
      amount: 1380.25,
      type: 'EXPENSE',
      category_id: 'cat-6',
      date: `${year}-${month}-06`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-8',
      description: 'Combustível Posto Shell',
      amount: 320.00,
      type: 'EXPENSE',
      category_id: 'cat-7',
      date: `${year}-${month}-11`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-9',
      description: 'Jantar Restaurante Italiano',
      amount: 245.00,
      type: 'EXPENSE',
      category_id: 'cat-8',
      date: `${year}-${month}-14`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CREDIT',
      credit_card_id: 'card-2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-seed-10',
      description: 'Aporte Tesouro Selic 2029',
      amount: 1500.00,
      type: 'INVESTMENT_OUTFLOW',
      category_id: 'cat-9',
      date: `${year}-${month}-07`,
      month_summary_id: 'ms-local',
      installment_group_id: null,
      installment_number: null,
      total_installments: null,
      payment_method: 'CASH',
      credit_card_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export function getDefaultReceivables(): LoanReceivable[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'rec-1',
      debtor_name: 'Lucas Martins (Amigo)',
      amount: 450.00,
      due_date: `${year}-${month}-20`,
      status: 'PENDING',
      reminder_date: `${year}-${month}-18`,
      notes: 'Empréstimo para conserto do carro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rec-2',
      debtor_name: 'Mariana Silva',
      amount: 1200.00,
      due_date: `${year}-${month}-05`,
      status: 'OVERDUE',
      reminder_date: `${year}-${month}-04`,
      notes: 'Divisão de custos da viagem de férias',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'rec-3',
      debtor_name: 'Carlos Eduardo (Irmão)',
      amount: 800.00,
      due_date: `${year}-${month}-12`,
      status: 'PAID',
      reminder_date: null,
      notes: 'Parcela da compra compartilhada',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export function getDefaultInvestments(): Investment[] {
  return [
    {
      id: 'inv-1',
      institution_name: 'Nubank (NuInvest)',
      asset_name: 'Caixinha Reserva de Emergência',
      asset_type: 'Reserva de Emergência',
      total_invested: 12000.00,
      current_balance: 13180.50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-2',
      institution_name: 'Tesouro Direto',
      asset_name: 'Tesouro Selic 2029',
      asset_type: 'Renda Fixa Pública',
      total_invested: 15000.00,
      current_balance: 16740.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-3',
      institution_name: 'XP Investimentos',
      asset_name: 'CDB Banco Master 120% CDI',
      asset_type: 'Renda Fixa Privada',
      total_invested: 8000.00,
      current_balance: 8960.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-4',
      institution_name: 'BTG Pactual',
      asset_name: 'IVVB11 (S&P 500 ETF)',
      asset_type: 'ETFs Internacionais',
      total_invested: 5000.00,
      current_balance: 5850.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export function getDefaultYieldHistory(): InvestmentYieldHistory[] {
  return [
    {
      id: 'y-1',
      investment_id: 'inv-1',
      month_year: '2026-08',
      yield_amount: 115.40,
      yield_percentage: 0.88,
      created_at: new Date().toISOString(),
    },
    {
      id: 'y-2',
      investment_id: 'inv-2',
      month_year: '2026-08',
      yield_amount: 142.80,
      yield_percentage: 0.86,
      created_at: new Date().toISOString(),
    },
    {
      id: 'y-3',
      investment_id: 'inv-3',
      month_year: '2026-08',
      yield_amount: 82.50,
      yield_percentage: 0.93,
      created_at: new Date().toISOString(),
    },
  ];
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE CATEGORIAS
// -----------------------------------------------------------------------------

export function getLocalCategories(): Category[] {
  const existing = getItem<Category[] | null>(KEYS.CATEGORIES, null);
  if (!existing || existing.length === 0) {
    const defaults = getDefaultCategories();
    setItem(KEYS.CATEGORIES, defaults);
    return defaults;
  }
  return existing;
}

export function saveLocalCategories(categories: Category[]): void {
  setItem(KEYS.CATEGORIES, categories);
}

export function addLocalCategory(payload: CategoryInsert): Category {
  const list = getLocalCategories();
  const newCat: Category = {
    id: crypto.randomUUID(),
    name: payload.name,
    type: payload.type,
    color_hex: payload.color_hex || '#10b981',
    icon: payload.icon || 'tag',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  list.push(newCat);
  saveLocalCategories(list);
  return newCat;
}

export function updateLocalCategory(id: string, payload: CategoryUpdate): Category | null {
  const list = getLocalCategories();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  saveLocalCategories(list);
  return list[idx];
}

export function deleteLocalCategory(id: string): { success: boolean; error?: string } {
  const txs = getLocalTransactions();
  const linked = txs.filter((t) => t.category_id === id);
  if (linked.length > 0) {
    return {
      success: false,
      error: `Esta categoria não pode ser excluída pois possui ${linked.length} lançamento(s) vinculado(s).`,
    };
  }
  const list = getLocalCategories().filter((c) => c.id !== id);
  saveLocalCategories(list);
  return { success: true };
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE TRANSAÇÕES
// -----------------------------------------------------------------------------

export function calculateBillingMonth(
  purchaseDateStr: string,
  closingDay: number,
  installmentNumber: number = 1
): string {
  const cleanDate = (purchaseDateStr || '').split('T')[0];
  const [yearStr, monthStr, dayStr] = cleanDate.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return cleanDate.substring(0, 7);
  }

  // Se o dia da compra for MAIOR que o fechamento, avança a competência para o mês seguinte
  if (day > closingDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  // Se for uma parcela subsequente (ex: parcela 2, 3...), projeta os meses adicionais
  if (installmentNumber > 1) {
    const additionalMonths = installmentNumber - 1;
    month += additionalMonths;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

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

export function getLocalTransactions(): Transaction[] {
  const isInit = getItem<boolean>(KEYS.INITIALIZED, false);
  const existing = getItem<Transaction[] | null>(KEYS.TRANSACTIONS, null);
  if (existing === null && !isInit) {
    const defaults = getDefaultTransactions();
    setItem(KEYS.TRANSACTIONS, defaults);
    setItem(KEYS.INITIALIZED, true);
    return sortTransactionsDesc(defaults);
  }
  return sortTransactionsDesc(existing || []);
}

export function saveLocalTransactions(txs: Transaction[]): void {
  setItem(KEYS.TRANSACTIONS, txs);
}

export function addLocalTransaction(payload: TransactionInsert): Transaction {
  const list = getLocalTransactions();
  const txDate = payload.date || new Date().toISOString().split('T')[0];
  const purchaseDate = payload.purchase_date || txDate;

  let billingMonth = payload.billing_month;
  if (!billingMonth && payload.credit_card_id) {
    const cards = getLocalCreditCards();
    const card = cards.find((c) => c.id === payload.credit_card_id);
    if (card) {
      billingMonth = calculateBillingMonth(
        purchaseDate,
        card.closing_day,
        payload.installment_number || 1
      );
    }
  }
  if (!billingMonth) {
    billingMonth = txDate.substring(0, 7);
  }

  const newTx: Transaction = {
    id: crypto.randomUUID(),
    description: payload.description,
    amount: Number(payload.amount),
    type: payload.type,
    category_id: payload.category_id || null,
    date: txDate,
    purchase_date: purchaseDate,
    billing_month: billingMonth,
    month_summary_id: payload.month_summary_id || 'ms-local',
    installment_group_id: payload.installment_group_id || null,
    installment_number: payload.installment_number ?? null,
    total_installments: payload.total_installments ?? null,
    payment_method: payload.payment_method || 'CASH',
    credit_card_id: payload.credit_card_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  list.unshift(newTx);
  saveLocalTransactions(list);
  return newTx;
}

export function updateLocalTransaction(id: string, payload: TransactionUpdate): Transaction | null {
  const list = getLocalTransactions();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const current = list[idx];
  const updatedDate = payload.date || current.date;
  const updatedPurchaseDate = payload.purchase_date || payload.date || current.purchase_date || updatedDate;
  const updatedCardId = payload.credit_card_id !== undefined ? payload.credit_card_id : current.credit_card_id;

  let billingMonth = payload.billing_month !== undefined ? payload.billing_month : current.billing_month;

  if (updatedCardId && (payload.date || payload.purchase_date || payload.credit_card_id)) {
    const cards = getLocalCreditCards();
    const card = cards.find((c) => c.id === updatedCardId);
    if (card) {
      const instNum = payload.installment_number ?? current.installment_number ?? 1;
      billingMonth = calculateBillingMonth(updatedPurchaseDate, card.closing_day, instNum);
    }
  }

  list[idx] = {
    ...current,
    ...payload,
    date: updatedDate,
    purchase_date: updatedPurchaseDate,
    billing_month: billingMonth,
    updated_at: new Date().toISOString(),
  };
  saveLocalTransactions(list);
  return list[idx];
}

export function deleteLocalTransaction(id: string): boolean {
  const list = getLocalTransactions();
  const filtered = list.filter((t) => t.id !== id);
  saveLocalTransactions(filtered);
  return true;
}

export function deleteLocalInstallments(
  transactionId: string,
  groupId: string | null,
  installmentNumber: number | null,
  deleteMode: 'SINGLE' | 'FUTURE' | 'ALL' = 'SINGLE'
): boolean {
  const list = getLocalTransactions();
  if (!groupId || deleteMode === 'SINGLE') {
    saveLocalTransactions(list.filter((t) => t.id !== transactionId));
    return true;
  }
  if (deleteMode === 'ALL') {
    saveLocalTransactions(list.filter((t) => t.installment_group_id !== groupId));
    return true;
  }
  if (deleteMode === 'FUTURE' && installmentNumber !== null) {
    saveLocalTransactions(
      list.filter(
        (t) =>
          !(
            t.installment_group_id === groupId &&
            t.installment_number !== null &&
            t.installment_number >= installmentNumber
          )
      )
    );
    return true;
  }
  return false;
}

export function updateLocalInstallments(
  transactionId: string,
  groupId: string | null,
  installmentNumber: number | null,
  updates: Partial<TransactionUpdate>,
  updateMode: 'SINGLE' | 'FUTURE' = 'SINGLE'
): boolean {
  const list = getLocalTransactions();
  if (!groupId || updateMode === 'SINGLE') {
    const idx = list.findIndex((t) => t.id === transactionId);
    if (idx === -1) return false;
    list[idx] = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveLocalTransactions(list);
    return true;
  }

  if (updateMode === 'FUTURE' && installmentNumber !== null) {
    const cleanDescription = updates.description
      ? updates.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
      : null;

    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (
        t.installment_group_id === groupId &&
        t.installment_number !== null &&
        t.installment_number >= installmentNumber
      ) {
        const itemUpdates: Partial<TransactionUpdate> = { ...updates };
        if (cleanDescription && t.total_installments) {
          itemUpdates.description = `${cleanDescription} (${t.installment_number}/${t.total_installments})`;
        }
        // Para parcelas futuras diferentes da atual, mantém o mês original de cada uma
        if (t.id !== transactionId && updates.date) {
          delete itemUpdates.date;
        }

        list[i] = {
          ...list[i],
          ...itemUpdates,
          updated_at: new Date().toISOString(),
        };
      }
    }
    saveLocalTransactions(list);
    return true;
  }

  return false;
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE MONTHS_SUMMARY
// -----------------------------------------------------------------------------

export function getLocalMonthsSummary(): MonthSummary[] {
  return getItem<MonthSummary[]>(KEYS.MONTHS_SUMMARY, []);
}

export function getLocalMonthSummary(year: number, month: number): MonthSummary | null {
  const list = getLocalMonthsSummary();
  return list.find((m) => m.year === year && m.month === month) || null;
}

export function saveLocalMonthSummary(
  year: number,
  month: number,
  startingBalance: number,
  isClosed = false
): MonthSummary {
  const list = getLocalMonthsSummary();
  const existingIdx = list.findIndex((m) => m.year === year && m.month === month);

  const item: MonthSummary = {
    id: existingIdx >= 0 ? list[existingIdx].id : crypto.randomUUID(),
    year,
    month,
    starting_balance: startingBalance,
    is_closed: isClosed,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = item;
  } else {
    list.push(item);
  }
  setItem(KEYS.MONTHS_SUMMARY, list);
  return item;
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE VALORES A RECEBER
// -----------------------------------------------------------------------------

export function getLocalReceivables(): LoanReceivable[] {
  const isInit = getItem<boolean>(KEYS.INITIALIZED, false);
  const existing = getItem<LoanReceivable[] | null>(KEYS.RECEIVABLES, null);
  if (existing === null && !isInit) {
    const defaults = getDefaultReceivables();
    setItem(KEYS.RECEIVABLES, defaults);
    setItem(KEYS.INITIALIZED, true);
    return defaults;
  }
  return existing || [];
}

export function saveLocalReceivables(recs: LoanReceivable[]): void {
  setItem(KEYS.RECEIVABLES, recs);
}

export function addLocalReceivable(payload: LoanReceivableInsert): LoanReceivable {
  const list = getLocalReceivables();
  const newRec: LoanReceivable = {
    id: crypto.randomUUID(),
    debtor_name: payload.debtor_name,
    amount: Number(payload.amount),
    due_date: payload.due_date,
    status: payload.status || 'PENDING',
    reminder_date: payload.reminder_date || null,
    notes: payload.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  list.unshift(newRec);
  saveLocalReceivables(list);
  return newRec;
}

export function updateLocalReceivable(id: string, payload: LoanReceivableUpdate): LoanReceivable | null {
  const list = getLocalReceivables();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  saveLocalReceivables(list);
  return list[idx];
}

export function deleteLocalReceivable(id: string): boolean {
  const list = getLocalReceivables();
  saveLocalReceivables(list.filter((r) => r.id !== id));
  return true;
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE INVESTIMENTOS
// -----------------------------------------------------------------------------

export function getLocalInvestments(): Investment[] {
  const isInit = getItem<boolean>(KEYS.INITIALIZED, false);
  const existing = getItem<Investment[] | null>(KEYS.INVESTMENTS, null);
  if (existing === null && !isInit) {
    const defaults = getDefaultInvestments();
    setItem(KEYS.INVESTMENTS, defaults);
    setItem(KEYS.INITIALIZED, true);
    return defaults;
  }
  return existing || [];
}

export function saveLocalInvestments(invs: Investment[]): void {
  setItem(KEYS.INVESTMENTS, invs);
}

export function addLocalInvestment(payload: InvestmentInsert): Investment {
  const list = getLocalInvestments();
  const newInv: Investment = {
    id: crypto.randomUUID(),
    institution_name: payload.institution_name,
    asset_name: payload.asset_name,
    asset_type: payload.asset_type,
    total_invested: Number(payload.total_invested) || 0,
    current_balance: Number(payload.current_balance) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  list.unshift(newInv);
  saveLocalInvestments(list);
  return newInv;
}

export function updateLocalInvestment(id: string, payload: InvestmentUpdate): Investment | null {
  const list = getLocalInvestments();
  const idx = list.findIndex((inv) => inv.id === id);
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  saveLocalInvestments(list);
  return list[idx];
}

export function deleteLocalInvestment(id: string): boolean {
  const list = getLocalInvestments();
  saveLocalInvestments(list.filter((inv) => inv.id !== id));
  return true;
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE HISTÓRICO DE RENDIMENTO
// -----------------------------------------------------------------------------

export function getLocalYieldHistory(): InvestmentYieldHistory[] {
  const isInit = getItem<boolean>(KEYS.INITIALIZED, false);
  const existing = getItem<InvestmentYieldHistory[] | null>(KEYS.YIELD_HISTORY, null);
  if (existing === null && !isInit) {
    const defaults = getDefaultYieldHistory();
    setItem(KEYS.YIELD_HISTORY, defaults);
    setItem(KEYS.INITIALIZED, true);
    return defaults;
  }
  return existing || [];
}

export function saveLocalYieldHistory(history: InvestmentYieldHistory[]): void {
  setItem(KEYS.YIELD_HISTORY, history);
}

export function addLocalYieldHistory(
  investmentId: string,
  monthYear: string,
  yieldAmount: number,
  yieldPercentage: number
): InvestmentYieldHistory {
  const list = getLocalYieldHistory();
  const existingIdx = list.findIndex(
    (y) => y.investment_id === investmentId && y.month_year === monthYear
  );

  const entry: InvestmentYieldHistory = {
    id: existingIdx >= 0 ? list[existingIdx].id : crypto.randomUUID(),
    investment_id: investmentId,
    month_year: monthYear,
    yield_amount: yieldAmount,
    yield_percentage: yieldPercentage,
    created_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = entry;
  } else {
    list.unshift(entry);
  }
  saveLocalYieldHistory(list);
  return entry;
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE CARTÕES DE CRÉDITO E FATURAS
// -----------------------------------------------------------------------------

export function getLocalCreditCards(): CreditCard[] {
  const isInit = getItem<boolean>(KEYS.INITIALIZED, false);
  const existing = getItem<CreditCard[] | null>(KEYS.CREDIT_CARDS, null);
  if (existing === null && !isInit) {
    const defaults = getDefaultCreditCards();
    setItem(KEYS.CREDIT_CARDS, defaults);
    return defaults;
  }
  if (!existing || existing.length === 0) {
    if (existing === null) {
      const defaults = getDefaultCreditCards();
      setItem(KEYS.CREDIT_CARDS, defaults);
      return defaults;
    }
  }
  return existing || [];
}

export function saveLocalCreditCards(cards: CreditCard[]): void {
  setItem(KEYS.CREDIT_CARDS, cards);
  if (isClient()) {
    window.dispatchEvent(new CustomEvent('finances-cards-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
  }
}

export function addLocalCreditCard(payload: CreditCardInsert): CreditCard {
  const list = getLocalCreditCards();
  const newCard: CreditCard = {
    id: crypto.randomUUID(),
    name: payload.name,
    limit_amount: Number(payload.limit_amount) || 0,
    closing_day: Number(payload.closing_day) || 1,
    due_day: Number(payload.due_day) || 10,
    color_hex: payload.color_hex || '#8B5CF6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  list.push(newCard);
  saveLocalCreditCards(list);
  return newCard;
}

export function updateLocalCreditCard(id: string, payload: CreditCardUpdate): CreditCard | null {
  const list = getLocalCreditCards();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...payload,
    limit_amount: payload.limit_amount !== undefined ? Number(payload.limit_amount) : list[idx].limit_amount,
    closing_day: payload.closing_day !== undefined ? Number(payload.closing_day) : list[idx].closing_day,
    due_day: payload.due_day !== undefined ? Number(payload.due_day) : list[idx].due_day,
    updated_at: new Date().toISOString(),
  };
  saveLocalCreditCards(list);
  return list[idx];
}

export function deleteLocalCreditCard(id: string): { success: boolean; error?: string } {
  const txs = getLocalTransactions();
  const linked = txs.filter((t) => t.credit_card_id === id);
  if (linked.length > 0) {
    return {
      success: false,
      error: `Este cartão possui ${linked.length} transação(ões) vinculada(s). Remova ou reatribua as transações primeiro.`,
    };
  }
  const filtered = getLocalCreditCards().filter((c) => c.id !== id);
  saveLocalCreditCards(filtered);
  return { success: true };
}

export function getLocalInvoices(): CreditCardInvoice[] {
  return getItem<CreditCardInvoice[]>(KEYS.INVOICES, []);
}

export function saveLocalInvoices(invoices: CreditCardInvoice[]): void {
  setItem(KEYS.INVOICES, invoices);
  if (isClient()) {
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
  }
}

export function getLocalInvoice(cardId: string, year: number, month: number): CreditCardInvoice | null {
  const invoices = getLocalInvoices();
  return invoices.find((inv) => inv.credit_card_id === cardId && inv.year === year && inv.month === month) || null;
}

export function saveLocalInvoice(invoice: CreditCardInvoiceInsert | CreditCardInvoice): CreditCardInvoice {
  const invoices = getLocalInvoices();
  const idx = invoices.findIndex(
    (inv) => inv.credit_card_id === invoice.credit_card_id && inv.year === invoice.year && inv.month === invoice.month
  );

  let updatedInvoice: CreditCardInvoice;
  if (idx >= 0) {
    updatedInvoice = {
      ...invoices[idx],
      ...invoice,
      due_date: invoice.due_date !== undefined ? invoice.due_date : invoices[idx].due_date,
      is_postponed: invoice.is_postponed !== undefined ? invoice.is_postponed : invoices[idx].is_postponed,
      updated_at: new Date().toISOString(),
    };
    invoices[idx] = updatedInvoice;
  } else {
    updatedInvoice = {
      id: 'id' in invoice && invoice.id ? invoice.id : crypto.randomUUID(),
      credit_card_id: invoice.credit_card_id,
      month: invoice.month,
      year: invoice.year,
      status: invoice.status || 'OPEN',
      due_date: invoice.due_date || null,
      is_postponed: invoice.is_postponed ?? false,
      paid_at: invoice.paid_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    invoices.push(updatedInvoice);
  }
  saveLocalInvoices(invoices);
  return updatedInvoice;
}

export function markLocalInvoicePaid(cardId: string, year: number, month: number): CreditCardInvoice {
  return saveLocalInvoice({
    credit_card_id: cardId,
    year,
    month,
    status: 'PAID',
    paid_at: new Date().toISOString(),
  });
}

export function reopenLocalInvoice(cardId: string, year: number, month: number): CreditCardInvoice {
  return saveLocalInvoice({
    credit_card_id: cardId,
    year,
    month,
    status: 'OPEN',
    paid_at: null,
  });
}

// -----------------------------------------------------------------------------
// OPERAÇÕES DE BACKUP, IMPORTAÇÃO E RESET
// -----------------------------------------------------------------------------

export interface FinancesBackupFile {
  version: number;
  exportedAt: string;
  finances_categories?: Category[];
  categories?: Category[];
  finances_transactions?: Transaction[];
  transactions?: Transaction[];
  finances_months_summary?: MonthSummary[];
  monthsSummary?: MonthSummary[];
  finances_receivables?: LoanReceivable[];
  receivables?: LoanReceivable[];
  finances_investments?: Investment[];
  investments?: Investment[];
  finances_yield_history?: InvestmentYieldHistory[];
  yieldHistory?: InvestmentYieldHistory[];
  finances_credit_cards?: CreditCard[];
  creditCards?: CreditCard[];
  finances_invoices?: CreditCardInvoice[];
  invoices?: CreditCardInvoice[];
}

export function exportBackupData(): string {
  const backup: FinancesBackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    finances_categories: getLocalCategories(),
    finances_transactions: getLocalTransactions(),
    finances_months_summary: getLocalMonthsSummary(),
    finances_receivables: getLocalReceivables(),
    finances_investments: getLocalInvestments(),
    finances_yield_history: getLocalYieldHistory(),
    finances_credit_cards: getLocalCreditCards(),
    finances_invoices: getLocalInvoices(),
  };
  return JSON.stringify(backup, null, 2);
}

export function importBackupData(jsonString: string): {
  success: boolean;
  message: string;
  counts?: { transactions: number; categories: number; months: number; receivables: number; investments: number; creditCards?: number; invoices?: number };
} {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Arquivo JSON inválido.' };
    }

    const categories = data.finances_categories || data.categories;
    const transactions = data.finances_transactions || data.transactions;
    const monthsSummary = data.finances_months_summary || data.monthsSummary;
    const receivables = data.finances_receivables || data.receivables;
    const investments = data.finances_investments || data.investments;
    const yieldHistory = data.finances_yield_history || data.yieldHistory;
    const creditCards = data.finances_credit_cards || data.creditCards;
    const invoices = data.finances_invoices || data.invoices;

    if (!Array.isArray(transactions) && !Array.isArray(monthsSummary) && !Array.isArray(categories)) {
      return { success: false, message: 'O arquivo não contém dados compatíveis com o Finances.' };
    }

    if (Array.isArray(categories) && categories.length > 0) {
      saveLocalCategories(categories);
    }
    if (Array.isArray(transactions)) {
      saveLocalTransactions(transactions);
    }
    if (Array.isArray(monthsSummary)) {
      setItem(KEYS.MONTHS_SUMMARY, monthsSummary);
    }
    if (Array.isArray(receivables)) {
      saveLocalReceivables(receivables);
    }
    if (Array.isArray(investments)) {
      saveLocalInvestments(investments);
    }
    if (Array.isArray(yieldHistory)) {
      saveLocalYieldHistory(yieldHistory);
    }
    if (Array.isArray(creditCards) && creditCards.length > 0) {
      saveLocalCreditCards(creditCards);
    }
    if (Array.isArray(invoices)) {
      saveLocalInvoices(invoices);
    }

    setItem(KEYS.INITIALIZED, true);

    if (isClient()) {
      window.dispatchEvent(new CustomEvent('finances-data-changed'));
      window.dispatchEvent(new CustomEvent('finance:transaction-created'));
      window.dispatchEvent(new CustomEvent('finances-cards-changed'));
      window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    }

    return {
      success: true,
      message: 'Backup importado com sucesso!',
      counts: {
        transactions: Array.isArray(transactions) ? transactions.length : 0,
        categories: Array.isArray(categories) ? categories.length : 0,
        months: Array.isArray(monthsSummary) ? monthsSummary.length : 0,
        receivables: Array.isArray(receivables) ? receivables.length : 0,
        investments: Array.isArray(investments) ? investments.length : 0,
        creditCards: Array.isArray(creditCards) ? creditCards.length : 0,
        invoices: Array.isArray(invoices) ? invoices.length : 0,
      },
    };
  } catch (err) {
    console.error('Erro ao importar backup:', err);
    return { success: false, message: 'Falha ao processar arquivo de backup: formato JSON corrompido.' };
  }
}

export function clearAllData(keepCategories = true): void {
  saveLocalTransactions([]);
  setItem(KEYS.MONTHS_SUMMARY, []);
  saveLocalReceivables([]);
  saveLocalInvestments([]);
  saveLocalYieldHistory([]);
  saveLocalInvoices([]);
  saveLocalCreditCards(getDefaultCreditCards());
  setItem(KEYS.INITIALIZED, true);

  if (!keepCategories) {
    saveLocalCategories(getDefaultCategories());
  }

  if (isClient()) {
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
    window.dispatchEvent(new CustomEvent('finances-cards-changed'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }
}

