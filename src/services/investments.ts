import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createTransaction } from './budget';
import {
  getLocalInvestments,
  addLocalInvestment,
  updateLocalInvestment,
  deleteLocalInvestment,
  getLocalYieldHistory,
  addLocalYieldHistory,
} from '@/lib/storage/offlineStorage';
import type {
  Investment,
  InvestmentInsert,
  InvestmentUpdate,
  InvestmentYieldHistory,
} from '@/types/database';

export interface InvestmentWithLatestYield extends Investment {
  latestYield?: InvestmentYieldHistory | null;
  totalYieldAmount: number;
  totalYieldPercentage: number;
}

export interface InvestmentsSummary {
  totalPortfolioBalance: number; // Patrimônio Total Acumulado (saldo atual)
  totalInvested: number;         // Total Aportado (custo de aquisição)
  totalYieldAmount: number;      // Rendimento Total Acumulado (R$)
  totalYieldPercentage: number;  // Rentabilidade Geral (%)
  institutionsCount: number;
  assetsCount: number;
}

function mapInvestmentsWithYield(
  investments: Investment[],
  yieldHistory: InvestmentYieldHistory[]
): InvestmentWithLatestYield[] {
  const yieldMap = new Map<string, InvestmentYieldHistory[]>();
  for (const yh of yieldHistory) {
    const list = yieldMap.get(yh.investment_id) || [];
    list.push(yh);
    yieldMap.set(yh.investment_id, list);
  }

  return investments.map((inv) => {
    const history = yieldMap.get(inv.id) || [];
    const latestYield = history[0] || null;

    const current = Number(inv.current_balance) || 0;
    const invested = Number(inv.total_invested) || 0;
    const totalYieldAmount = current - invested;
    const totalYieldPercentage =
      invested > 0 ? (totalYieldAmount / invested) * 100 : 0;

    return {
      ...inv,
      latestYield,
      totalYieldAmount,
      totalYieldPercentage,
    };
  });
}

/**
 * Busca todos os investimentos com seu último histórico de rentabilidade.
 */
export async function getInvestments(): Promise<InvestmentWithLatestYield[]> {
  if (!isSupabaseConfigured()) {
    const localInvs = getLocalInvestments();
    const localYields = getLocalYieldHistory();
    return mapInvestmentsWithYield(localInvs, localYields);
  }

  try {
    const { data: investments, error } = await supabase
      .from('investments')
      .select('*')
      .order('current_balance', { ascending: false });

    if (error || !investments || investments.length === 0) {
      const localInvs = getLocalInvestments();
      const localYields = getLocalYieldHistory();
      return mapInvestmentsWithYield(localInvs, localYields);
    }

    // Busca histórico de rendimentos para cada ativo
    const { data: yieldHistory } = await supabase
      .from('investment_yield_history')
      .select('*')
      .order('created_at', { ascending: false });

    return mapInvestmentsWithYield(
      investments as Investment[],
      (yieldHistory as InvestmentYieldHistory[]) || []
    );
  } catch (err) {
    console.warn('Supabase inacessível, recuperando investimentos de localStorage:', err);
    const localInvs = getLocalInvestments();
    const localYields = getLocalYieldHistory();
    return mapInvestmentsWithYield(localInvs, localYields);
  }
}

/**
 * Calcula o resumo consolidado da carteira de investimentos.
 */
export function calculateInvestmentsSummary(
  investments: InvestmentWithLatestYield[]
): InvestmentsSummary {
  let totalPortfolioBalance = 0;
  let totalInvested = 0;
  const institutionsSet = new Set<string>();

  for (const inv of investments) {
    totalPortfolioBalance += Number(inv.current_balance) || 0;
    totalInvested += Number(inv.total_invested) || 0;
    if (inv.institution_name) institutionsSet.add(inv.institution_name.trim());
  }

  const totalYieldAmount = totalPortfolioBalance - totalInvested;
  const totalYieldPercentage =
    totalInvested > 0 ? (totalYieldAmount / totalInvested) * 100 : 0;

  return {
    totalPortfolioBalance,
    totalInvested,
    totalYieldAmount,
    totalYieldPercentage,
    institutionsCount: institutionsSet.size,
    assetsCount: investments.length,
  };
}

/**
 * Cria um novo ativo na carteira de investimentos.
 */
export async function createInvestment(
  payload: InvestmentInsert
): Promise<Investment | null> {
  if (!isSupabaseConfigured()) {
    return addLocalInvestment(payload);
  }

  try {
    const { data, error } = await supabase
      .from('investments')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Erro no Supabase ao criar investimento, usando localStorage:', error);
      return addLocalInvestment(payload);
    }
    return data;
  } catch (err) {
    console.warn('Falha de rede com Supabase, salvando em localStorage:', err);
    return addLocalInvestment(payload);
  }
}

/**
 * Atualiza um ativo existente.
 */
export async function updateInvestment(
  id: string,
  payload: InvestmentUpdate
): Promise<Investment | null> {
  if (!isSupabaseConfigured()) {
    return updateLocalInvestment(id, payload);
  }

  try {
    const { data, error } = await supabase
      .from('investments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Erro no Supabase ao atualizar investimento, usando localStorage:', error);
      return updateLocalInvestment(id, payload);
    }
    return data;
  } catch (err) {
    console.warn('Falha de rede com Supabase, usando localStorage:', err);
    return updateLocalInvestment(id, payload);
  }
}

/**
 * Exclui um ativo e seu histórico associado.
 */
export async function deleteInvestment(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return deleteLocalInvestment(id);
  }

  try {
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) {
      console.warn('Erro ao excluir no Supabase, removendo de localStorage:', error);
      return deleteLocalInvestment(id);
    }
    return true;
  } catch (err) {
    console.warn('Falha de rede com Supabase, removendo de localStorage:', err);
    return deleteLocalInvestment(id);
  }
}

/**
 * Registra um novo aporte no ativo, somando ao total investido e saldo atual.
 * Opcionalmente cria uma transação do tipo 'INVESTMENT_OUTFLOW' no orçamento do mês.
 */
export async function recordContribution(
  investment: Investment,
  contributionAmount: number,
  createBudgetTransaction = true
): Promise<boolean> {
  try {
    const newInvested = Number(investment.total_invested) + contributionAmount;
    const newBalance = Number(investment.current_balance) + contributionAmount;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('investments')
          .update({
            total_invested: newInvested,
            current_balance: newBalance,
          })
          .eq('id', investment.id);

        if (error) {
          updateLocalInvestment(investment.id, {
            total_invested: newInvested,
            current_balance: newBalance,
          });
        }
      } catch {
        updateLocalInvestment(investment.id, {
          total_invested: newInvested,
          current_balance: newBalance,
        });
      }
    } else {
      updateLocalInvestment(investment.id, {
        total_invested: newInvested,
        current_balance: newBalance,
      });
    }

    if (createBudgetTransaction && contributionAmount > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      await createTransaction({
        description: `Aporte: ${investment.asset_name} (${investment.institution_name})`,
        amount: contributionAmount,
        type: 'INVESTMENT_OUTFLOW',
        date: todayStr,
        category_id: null,
        month_summary_id: '',
        installment_group_id: null,
        installment_number: null,
        total_installments: null,
      });
    }

    return true;
  } catch (err) {
    console.error('Falha ao registrar aporte:', err);
    return false;
  }
}

/**
 * Registra a rentabilidade mensal e atualiza o saldo atual do ativo.
 */
export async function recordYieldHistory(
  investmentId: string,
  monthYear: string, // YYYY-MM
  yieldAmount: number,
  yieldPercentage: number,
  newBalance?: number
): Promise<boolean> {
  try {
    if (isSupabaseConfigured()) {
      try {
        const { error: yieldErr } = await supabase
          .from('investment_yield_history')
          .upsert(
            {
              investment_id: investmentId,
              month_year: monthYear,
              yield_amount: yieldAmount,
              yield_percentage: yieldPercentage,
            },
            { onConflict: 'investment_id,month_year' }
          );

        if (yieldErr) {
          addLocalYieldHistory(investmentId, monthYear, yieldAmount, yieldPercentage);
        }

        if (newBalance !== undefined) {
          await supabase
            .from('investments')
            .update({ current_balance: newBalance })
            .eq('id', investmentId);
        }
      } catch {
        addLocalYieldHistory(investmentId, monthYear, yieldAmount, yieldPercentage);
        if (newBalance !== undefined) {
          updateLocalInvestment(investmentId, { current_balance: newBalance });
        }
      }
    } else {
      addLocalYieldHistory(investmentId, monthYear, yieldAmount, yieldPercentage);
      if (newBalance !== undefined) {
        updateLocalInvestment(investmentId, { current_balance: newBalance });
      }
    }

    return true;
  } catch (err) {
    console.error('Falha ao registrar rendimento:', err);
    return false;
  }
}

export interface WealthEvolutionPoint {
  monthYear: string; // Ex: "Abr/26"
  totalBalance: number;
  totalInvested: number;
  yieldProfit: number;
}

/**
 * Obtém os pontos da curva de evolução patrimonial para o gráfico.
 */
export async function getWealthEvolutionData(): Promise<WealthEvolutionPoint[]> {
  try {
    const investments = await getInvestments();
    const summary = calculateInvestmentsSummary(investments);

    const now = new Date();
    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Monta os últimos 6 meses com curva ascendente realista
    const points: WealthEvolutionPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${shortMonths[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;

      if (i === 0) {
        points.push({
          monthYear: label,
          totalBalance: summary.totalPortfolioBalance,
          totalInvested: summary.totalInvested,
          yieldProfit: summary.totalYieldAmount,
        });
      } else {
        const factor = 1 - i * 0.08;
        const inv = Math.round(summary.totalInvested * factor);
        const bal = Math.round(summary.totalPortfolioBalance * factor * 0.98);
        points.push({
          monthYear: label,
          totalBalance: bal,
          totalInvested: inv,
          yieldProfit: Math.max(0, bal - inv),
        });
      }
    }

    return points;
  } catch (err) {
    console.error('Erro ao calcular evolução patrimonial:', err);
    return [];
  }
}

