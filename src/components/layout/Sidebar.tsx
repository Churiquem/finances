'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ReceiptText,
  CreditCard,
  HandCoins,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const cloudEnabled = isSupabaseConfigured();

  const navItems = [
    {
      label: 'Visão Geral',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'Lançamentos',
      href: '/transactions',
      icon: ReceiptText,
      active: pathname === '/transactions',
    },
    {
      label: 'Cartões',
      href: '/cards',
      icon: CreditCard,
      active: pathname === '/cards',
    },
    {
      label: 'A Receber',
      href: '/receivables',
      icon: HandCoins,
      active: pathname === '/receivables',
    },
    {
      label: 'Investimentos',
      href: '/investments',
      icon: TrendingUp,
      active: pathname === '/investments',
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/60 backdrop-blur-md transition-all duration-300 relative z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`border-b border-zinc-200 dark:border-zinc-800 transition-all ${
          collapsed
            ? 'flex flex-col items-center justify-center py-3.5 gap-2.5'
            : 'flex h-16 items-center justify-between px-4'
        }`}
      >
        <Link href="/" className="flex items-center gap-3 overflow-hidden" title="Finances">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <Wallet className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Finances
              </span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Gestão Pessoal
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-200'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {cloudEnabled ? 'Cloud Sync Ativo' : 'Finances v1.0'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
              {cloudEnabled ? 'Sincronizado com Supabase' : 'Modo Local (Navegador)'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
