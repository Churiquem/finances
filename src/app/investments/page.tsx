'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getInvestments,
  calculateInvestmentsSummary,
  createInvestment,
  deleteInvestment,
  recordContribution,
  recordYieldHistory,
  type InvestmentWithLatestYield,
  type InvestmentsSummary,
} from '@/services/investments';
import {
  TrendingUp,
  Wallet,
  Building2,
  PieChart,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  X,
  ArrowUpRight,
  Landmark,
  Percent,
} from 'lucide-react';
import { WealthEvolutionChart } from '@/components/dashboard/charts/WealthEvolutionChart';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<InvestmentWithLatestYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('ALL');

  // Modals state
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [contributionAsset, setContributionAsset] = useState<InvestmentWithLatestYield | null>(null);
  const [yieldAsset, setYieldAsset] = useState<InvestmentWithLatestYield | null>(null);

  // New Asset form
  const [institutionName, setInstitutionName] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('Reserva de Emergência');
  const [initialInvested, setInitialInvested] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  // Contribution form
  const [contributionAmount, setContributionAmount] = useState('');
  const [createBudgetExpense, setCreateBudgetExpense] = useState(true);

  // Yield form
  const [yieldAmount, setYieldAmount] = useState('');
  const [yieldPercentage, setYieldPercentage] = useState('');
  const [newCurrentBalance, setNewCurrentBalance] = useState('');
  const [yieldMonthYear, setYieldMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvestments();
      setInvestments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);

  const summary: InvestmentsSummary = calculateInvestmentsSummary(investments);

  // Group by Institution
  const institutions = Array.from(
    new Set(investments.map((i) => i.institution_name.trim()))
  );

  const filteredInvestments =
    selectedInstitution === 'ALL'
      ? investments
      : investments.filter(
          (i) => i.institution_name.trim() === selectedInstitution
        );

  const groupedByInstitution: Record<string, InvestmentWithLatestYield[]> = {};
  for (const inv of filteredInvestments) {
    const inst = inv.institution_name.trim();
    if (!groupedByInstitution[inst]) {
      groupedByInstitution[inst] = [];
    }
    groupedByInstitution[inst].push(inv);
  }

  // Handle create asset
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const invested = parseFloat(initialInvested.replace(',', '.'));
    const balance = initialBalance
      ? parseFloat(initialBalance.replace(',', '.'))
      : invested;

    if (!institutionName.trim() || !assetName.trim() || isNaN(invested)) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    await createInvestment({
      institution_name: institutionName.trim(),
      asset_name: assetName.trim(),
      asset_type: assetType,
      total_invested: invested,
      current_balance: isNaN(balance) ? invested : balance,
    });

    setInstitutionName('');
    setAssetName('');
    setInitialInvested('');
    setInitialBalance('');
    setIsAddAssetModalOpen(false);
    loadData();
  };

  // Handle Contribution
  const handleConfirmContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionAsset) return;
    const amount = parseFloat(contributionAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    await recordContribution(contributionAsset, amount, createBudgetExpense);
    setContributionAsset(null);
    setContributionAmount('');
    loadData();
  };

  // Handle Yield
  const handleConfirmYield = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yieldAsset) return;
    const yAmount = parseFloat(yieldAmount.replace(',', '.')) || 0;
    const yPercent = parseFloat(yieldPercentage.replace(',', '.')) || 0;
    const nBalance = newCurrentBalance
      ? parseFloat(newCurrentBalance.replace(',', '.'))
      : undefined;

    await recordYieldHistory(
      yieldAsset.id,
      yieldMonthYear,
      yAmount,
      yPercent,
      nBalance
    );

    setYieldAsset(null);
    setYieldAmount('');
    setYieldPercentage('');
    setNewCurrentBalance('');
    loadData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o ativo "${name}" da carteira?`)) return;
    await deleteInvestment(id);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Carteira de Investimentos
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Gestão patrimonial, acompanhamento de aportes e rentabilidade acumulada
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddAssetModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Ativo
          </button>
          <button
            onClick={loadData}
            title="Recarregar dados"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Patrimônio Total */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Patrimônio Total Acumulado
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatBRL(summary.totalPortfolioBalance)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Saldo total atualizado em custódia
          </p>
        </div>

        {/* Total Aportado */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Aportado (Custo)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Landmark className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {formatBRL(summary.totalInvested)}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Capital financeiro transferido para a carteira
          </p>
        </div>

        {/* Rendimento Total Acumulado */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4.5 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Rendimento Total Acumulado
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              +{formatBRL(summary.totalYieldAmount)}
            </span>
            <span className="rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
              +{summary.totalYieldPercentage.toFixed(2)}%
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Lucro de capital e juros compostos
          </p>
        </div>
      </div>

      {/* Gráfico de Evolução Patrimonial */}
      <WealthEvolutionChart />

      {/* Filter by Institution */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200 pb-2 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setSelectedInstitution('ALL')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            selectedInstitution === 'ALL'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Todas as Instituições ({investments.length})
        </button>
        {institutions.map((inst) => (
          <button
            key={inst}
            onClick={() => setSelectedInstitution(inst)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedInstitution === inst
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {inst}
          </button>
        ))}
      </div>

      {/* Grouped Asset Cards by Institution */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-zinc-200 dark:bg-zinc-800/60" />
            ))}
          </div>
        ) : Object.keys(groupedByInstitution).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <PieChart className="h-10 w-10 text-zinc-400 mb-2" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhum ativo registrado na carteira
            </p>
            <button
              onClick={() => setIsAddAssetModalOpen(true)}
              className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              Cadastrar primeiro ativo
            </button>
          </div>
        ) : (
          Object.entries(groupedByInstitution).map(([instName, assets]) => {
            const instTotalBalance = assets.reduce(
              (acc, a) => acc + Number(a.current_balance),
              0
            );

            return (
              <div
                key={instName}
                className="rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden"
              >
                {/* Institution Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {instName}
                      </h3>
                      <span className="text-[11px] text-zinc-500">
                        {assets.length} {assets.length === 1 ? 'ativo' : 'ativos'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                      {formatBRL(instTotalBalance)}
                    </span>
                    <span className="block text-[10px] text-zinc-400">
                      Saldo na instituição
                    </span>
                  </div>
                </div>

                {/* Assets Grid / List */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-col gap-3 p-4 transition-colors hover:bg-zinc-50/60 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-zinc-800/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          <PieChart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {asset.asset_name}
                            </h4>
                            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {asset.asset_type}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                            <span>Aportado: <strong>{formatBRL(Number(asset.total_invested))}</strong></span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Rentab. Acumulada: +{formatBRL(asset.totalYieldAmount)} (+{asset.totalYieldPercentage.toFixed(1)}%)
                            </span>
                            {asset.latestYield && (
                              <span className="text-zinc-400">
                                Último mês: +{formatBRL(Number(asset.latestYield.yield_amount))} (+{Number(asset.latestYield.yield_percentage).toFixed(2)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Balance & Quick Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                        <div className="text-left sm:text-right">
                          <span className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                            {formatBRL(Number(asset.current_balance))}
                          </span>
                          <span className="block text-[10px] text-zinc-400">
                            Saldo Atual
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Aporte Button */}
                          <button
                            onClick={() => setContributionAsset(asset)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 transition-colors cursor-pointer"
                            title="Registrar novo aporte"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span>Aporte</span>
                          </button>

                          {/* Rendimento Button */}
                          <button
                            onClick={() => {
                              setYieldAsset(asset);
                              setNewCurrentBalance(asset.current_balance.toString());
                            }}
                            className="flex items-center gap-1 rounded-xl bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            title="Atualizar rendimento mensal"
                          >
                            <Percent className="h-3.5 w-3.5" />
                            <span>Rendimento</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(asset.id, asset.asset_name)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Excluir ativo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Novo Ativo */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Cadastrar Novo Ativo de Investimento
              </h2>
              <button
                onClick={() => setIsAddAssetModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Instituição Financeira / Corretora
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nubank, XP, Tesouro Direto..."
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Nome do Ativo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Caixinha, CDB 120%, Tesouro Selic..."
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Tipo de Ativo
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                >
                  <option value="Reserva de Emergência" className="bg-zinc-900 text-zinc-100">Reserva de Emergência</option>
                  <option value="Renda Fixa Pública" className="bg-zinc-900 text-zinc-100">Renda Fixa Pública (Tesouro Direto)</option>
                  <option value="Renda Fixa Privada" className="bg-zinc-900 text-zinc-100">Renda Fixa Privada (CDB, LCI, LCA)</option>
                  <option value="Ações Brasil" className="bg-zinc-900 text-zinc-100">Ações Brasil (B3)</option>
                  <option value="Fundos Imobiliários" className="bg-zinc-900 text-zinc-100">Fundos Imobiliários (FIIs)</option>
                  <option value="ETFs Internacionais" className="bg-zinc-900 text-zinc-100">ETFs Internacionais (S&P 500, etc.)</option>
                  <option value="Criptoativos" className="bg-zinc-900 text-zinc-100">Criptoativos (BTC, ETH)</option>
                  <option value="Previdência Privada" className="bg-zinc-900 text-zinc-100">Previdência Privada</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Total Aportado / Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={initialInvested}
                    onChange={(e) => setInitialInvested(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Saldo Atual (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Igual ao aportado se vazio"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Registrar Aporte */}
      {contributionAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Registrar Aporte
                </h3>
                <span className="text-xs text-zinc-500">
                  {contributionAsset.asset_name} ({contributionAsset.institution_name})
                </span>
              </div>
              <button
                onClick={() => setContributionAsset(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmContribution} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Valor do Aporte (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 dark:bg-emerald-950/20">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createBudgetExpense}
                    onChange={(e) => setCreateBudgetExpense(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Lançar como Saída de Investimento no Orçamento
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Cria uma despesa do tipo 'Aporte de Investimento' no mês atual, computando no balanço geral.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setContributionAsset(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Atualizar Rendimento / Rentabilidade Mensal */}
      {yieldAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Atualizar Rentabilidade Mensal
                </h3>
                <span className="text-xs text-zinc-500">
                  {yieldAsset.asset_name} ({yieldAsset.institution_name})
                </span>
              </div>
              <button
                onClick={() => setYieldAsset(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmYield} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Mês de Referência (YYYY-MM)
                </label>
                <input
                  type="month"
                  required
                  value={yieldMonthYear}
                  onChange={(e) => setYieldMonthYear(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Rendimento (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={yieldAmount}
                    onChange={(e) => setYieldAmount(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Rentabilidade (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 0.95"
                    value={yieldPercentage}
                    onChange={(e) => setYieldPercentage(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Novo Saldo Atual Consolidado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Atualize o valor na tela da corretora"
                  value={newCurrentBalance}
                  onChange={(e) => setNewCurrentBalance(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:bg-zinc-900 focus:text-zinc-100 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setYieldAsset(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Salvar Rendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
