import { PaymentMethod, TransactionType } from './database';

export interface ImportTransactionItem {
  id?: string; // ID temporário para identificação no loop da UI
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // Valor positivo numérico
  type: TransactionType;
  category_id?: string;
  category_name?: string; // Sugestão para mapeamento automático
  payment_method: 'CASH' | 'CREDIT';
  credit_card_name?: string; // Ex: "Mercado Pago"
  credit_card_id?: string;
  installment_number?: number;
  total_installments?: number;
  selected?: boolean; // Para marcar/desmarcar na revisão
  notes?: string;
  raw_data?: Record<string, unknown>;
}

export interface ImportParseResult {
  items: ImportTransactionItem[];
  totalRows: number;
  validRows: number;
  warnings: string[];
  suggestedCard?: string;
}

export interface ImportBatchSummary {
  importedCount: number;
  totalAmount: number;
  categoriesCreated?: number;
  monthsAffected: string[];
}
