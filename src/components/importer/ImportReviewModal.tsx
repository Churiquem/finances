'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { ImportTransactionItem } from '@/types/importer';
import { Category, CreditCard, TransactionType, PaymentMethod } from '@/types/database';
import { getLocalCategories, getLocalCreditCards } from '@/lib/storage/offlineStorage';
import { parseImportFile, executeBatchImport, getSampleTemplate } from '@/services/importer';

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function ImportReviewModal({ isOpen, onClose, onImportSuccess }: ImportReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'UPLOAD' | 'REVIEW' | 'SUCCESS'>('UPLOAD');
  const [, setFileName] = useState<string>('');
  const [items, setItems] = useState<ImportTransactionItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; totalAmount: number } | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCategories(getLocalCategories());
      setCards(getLocalCreditCards());
      setStep('UPLOAD');
      setItems([]);
      setWarnings([]);
      setImportResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const refreshCats = () => {
      setCategories(getLocalCategories());
    };
    window.addEventListener('finances-categories-changed', refreshCats);
    window.addEventListener('finances-data-changed', refreshCats);
    return () => {
      window.removeEventListener('finances-categories-changed', refreshCats);
      window.removeEventListener('finances-data-changed', refreshCats);
    };
  }, []);

  if (!isOpen || !mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setWarnings([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseImportFile(content, file.name);
      setIsLoading(false);

      if (res.items.length === 0) {
        setWarnings(res.warnings.length > 0 ? res.warnings : ['Nenhuma transação válida encontrada.']);
      } else {
        setItems(res.items);
        setWarnings(res.warnings);
        setStep('REVIEW');
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setWarnings(['Erro ao ler arquivo selecionado.']);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems(items.map((i) => ({ ...i, selected: !allSelected })));
  };

  const handleToggleItem = (id?: string) => {
    if (!id) return;
    setItems(items.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const handleUpdateItem = (id: string | undefined, patch: Partial<ImportTransactionItem>) => {
    if (!id) return;
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const handleDeleteItem = (id?: string) => {
    if (!id) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleDownloadTemplate = (format: 'json' | 'csv') => {
    const template = getSampleTemplate(format);
    const blob = new Blob([template.content], { type: template.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;

    setIsLoading(true);
    try {
      const res = await executeBatchImport(selected);
      setImportResult({ count: res.importedCount, totalAmount: res.totalAmount });
      setStep('SUCCESS');
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      console.error(err);
      setWarnings(['Falha ao salvar lançamentos no banco de dados.']);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    if (searchTerm) {
      const matchDesc = item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = item.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDesc || matchCat;
    }
    return true;
  });

  const selectedCount = items.filter((i) => i.selected).length;
  const selectedExpenses = items
    .filter((i) => i.selected && (i.type === 'EXPENSE' || i.type === 'FIXED_EXPENSE' || i.type === 'INVESTMENT_OUTFLOW'))
    .reduce((acc, curr) => acc + curr.amount, 0);
  const selectedIncomes = items
    .filter((i) => i.selected && (i.type === 'SALARY' || i.type === 'EXTRA_INCOME' || i.type === 'INCOME'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                Importação de Extratos & Faturas
                {step === 'REVIEW' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-normal">
                    Revisão ({items.length} itens)
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                {step === 'UPLOAD' && 'Carregue arquivos CSV ou JSON com seus lançamentos ou faturas'}
                {step === 'REVIEW' && 'Revise as categorias, valores e marque quais lançamentos deseja incluir'}
                {step === 'SUCCESS' && 'Importação concluída com sucesso!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warnings Banner */}
        {warnings.length > 0 && (
          <div className="shrink-0 mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {warnings.map((w, idx) => (
                <div key={idx}>{w}</div>
              ))}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto my-3 pr-1">
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="space-y-6 py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 bg-zinc-900/30 hover:bg-zinc-900/60 p-10 text-center transition-all cursor-pointer"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                    Clique para selecionar ou arraste seu arquivo
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Extensões suportadas: <span className="text-zinc-300 font-mono">.csv</span> ou <span className="text-zinc-300 font-mono">.json</span>
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
                  <Sparkles className="h-3.5 w-3.5" />
                  Mapeamento inteligente de categorias e cartões
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                />
              </div>

              {/* Sample Templates & Instruction Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">Modelo CSV / Planilha</span>
                    <button
                      onClick={() => handleDownloadTemplate('csv')}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar Modelo CSV
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Colunas aceitas: <code className="text-zinc-300">Data, Descrição, Valor, Tipo, Categoria, Cartão</code>. Suporta valores brasileiros (ex: 1.250,50).
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">Modelo JSON Padronizado</span>
                    <button
                      onClick={() => handleDownloadTemplate('json')}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar Modelo JSON
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Formato ideal para integrações e extratos bancários digitais em formato estruturado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW TABLE */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Summary Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-zinc-400">Selecionados: </span>
                    <span className="font-semibold text-zinc-100">{selectedCount} de {items.length}</span>
                  </div>
                  {selectedIncomes > 0 && (
                    <div>
                      <span className="text-zinc-400">Entradas: </span>
                      <span className="font-semibold text-emerald-400">+{formatBRL(selectedIncomes)}</span>
                    </div>
                  )}
                  {selectedExpenses > 0 && (
                    <div>
                      <span className="text-zinc-400">Saídas: </span>
                      <span className="font-semibold text-rose-400">-{formatBRL(selectedExpenses)}</span>
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Filtrar por texto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-8 px-2 text-xs rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">Todos os Tipos</option>
                    <option value="EXPENSE">Despesas</option>
                    <option value="FIXED_EXPENSE">Despesas Fixas</option>
                    <option value="SALARY">Salário</option>
                    <option value="EXTRA_INCOME">Renda Extra</option>
                    <option value="INCOME">Entradas / Rendimentos</option>
                    <option value="INVESTMENT_OUTFLOW">Investimentos</option>
                  </select>
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors cursor-pointer"
                  >
                    {items.every((i) => i.selected) ? (
                      <>
                        <Square className="h-3.5 w-3.5 text-zinc-400" />
                        Desmarcar Todos
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                        Marcar Todos
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-zinc-800 overflow-x-auto bg-zinc-950">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-medium">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-32">Data</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3 w-28 text-right">Valor</th>
                      <th className="py-2.5 px-3 w-36">Tipo</th>
                      <th className="py-2.5 px-3 w-40">Categoria</th>
                      <th className="py-2.5 px-3 w-40">Pagamento</th>
                      <th className="py-2.5 px-3 w-12 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-zinc-900/30 ${
                          !item.selected ? 'opacity-40 bg-zinc-950/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item.id)}
                            className="cursor-pointer text-zinc-400 hover:text-emerald-400"
                          >
                            {item.selected ? (
                              <CheckSquare className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Square className="h-4 w-4 text-zinc-600" />
                            )}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateItem(item.id, { date: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-200 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { amount: parseFloat(e.target.value) || 0 })
                            }
                            className={`w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-right font-medium focus:border-emerald-500 focus:outline-none ${
                              item.type === 'SALARY' || item.type === 'EXTRA_INCOME' || item.type === 'INCOME'
                                ? 'text-emerald-400'
                                : 'text-zinc-100'
                            }`}
                          />
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.type}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { type: e.target.value as TransactionType })
                            }
                            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="EXPENSE">Despesa</option>
                            <option value="FIXED_EXPENSE">Despesa Fixa</option>
                            <option value="SALARY">Salário</option>
                            <option value="EXTRA_INCOME">Renda Extra</option>
                            <option value="INCOME">Entrada / Rendimento</option>
                            <option value="INVESTMENT_OUTFLOW">Investimento</option>
                          </select>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.category_id || ''}
                            onChange={(e) => handleUpdateItem(item.id, { category_id: e.target.value || undefined })}
                            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="">(Sem categoria)</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Payment Method & Credit Card */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <select
                              value={item.payment_method}
                              onChange={(e) => {
                                const pm = e.target.value as PaymentMethod;
                                handleUpdateItem(item.id, {
                                  payment_method: pm,
                                  credit_card_id: pm === 'CREDIT' ? (cards[0]?.id || undefined) : undefined,
                                });
                              }}
                              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
                            >
                              <option value="CASH">Conta / PIX</option>
                              <option value="CREDIT">Cartão de Crédito</option>
                            </select>

                            {item.payment_method === 'CREDIT' && cards.length > 0 && (
                              <select
                                value={item.credit_card_id || ''}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, { credit_card_id: e.target.value || undefined })
                                }
                                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-[11px] text-emerald-400 focus:border-emerald-500 focus:outline-none"
                              >
                                {cards.map((card) => (
                                  <option key={card.id} value={card.id}>
                                    💳 {card.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-zinc-800 cursor-pointer"
                            title="Remover linha"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'SUCCESS' && importResult && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Importação Finalizada!
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  <span className="font-semibold text-emerald-400">{importResult.count}</span> lançamentos foram adicionados com sucesso ao seu orçamento e relatórios.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
              >
                Concluir e Visualizar Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-800 pt-4 mt-2 flex items-center justify-between">
          {step === 'REVIEW' ? (
            <>
              <button
                onClick={() => setStep('UPLOAD')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Trocar Arquivo
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isLoading || selectedCount === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Importar {selectedCount} Lançamento{selectedCount !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          ) : step === 'UPLOAD' ? (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
