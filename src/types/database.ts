export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CategoryType = 'INCOME' | 'EXPENSE' | 'FIXED_EXPENSE';

export type TransactionType =
  | 'SALARY'
  | 'EXTRA_INCOME'
  | 'EXPENSE'
  | 'FIXED_EXPENSE'
  | 'INVESTMENT_OUTFLOW'
  | 'INCOME';

export type LoanStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export type PaymentMethod = 'CASH' | 'CREDIT';

export type InvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE';

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  color_hex: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type CategoryInsert = {
  id?: string;
  name: string;
  type: CategoryType;
  color_hex?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
};

export type CategoryUpdate = {
  id?: string;
  name?: string;
  type?: CategoryType;
  color_hex?: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
};

export type MonthSummary = {
  id: string;
  year: number;
  month: number;
  starting_balance: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
};

export type MonthSummaryInsert = {
  id?: string;
  year: number;
  month: number;
  starting_balance?: number;
  is_closed?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type MonthSummaryUpdate = {
  id?: string;
  year?: number;
  month?: number;
  starting_balance?: number;
  is_closed?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  date: string;
  purchase_date?: string | null;
  billing_month?: string | null;
  month_summary_id: string;
  installment_group_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
  payment_method: PaymentMethod;
  credit_card_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionInsert = {
  id?: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  date?: string;
  purchase_date?: string | null;
  billing_month?: string | null;
  month_summary_id?: string;
  installment_group_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  payment_method?: PaymentMethod;
  credit_card_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TransactionUpdate = {
  id?: string;
  description?: string;
  amount?: number;
  type?: TransactionType;
  category_id?: string | null;
  date?: string;
  purchase_date?: string | null;
  billing_month?: string | null;
  month_summary_id?: string;
  installment_group_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  payment_method?: PaymentMethod;
  credit_card_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LoanReceivable = {
  id: string;
  debtor_name: string;
  amount: number;
  due_date: string;
  status: LoanStatus;
  reminder_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LoanReceivableInsert = {
  id?: string;
  debtor_name: string;
  amount: number;
  due_date: string;
  status?: LoanStatus;
  reminder_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LoanReceivableUpdate = {
  id?: string;
  debtor_name?: string;
  amount?: number;
  due_date?: string;
  status?: LoanStatus;
  reminder_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Investment = {
  id: string;
  institution_name: string;
  asset_name: string;
  asset_type: string;
  total_invested: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
};

export type InvestmentInsert = {
  id?: string;
  institution_name: string;
  asset_name: string;
  asset_type: string;
  total_invested: number;
  current_balance: number;
  created_at?: string;
  updated_at?: string;
};

export type InvestmentUpdate = {
  id?: string;
  institution_name?: string;
  asset_name?: string;
  asset_type?: string;
  total_invested?: number;
  current_balance?: number;
  created_at?: string;
  updated_at?: string;
};

export type InvestmentYieldHistory = {
  id: string;
  investment_id: string;
  month_year: string;
  yield_amount: number;
  yield_percentage: number;
  created_at: string;
};

export type InvestmentYieldHistoryInsert = {
  id?: string;
  investment_id: string;
  month_year: string;
  yield_amount?: number;
  yield_percentage?: number;
  created_at?: string;
};

export type InvestmentYieldHistoryUpdate = {
  id?: string;
  investment_id?: string;
  month_year?: string;
  yield_amount?: number;
  yield_percentage?: number;
  created_at?: string;
};

export type CreditCard = {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color_hex: string;
  created_at: string;
  updated_at: string;
};

export type CreditCardInsert = {
  id?: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color_hex?: string;
  created_at?: string;
  updated_at?: string;
};

export type CreditCardUpdate = {
  id?: string;
  name?: string;
  limit_amount?: number;
  closing_day?: number;
  due_day?: number;
  color_hex?: string;
  created_at?: string;
  updated_at?: string;
};

export type CreditCardInvoice = {
  id: string;
  credit_card_id: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  due_date?: string | null;
  is_postponed?: boolean | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditCardInvoiceInsert = {
  id?: string;
  credit_card_id: string;
  month: number;
  year: number;
  status?: InvoiceStatus;
  due_date?: string | null;
  is_postponed?: boolean | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreditCardInvoiceUpdate = {
  id?: string;
  credit_card_id?: string;
  month?: number;
  year?: number;
  status?: InvoiceStatus;
  due_date?: string | null;
  is_postponed?: boolean | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: [];
      };
      months_summary: {
        Row: MonthSummary;
        Insert: MonthSummaryInsert;
        Update: MonthSummaryUpdate;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
        Relationships: [];
      };
      loans_receivable: {
        Row: LoanReceivable;
        Insert: LoanReceivableInsert;
        Update: LoanReceivableUpdate;
        Relationships: [];
      };
      investments: {
        Row: Investment;
        Insert: InvestmentInsert;
        Update: InvestmentUpdate;
        Relationships: [];
      };
      investment_yield_history: {
        Row: InvestmentYieldHistory;
        Insert: InvestmentYieldHistoryInsert;
        Update: InvestmentYieldHistoryUpdate;
        Relationships: [];
      };
      credit_cards: {
        Row: CreditCard;
        Insert: CreditCardInsert;
        Update: CreditCardUpdate;
        Relationships: [];
      };
      credit_card_invoices: {
        Row: CreditCardInvoice;
        Insert: CreditCardInvoiceInsert;
        Update: CreditCardInvoiceUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      category_type: CategoryType;
      transaction_type: TransactionType;
      loan_status: LoanStatus;
      payment_method: PaymentMethod;
      invoice_status: InvoiceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
