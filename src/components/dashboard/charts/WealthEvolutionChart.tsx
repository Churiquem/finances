'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  getWealthEvolutionData,
  type WealthEvolutionPoint,
} from '@/services/investments';
import { TrendingUp } from 'lucide-react';

export function WealthEvolutionChart() {
  const [data, setData] = useState<WealthEvolutionPoint[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    getWealthEvolutionData().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val || 0);

  if (!isMounted || loading) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/90 animate-pulse">
        <div className="h-44 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Evolução Patrimonial Acumulada
          </h3>
          <p className="text-[11px] text-zinc-500">
            Crescimento do patrimônio e efeito dos juros compostos nos investimentos
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <TrendingUp className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorBalance" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorInvested" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="monthYear"
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
                  const point = payload[0].payload as WealthEvolutionPoint;
                  return (
                    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 space-y-1.5 min-w-[190px]">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                        Período: {label}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium">
                          Patrimônio Total:
                        </span>
                        <span className="font-bold text-emerald-600">
                          {formatBRL(point.totalBalance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-600 font-medium">
                          Total Aportado:
                        </span>
                        <span className="font-bold text-blue-600">
                          {formatBRL(point.totalInvested)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t border-zinc-100 dark:border-zinc-800 pt-1">
                        <span className="text-zinc-500">Lucro de Juros:</span>
                        <span className="font-bold text-emerald-600">
                          +{formatBRL(point.yieldProfit)}
                        </span>
                      </div>
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
            <Area
              type="monotone"
              dataKey="totalBalance"
              name="Patrimônio Total"
              stroke="#10B981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
            <Area
              type="monotone"
              dataKey="totalInvested"
              name="Total Aportado"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorInvested)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
