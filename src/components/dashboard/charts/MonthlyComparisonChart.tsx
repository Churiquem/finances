'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getLast6MonthsComparison,
  type MonthlyComparisonData,
} from '@/services/budget';
import { BarChart3, Info } from 'lucide-react';

interface MonthlyComparisonChartProps {
  year: number;
  month: number;
}

export function MonthlyComparisonChart({
  year,
  month,
}: MonthlyComparisonChartProps) {
  const [data, setData] = useState<MonthlyComparisonData[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await getLast6MonthsComparison(year, month);
      setData(res);
    } catch (e) {
      console.error('Erro ao buscar comparativo semestral:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();

    const handleDataChanged = () => {
      fetchData();
    };

    window.addEventListener('finance:transaction-created', handleDataChanged);
    window.addEventListener('finances-data-changed', handleDataChanged);

    return () => {
      window.removeEventListener('finance:transaction-created', handleDataChanged);
      window.removeEventListener('finances-data-changed', handleDataChanged);
    };
  }, [fetchData]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const hasAnyData =
    data.length > 0 &&
    data.some((item) => item.income > 0 || item.expenses > 0 || item.balance !== 0);

  if (!isMounted || loading) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/90 animate-pulse">
        <div className="h-44 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Comparativo Semestral
          </h3>
          <p className="text-[11px] text-zinc-500">
            Evolução de Entradas, Saídas e Sobra Líquida (últimos 6 meses)
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <BarChart3 className="h-4 w-4" />
        </div>
      </div>

      {!hasAnyData ? (
        <div className="mt-4 flex h-[240px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-2.5">
            <Info className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Nenhuma movimentação registrada nos últimos 6 meses
          </p>
          <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
            As barras e a linha de evolução aparecerão aqui conforme novos lançamentos forem adicionados.
          </p>
        </div>
      ) : (
        <div className="mt-3 h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#71717A' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#71717A' }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 space-y-1.5 min-w-[170px]">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                          Mês: {label}
                        </p>
                        {payload.map((entry) => (
                          <div
                            key={entry.name}
                            className="flex items-center justify-between text-xs gap-3"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {entry.name}:
                              </span>
                            </div>
                            <span
                              className="font-bold text-zinc-900 dark:text-zinc-100"
                              style={{ color: entry.color }}
                            >
                              {formatBRL(Number(entry.value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />
              <Bar
                dataKey="income"
                name="Entradas"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expenses"
                name="Saídas"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Sobra Líquida"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
