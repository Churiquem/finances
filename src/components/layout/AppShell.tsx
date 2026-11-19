'use client';

import React, { useState, useEffect } from 'react';
import { MonthProvider } from '@/contexts/MonthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AddTransactionModal } from '@/components/dashboard/AddTransactionModal';
import { getCategories, createTransaction } from '@/services/budget';
import type { Category, TransactionInsert } from '@/types/database';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultModalType, setDefaultModalType] = useState<string>('EXPENSE');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Ouvinte para abrir o modal com tipo pré-definido a partir de qualquer seção
  useEffect(() => {
    const handleOpenModalEvent = (e: CustomEvent<{ type?: string }>) => {
      setDefaultModalType(e.detail?.type || 'EXPENSE');
      setIsAddModalOpen(true);
    };

    window.addEventListener('finance:open-add-modal' as any, handleOpenModalEvent);
    return () => {
      window.removeEventListener('finance:open-add-modal' as any, handleOpenModalEvent);
    };
  }, []);

  const handleAddTransaction = async (payload: TransactionInsert) => {
    const created = await createTransaction(payload);
    if (created) {
      window.dispatchEvent(new CustomEvent('finance:transaction-created'));
      window.dispatchEvent(new CustomEvent('finances-data-changed'));
      window.dispatchEvent(new CustomEvent('finances-invoices-changed'));
    }
  };

  return (
    <MonthProvider>
      <div className="flex h-screen w-full overflow-hidden bg-zinc-50/50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-50">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onOpenAddModal={() => setIsAddModalOpen(true)} />

          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:px-8 pb-24 md:pb-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Global Add Transaction Modal */}
        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          categories={categories}
          defaultType={defaultModalType}
          onAddTransaction={handleAddTransaction}
        />
      </div>
    </MonthProvider>
  );
}
