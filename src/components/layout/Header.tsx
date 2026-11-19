'use client';

import React, { useState } from 'react';
import { useMonth } from '@/contexts/MonthContext';
import { ChevronLeft, ChevronRight, Calendar, Plus, Wallet, Settings, Upload } from 'lucide-react';
import { SettingsBackupModal } from '@/components/settings/SettingsBackupModal';
import { ImportReviewModal } from '@/components/importer/ImportReviewModal';

interface HeaderProps {
  onOpenAddModal?: () => void;
  onDataChanged?: () => void;
}

export function Header({ onOpenAddModal, onDataChanged }: HeaderProps) {
  const { formattedMonth, isCurrentMonth, goToPrevMonth, goToNextMonth, goToCurrentMonth } = useMonth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/85 px-4 backdrop-blur-md transition-colors dark:border-zinc-800 dark:bg-zinc-950/85 sm:px-6">
      {/* Mobile Brand Title / Quick Info */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <Wallet className="h-5 w-5" />
        </div>
        <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Finances
        </span>
      </div>

      {/* Center: Month/Year Navigator with Quick Buttons */}
      <div className="flex flex-1 items-center justify-center md:justify-start md:gap-4">
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            onClick={goToPrevMonth}
            aria-label="Mês anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 select-none min-w-[140px] text-center">
              {formattedMonth}
            </span>
          </div>

          <button
            onClick={goToNextMonth}
            aria-label="Próximo mês"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {isCurrentMonth ? (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Mês Atual
          </span>
        ) : (
          <button
            onClick={goToCurrentMonth}
            className="hidden sm:inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full transition-all cursor-pointer"
            title="Voltar para o mês corrente"
          >
            Ir para o mês atual
          </button>
        )}
      </div>

      {/* Right Side: Settings & Add Transaction Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsImportOpen(true)}
          aria-label="Importar Extrato ou Fatura"
          title="Importar Extrato ou Fatura (CSV ou JSON)"
          className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-zinc-200 bg-zinc-50/80 text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors active:scale-95 cursor-pointer text-xs font-medium"
        >
          <Upload className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Importar</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Configurações e Backup"
          title="Configurações e Backup"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors active:scale-95 cursor-pointer"
        >
          <Settings className="h-4 w-4" />
        </button>

        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Lançamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}
      </div>

      <SettingsBackupModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChanged={onDataChanged}
      />

      <ImportReviewModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={onDataChanged}
      />
    </header>
  );
}
