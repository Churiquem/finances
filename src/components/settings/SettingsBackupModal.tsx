'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Trash2,
  Download,
  Upload,
  Database,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  exportBackupData,
  importBackupData,
  clearAllData,
} from '@/lib/storage/offlineStorage';

interface SettingsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export function SettingsBackupModal({
  isOpen,
  onClose,
  onDataChanged,
}: SettingsBackupModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleClear = () => {
    try {
      setIsLoading(true);
      clearAllData(true);
      setStatusMessage({
        type: 'success',
        text: 'Dados de demonstração limpos com sucesso! O aplicativo está pronto para uso limpo com saldo zerado.',
      });
      setIsConfirmingClear(false);
      setTimeout(() => {
        if (onDataChanged) onDataChanged();
        window.location.reload();
      }, 900);
    } catch (e) {
      console.error(e);
      setStatusMessage({
        type: 'error',
        text: 'Falha ao limpar os dados do aplicativo.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const jsonStr = exportBackupData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `finances-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: 'Arquivo de backup gerado e descarregado com sucesso!',
      });
    } catch (e) {
      console.error(e);
      setStatusMessage({
        type: 'error',
        text: 'Falha ao gerar o arquivo de backup.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBackupData(content);
      setIsLoading(false);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `${res.message} (${res.counts?.transactions || 0} lançamentos, ${res.counts?.months || 0} meses importados). Atualizando tela...`,
        });
        setTimeout(() => {
          if (onDataChanged) onDataChanged();
          window.location.reload();
        }, 1100);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        });
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setStatusMessage({
        type: 'error',
        text: 'Erro ao ler o arquivo selecionado.',
      });
    };

    reader.readAsText(file);
    // Reset file input so user can choose same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                Configurações & Backup
              </h2>
              <p className="text-xs text-zinc-400">
                Gerencie seus dados locais, realize backups e configure seu histórico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div
            className={`shrink-0 mt-4 flex items-start gap-2.5 rounded-xl p-3.5 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-2">
          {/* Card 1: Limpar Dados de Demonstração */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 p-4 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  <span>Limpar dados de demonstração</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Zera todos os lançamentos, saldos de meses e valores a receber de teste.
                  O saldo ficará zerado para você começar o app com suas finanças reais.
                </p>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
              {isConfirmingClear ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    Confirma zerar todos os dados?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsConfirmingClear(false)}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-xs cursor-pointer"
                    >
                      {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                      Sim, Zerar Dados
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingClear(true)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Zerar e Começar do Zero
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Exportar / Importar Backup JSON */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 p-4 transition-colors space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-sm text-zinc-900 dark:text-zinc-100">
                <Database className="h-4 w-4 text-blue-500" />
                <span>Backup & Sincronização Manual (JSON)</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Exporte um arquivo com tudo o que está cadastrado para guardar no Google Drive
                ou importar em outro dispositivo (PC ou Celular).
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-blue-500" />
                Exportar Backup (.json)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-500" />
                Importar Backup (.json)
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-800 pt-4 mt-2 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
