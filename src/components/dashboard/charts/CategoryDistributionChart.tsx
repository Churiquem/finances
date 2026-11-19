'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TransactionWithCategory } from '@/services/budget';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategoryDistributionChartProps {
  fixedExpenses: TransactionWithCategory[];
  variableExpenses: TransactionWithCategory[];
}

interface ChartItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
  count: number;
}

export function CategoryDistributionChart({
  fixedExpenses,
  variableExpenses,
}: CategoryDistributionChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const chartData: ChartItem[] = useMemo(() => {
    const allExpenses = [...fixedExpenses, ...variableExpenses];
    if (allExpenses.length === 0) return [];

    const totalExpenseAmount = allExpenses.reduce(
      (acc, t) => acc + (Number(t.amount) || 0),
      0
    );

    if (totalExpenseAmount === 0) return [];

    const map = new Map<string, { name: string; value: number; color: string; count: number }>();

    for (const tx of allExpenses) {
      const catId = tx.category_id || 'sem-categoria';
      const catName = tx.category?.name || 'Geral / Outros';
      const catColor = tx.category?.color_hex || '#64748B';
      const amt = Number(tx.amount) || 0;

      const existing = map.get(catId);
      if (existing) {
        existing.value += amt;
        existing.count += 1;
      } else {
        map.set(catId, {
          name: catName,
          value: amt,
          color: catColor,
          count: 1,
        });
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: (item.value / totalExpenseAmount) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [fixedExpenses, variableExpenses]);

  if (!isMounted) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/90 animate-pulse">
        <div className="h-40 w-40 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Distribuição por Categoria
          </h3>
          <p className="text-[11px] text-zinc-500">
            Composição das saídas e despesas do mês
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <PieChartIcon className="h-4 w-4" />
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[260px] text-center p-6">
          <PieChartIcon className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Nenhuma despesa registrada neste mês
          </p>
          <span className="text-[11px] text-zinc-400 mt-0.5">
            Adicione despesas fixas ou variáveis para visualizar o gráfico.
          </span>
        </div>
      ) : (
        <div className="mt-2 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Donut Chart */}
          <div className="h-[230px] w-full md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartItem;
                      return (
                        <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {data.name}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {formatBRL(data.value)}
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {data.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400">
                            {data.count} {data.count === 1 ? 'lançamento' : 'lançamentos'}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Clean Legend and Ranking */}
          <div className="w-full md:w-1/2 space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {chartData.slice(0, 6).map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {formatBRL(item.value)}
                  </span>
                  <span className="w-10 text-right text-[11px] font-semibold text-zinc-500">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
            {chartData.length > 6 && (
              <p className="text-[10px] text-zinc-400 text-center pt-1">
                + {chartData.length - 6} outras categorias
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
