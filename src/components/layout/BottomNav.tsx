'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, CreditCard, HandCoins, TrendingUp } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/90 backdrop-blur-lg px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 transition-colors dark:border-zinc-800 dark:bg-zinc-950/90 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-all ${
                item.active
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold scale-105'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                  item.active
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
