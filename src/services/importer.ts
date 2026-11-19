import { ImportTransactionItem, ImportParseResult, ImportBatchSummary } from '@/types/importer';
import {
  getLocalCategories,
  getLocalCreditCards,
  addLocalTransaction,
  getLocalMonthSummary,
  saveLocalMonthSummary,
} from '@/lib/storage/offlineStorage';
import { TransactionInsert, PaymentMethod, TransactionType } from '@/types/database';

/**
 * Normaliza strings para comparacao simples (sem acentos e em minusculas)
 */
function normalizeStr(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Converte strings de valor em numeros float (suporta formato BR e US)
 */
export function parseCurrencyAmount(raw: unknown): { value: number; isNegative: boolean } {
  if (typeof raw === 'number') {
    return { value: Math.abs(raw), isNegative: raw < 0 };
  }
  if (!raw || typeof raw !== 'string') {
    return { value: 0, isNegative: false };
  }

  let clean = raw.trim().replace(/^R\$\s?/, '').trim();
  const isNegative = clean.startsWith('-') || clean.includes('(') || clean.endsWith('-');
  clean = clean.replace(/[-+()]/g, '').trim();

  // Detecta formato BR com virgula decimal (ex: 1.250,50)
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf('.') < clean.indexOf(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return {
    value: isNaN(num) ? 0 : num,
    isNegative,
  };
}

/**
 * Converte strings de data (DD/MM/YYYY ou YYYY-MM-DD ou DD-MM-YYYY) para YYYY-MM-DD
 */
export function parseDateToISO(raw: unknown): string {
  if (!raw || typeof raw !== 'string') {
    return new Date().toISOString().split('T')[0];
  }
  const s = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // ISO string completa
  const dateObj = new Date(s);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Tenta mapear o nome da categoria com as categorias existentes
 */
function findMatchingCategory(nameOrDesc: string, categories = getLocalCategories()): string | undefined {
  if (!nameOrDesc) return undefined;
  const norm = normalizeStr(nameOrDesc);

  // Match exato
  const exact = categories.find((c) => normalizeStr(c.name) === norm);
  if (exact) return exact.id;

  // Match parcial
  const partial = categories.find((c) => norm.includes(normalizeStr(c.name)) || normalizeStr(c.name).includes(norm));
  if (partial) return partial.id;

  return undefined;
}

/**
 * Tenta mapear o cartao de credito pelo nome
 */
function findMatchingCard(name: string, cards = getLocalCreditCards()): string | undefined {
  if (!name) return undefined;
  const norm = normalizeStr(name);
  const match = cards.find((c) => normalizeStr(c.name) === norm || norm.includes(normalizeStr(c.name)));
  return match?.id;
}

/**
 * Detecta tipo sugerido se nao especificado
 */
function inferTransactionType(description: string, isNegativeVal: boolean): TransactionType {
  const norm = normalizeStr(description);
  if (norm.includes('salario') || norm.includes('remuneracao') || norm.includes('folha')) {
    return 'SALARY';
  }
  if (norm.includes('rendimento') || norm.includes('dividend') || norm.includes('ted recebida') || norm.includes('pix recebido')) {
    return 'EXTRA_INCOME';
  }
  if (norm.includes('aluguel') || norm.includes('condominio') || norm.includes('internet') || norm.includes('assinatura') || norm.includes('netflix') || norm.includes('spotify')) {
    return 'FIXED_EXPENSE';
  }
  if (norm.includes('investimento') || norm.includes('aplicacao') || norm.includes('cdb') || norm.includes('tesouro')) {
    return 'INVESTMENT_OUTFLOW';
  }
  if (norm.includes('resgate') || norm.includes('estorno') || norm.includes('reembolso')) {
    return 'INCOME';
  }
  if (!isNegativeVal) {
    return 'EXPENSE';
  }
  return 'EXPENSE';
}

/**
 * Parser de arquivos JSON ou CSV
 */
export function parseImportFile(fileContent: string, fileName: string): ImportParseResult {
  const isJson = fileName.toLowerCase().endsWith('.json') || fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[');
  const categories = getLocalCategories();
  const cards = getLocalCreditCards();

  if (isJson) {
    return parseJson(fileContent, categories, cards);
  } else {
    return parseCsv(fileContent, categories, cards);
  }
}

function parseJson(content: string, categories: ReturnType<typeof getLocalCategories>, cards: ReturnType<typeof getLocalCreditCards>): ImportParseResult {
  const warnings: string[] = [];
  try {
    const data = JSON.parse(content);
    const rawList: any[] = Array.isArray(data) ? data : (data.transactions || data.items || data.data || []);

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return {
        items: [],
        totalRows: 0,
        validRows: 0,
        warnings: ['Nenhuma transacao encontrada no arquivo JSON.'],
      };
    }

    const items: ImportTransactionItem[] = [];

    rawList.forEach((raw, idx) => {
      const description = String(raw.description || raw.title || raw.name || raw.estabelecimento || `Lancamento #${idx + 1}`).trim();
      const rawAmt = raw.amount !== undefined ? raw.amount : (raw.valor || raw.value || 0);
      const { value } = parseCurrencyAmount(rawAmt);
      const date = parseDateToISO(raw.date || raw.data || raw.time);

      let type: TransactionType = raw.type;
      if (!['EXPENSE', 'FIXED_EXPENSE', 'SALARY', 'EXTRA_INCOME', 'INVESTMENT_OUTFLOW'].includes(type)) {
        type = inferTransactionType(description, true);
      }

      let payment_method: PaymentMethod = raw.payment_method === 'CREDIT' ? 'CREDIT' : 'CASH';
      let credit_card_id = raw.credit_card_id;
      let credit_card_name = raw.credit_card_name || raw.card_name;

      if (credit_card_name && !credit_card_id) {
        credit_card_id = findMatchingCard(credit_card_name, cards);
      }
      if (credit_card_id) {
        payment_method = 'CREDIT';
      }

      let category_id = raw.category_id;
      let category_name = raw.category_name || raw.categoria;
      if (!category_id && category_name) {
        category_id = findMatchingCategory(category_name, categories);
      }
      if (!category_id) {
        category_id = findMatchingCategory(description, categories);
      }

      items.push({
        id: crypto.randomUUID(),
        date,
        description,
        amount: value,
        type,
        category_id,
        category_name,
        payment_method,
        credit_card_name,
        credit_card_id,
        installment_number: raw.installment_number ? Number(raw.installment_number) : undefined,
        total_installments: raw.total_installments ? Number(raw.total_installments) : undefined,
        selected: true,
      });
    });

    return {
      items,
      totalRows: rawList.length,
      validRows: items.length,
      warnings,
    };
  } catch (err) {
    return {
      items: [],
      totalRows: 0,
      validRows: 0,
      warnings: ['Erro ao decodificar JSON: ' + (err as Error).message],
    };
  }
}

function parseCsv(content: string, categories: ReturnType<typeof getLocalCategories>, cards: ReturnType<typeof getLocalCreditCards>): ImportParseResult {
  const warnings: string[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      items: [],
      totalRows: 0,
      validRows: 0,
      warnings: ['O arquivo CSV precisa conter pelo menos um cabecalho e uma linha de dados.'],
    };
  }

  // Detecta delimitador (, ou ;)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map((h) => normalizeStr(h.replace(/["']/g, '')));

  // Localiza indices das colunas
  const dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('titulo') || h.includes('estabelecimento') || h.includes('historico'));
  const amountIdx = headers.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('value'));
  const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('categoria'));
  const cardIdx = headers.findIndex((h) => h.includes('cart') || h.includes('card'));
  const typeIdx = headers.findIndex((h) => h.includes('tipo') || h.includes('type'));

  const items: ImportTransactionItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Split respeitando aspas
    const cols = rawLine.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());

    const dateRaw = dateIdx >= 0 ? cols[dateIdx] : cols[0];
    const descRaw = descIdx >= 0 ? cols[descIdx] : cols[1];
    const amountRaw = amountIdx >= 0 ? cols[amountIdx] : cols[2];
    const catRaw = catIdx >= 0 ? cols[catIdx] : '';
    const cardRaw = cardIdx >= 0 ? cols[cardIdx] : '';
    const typeRaw = typeIdx >= 0 ? cols[typeIdx] : '';

    if (!descRaw && !amountRaw) continue;

    const { value, isNegative } = parseCurrencyAmount(amountRaw);
    const date = parseDateToISO(dateRaw);
    const description = descRaw || `Lancamento #${i}`;

    let type: TransactionType = 'EXPENSE';
    const normType = normalizeStr(typeRaw);
    if (normType.includes('fixa')) type = 'FIXED_EXPENSE';
    else if (normType.includes('salario')) type = 'SALARY';
    else if (normType.includes('extra') || normType.includes('renda')) type = 'EXTRA_INCOME';
    else if (normType.includes('invest')) type = 'INVESTMENT_OUTFLOW';
    else {
      type = inferTransactionType(description, isNegative);
    }

    let payment_method: PaymentMethod = 'CASH';
    let credit_card_id: string | undefined = undefined;

    if (cardRaw) {
      credit_card_id = findMatchingCard(cardRaw, cards);
      payment_method = 'CREDIT';
    }

    let category_id = catRaw ? findMatchingCategory(catRaw, categories) : undefined;
    if (!category_id) {
      category_id = findMatchingCategory(description, categories);
    }

    items.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount: value,
      type,
      category_id,
      category_name: catRaw || undefined,
      payment_method,
      credit_card_name: cardRaw || undefined,
      credit_card_id,
      selected: true,
    });
  }

  return {
    items,
    totalRows: lines.length - 1,
    validRows: items.length,
    warnings,
  };
}

/**
 * Salva em lote todas as transacoes selecionadas no armazenamento offline
 */
export async function executeBatchImport(items: ImportTransactionItem[]): Promise<ImportBatchSummary> {
  const selectedItems = items.filter((i) => i.selected);
  let totalAmount = 0;
  const monthsSet = new Set<string>();

  for (const item of selectedItems) {
    const [yStr, mStr] = item.date.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    monthsSet.add(monthKey);

    // Garante que o MonthSummary existe
    let monthSummary = getLocalMonthSummary(year, month);
    if (!monthSummary) {
      monthSummary = saveLocalMonthSummary(year, month, 0, false);
    }

    const txInsert: TransactionInsert = {
      description: item.description,
      amount: Number(item.amount),
      type: item.type,
      category_id: item.category_id || null,
      date: item.date,
      month_summary_id: monthSummary.id,
      payment_method: item.payment_method || 'CASH',
      credit_card_id: item.payment_method === 'CREDIT' ? item.credit_card_id || null : null,
      installment_number: item.installment_number || null,
      total_installments: item.total_installments || null,
    };

    addLocalTransaction(txInsert);
    totalAmount += item.amount;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finances-data-changed'));
    window.dispatchEvent(new CustomEvent('finance:transaction-created'));
    window.dispatchEvent(new CustomEvent('finances-cards-changed'));
    window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
  }

  return {
    importedCount: selectedItems.length,
    totalAmount,
    monthsAffected: Array.from(monthsSet),
  };
}

/**
 * Gera modelo de arquivo de exemplo para download
 */
export function getSampleTemplate(format: 'json' | 'csv'): { content: string; filename: string; mimeType: string } {
  if (format === 'json') {
    const sample: ImportTransactionItem[] = [
      {
        date: new Date().toISOString().split('T')[0],
        description: 'Supermercado Mensal',
        amount: 350.5,
        type: 'EXPENSE',
        category_name: 'Alimentacao',
        payment_method: 'CREDIT',
        credit_card_name: 'Nubank',
        selected: true,
      },
      {
        date: new Date().toISOString().split('T')[0],
        description: 'Salario Mensal',
        amount: 5000.0,
        type: 'SALARY',
        category_name: 'Salario',
        payment_method: 'CASH',
        selected: true,
      },
      {
        date: new Date().toISOString().split('T')[0],
        description: 'Internet Fibra',
        amount: 119.9,
        type: 'FIXED_EXPENSE',
        category_name: 'Moradia',
        payment_method: 'CASH',
        selected: true,
      },
    ];

    return {
      content: JSON.stringify(sample, null, 2),
      filename: 'modelo-importacao-finances.json',
      mimeType: 'application/json',
    };
  } else {
    const today = new Date().toISOString().split('T')[0];
    const csvContent =
      'Data;Descricao;Valor;Tipo;Categoria;Cartao\n' +
      `${today};Supermercado Mensal;350,50;EXPENSE;Alimentacao;Nubank\n` +
      `${today};Salario Empresa;5000,00;SALARY;Salario;\n` +
      `${today};Internet Fibra;119,90;FIXED_EXPENSE;Moradia;\n`;

    return {
      content: csvContent,
      filename: 'modelo-importacao-finances.csv',
      mimeType: 'text/csv;charset=utf-8;',
    };
  }
}
