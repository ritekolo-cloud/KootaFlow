import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Coins,
  PieChart,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { shareOutApi, groupsApi } from '../../api';
import { ShareOut, ShareOutPreview, Cycle, VslaGroup } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/FormControls';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const ShareOutPage: React.FC = () => {
  const { user, isAdmin, isStaff } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [preview, setPreview] = useState<ShareOutPreview | null>(null);
  const [pastShareOuts, setPastShareOuts] = useState<ShareOut[]>([]);

  // Workflow state: Step 1 to 5
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [groupsRes, shareOutsRes] = await Promise.all([
        groupsApi.list({ limit: 1 }),
        shareOutApi.list(),
      ]);

      setPastShareOuts(shareOutsRes.data || []);

      if (groupsRes.data && groupsRes.data.length > 0) {
        const currentGroup = groupsRes.data[0];
        const cyclesRes = await groupsApi.listCycles(currentGroup.id);
        const groupCycles = cyclesRes.data || [];
        setCycles(groupCycles);

        const activeCycle = groupCycles.find((c) => c.status === 'ACTIVE') || groupCycles[0];
        if (activeCycle) {
          setSelectedCycleId(activeCycle.id);
        }
      }
    } catch (err) {
      console.error('Failed to load share-out setup:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const loadPreview = async (cycleId: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await shareOutApi.calculate(cycleId);
      setPreview(res.data);
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          'Unable to calculate share-out. This cycle may already be completed or has no shares.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycleId) return;
    loadPreview(selectedCycleId);
  };

  const handleExecuteShareOut = async () => {
    if (!selectedCycleId) return;
    setIsExecuting(true);
    try {
      await shareOutApi.execute({
        cycleId: selectedCycleId,
        notes: `Cycle #${preview?.cycle?.cycleNumber} Share-Out Final Distribution`,
      });
      setIsConfirmOpen(false);
      setExecutionSuccess(true);
      setCurrentStep(5);
      await fetchInitialData();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to execute share-out distribution.');
      setIsConfirmOpen(false);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatCurrency = (val: number | string | undefined) => {
    return `${Number(val || 0).toLocaleString()} UGX`;
  };

  if (isLoading && !preview) {
    return <LoadingSpinner message="Preparing Share-Out Calculation Engine..." />;
  }

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0B1F3A]">VSLA Share-Out & Cycle Conclusion</h1>
            <p className="text-xs text-slate-500 mt-1">
              Final dividend calculation and distribution engine based on member shareholdings and loan deductions
            </p>
          </div>
          <Badge status="SHARE_OUT" size="md" />
        </div>

        {/* 5-Step Progress Stepper */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { num: 1, label: 'Select Cycle' },
              { num: 2, label: 'Pool Valuation' },
              { num: 3, label: 'Gross Dividend' },
              { num: 4, label: 'Loan Deductions' },
              { num: 5, label: 'Execution & Payout' },
            ].map((st) => (
              <div key={st.num} className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-colors ${
                    currentStep >= st.num
                      ? 'bg-[#0B1F3A] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {st.num}
                </div>
                <span
                  className={`text-[11px] font-medium hidden sm:block ${
                    currentStep >= st.num ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-xs flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: SELECT CYCLE
      ───────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs max-w-xl mx-auto space-y-4">
          <h2 className="text-base font-semibold text-[#0B1F3A]">Step 1: Select Operational Cycle</h2>
          <p className="text-xs text-slate-500">
            Select the active cycle to calculate final dividends. Share-out requires active share records and concludes the cycle.
          </p>

          <form onSubmit={handleSelectCycle} className="space-y-4 pt-2">
            {cycles.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                No operational cycles available yet. Please create a VSLA group and start a cycle.
              </div>
            ) : (
              <Select
                label="Operational Cycle"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(parseInt(e.target.value, 10))}
                required
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    Cycle #{c.cycleNumber} — Status: {c.status} (Started:{' '}
                    {new Date(c.startDate).toLocaleDateString()})
                  </option>
                ))}
              </Select>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={cycles.length === 0}
              rightIcon={<ArrowRight size={16} />}
            >
              Calculate Cycle Valuation Preview
            </Button>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEPS 2, 3, 4: PREVIEW CALCULATIONS & DISTRIBUTION TABLE
      ───────────────────────────────────────────────────────────── */}
      {preview && currentStep >= 2 && currentStep <= 4 && (
        <div className="space-y-6">
          {/* Key Calculation Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Distributable Funds"
              value={formatCurrency(preview.totalFunds)}
              subtitle="Shares + Voluntary Savings + Interest Collected"
              icon={<Coins size={22} />}
              accent="emerald"
            />
            <StatCard
              title="Total Shares Recorded"
              value={`${preview.totalShares} shares`}
              subtitle={`Across ${preview.memberBreakdown.length} active participating members`}
              icon={<PieChart size={22} />}
              accent="navy"
            />
            <StatCard
              title="Final Value Per Share"
              value={formatCurrency(preview.valuePerShare)}
              subtitle="Distribution formula: Total Pool ÷ Total Shares"
              icon={<TrendingUp size={22} className="text-emerald-600" />}
              accent="emerald"
            />
          </div>

          {/* Detailed Member Distribution Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1F3A]">
                  Member Payout Breakdown (Cycle #{preview.cycle.cycleNumber})
                </h3>
                <p className="text-xs text-slate-500">
                  Gross Dividend minus outstanding unpaid active loans equals Net Member Cash Payout
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                Formula: Value/Share = {formatCurrency(preview.valuePerShare)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Member #</th>
                    <th className="px-4 py-3">Member Name</th>
                    <th className="px-4 py-3 text-center">Shares Owned</th>
                    <th className="px-4 py-3 text-right">Gross Amount</th>
                    <th className="px-4 py-3 text-right text-red-600">Loan Deductions</th>
                    <th className="px-4 py-3 text-right text-emerald-700 font-bold">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.memberBreakdown.map((mb) => (
                    <tr key={mb.memberId} className="table-row">
                      <td className="px-4 py-3 font-semibold text-slate-900">{mb.memberNumber}</td>
                      <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                        {mb.firstName} {mb.lastName}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {mb.sharesOwned} shares
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(mb.grossAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {mb.loanDeductions > 0 ? `-${formatCurrency(mb.loanDeductions)}` : '0 UGX'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">
                        {formatCurrency(mb.netPayout)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                Change Cycle Selection
              </Button>
              {isAdmin() ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsConfirmOpen(true)}
                  leftIcon={<ShieldCheck size={18} />}
                >
                  Authorize & Execute Share-Out
                </Button>
              ) : (
                <span className="text-xs text-slate-500 font-medium italic">
                  Note: Execution requires Administrator authorization.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 5: EXECUTION SUCCESS CONFIRMATION
      ───────────────────────────────────────────────────────────── */}
      {currentStep === 5 && executionSuccess && (
        <div className="bg-white rounded-lg border border-emerald-200 p-8 text-center max-w-xl mx-auto shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">Share-Out Successfully Executed!</h2>
          <p className="text-xs text-slate-600">
            Dividends have been calculated and credited. The operational cycle is now officially marked as COMPLETED, and all financial movements were written to the transaction ledger.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCurrentStep(1);
              setPreview(null);
              setExecutionSuccess(false);
            }}
          >
            Return to Share-Out Home
          </Button>
        </div>
      )}

      {/* Past Share-Out History */}
      {pastShareOuts.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Past Share-Out Records</h3>
            <p className="text-xs text-slate-500">Historical cycle distributions</p>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Cycle</th>
                <th className="px-4 py-2.5">Total Funds</th>
                <th className="px-4 py-2.5">Total Shares</th>
                <th className="px-4 py-2.5 text-right">Value / Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastShareOuts.map((so) => (
                <tr key={so.id} className="table-row">
                  <td className="px-4 py-2.5 text-slate-600">
                    {new Date(so.distributionDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">
                    Cycle #{so.cycle?.cycleNumber || so.cycleId}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">
                    {formatCurrency(so.totalFunds)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{so.totalShares} shares</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                    {formatCurrency(so.valuePerShare)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Final Execution Confirmation Dialog */}
      {preview && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleExecuteShareOut}
          title="Confirm Share-Out Execution"
          message="Are you sure you want to execute this share-out? This is a permanent financial operation that will: distribute net payouts to all members, mark all remaining active loans as defaulted/deducted, and mark the operational cycle as COMPLETED."
          confirmLabel="Authorize & Conclude Cycle"
          variant="primary"
          isLoading={isExecuting}
          details={[
            { label: 'Cycle', value: `Cycle #${preview.cycle.cycleNumber}` },
            { label: 'Total Pool', value: formatCurrency(preview.totalFunds) },
            { label: 'Total Shares', value: `${preview.totalShares} shares` },
            { label: 'Value per Share', value: formatCurrency(preview.valuePerShare) },
            { label: 'Participating Members', value: `${preview.memberBreakdown.length} members` },
          ]}
        />
      )}
    </div>
  );
};
