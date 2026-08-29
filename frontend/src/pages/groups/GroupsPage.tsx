import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Coins,
  Percent,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { groupsApi } from '../../api';
import { VslaGroup, Cycle, MeetingFrequency } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const GroupsPage: React.FC = () => {
  const { isAdmin } = useAuthStore();

  const [group, setGroup] = useState<VslaGroup | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Cycle Modal State
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [newCycleNumber, setNewCycleNumber] = useState<number>(2);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmittingCycle, setIsSubmittingCycle] = useState(false);
  const [cycleError, setCycleError] = useState<string | null>(null);

  const fetchGroupData = async () => {
    setIsLoading(true);
    try {
      const groupsRes = await groupsApi.list({ limit: 1 });
      if (groupsRes.data && groupsRes.data.length > 0) {
        const g = groupsRes.data[0];
        setGroup(g);
        const cyclesRes = await groupsApi.listCycles(g.id);
        const cycleList = cyclesRes.data || [];
        setCycles(cycleList);
        const highestNum = Math.max(0, ...cycleList.map((c) => c.cycleNumber));
        setNewCycleNumber(highestNum + 1);
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, []);

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setCycleError(null);
    setIsSubmittingCycle(true);

    try {
      await groupsApi.createCycle(group.id, {
        cycleNumber: newCycleNumber,
        startDate: new Date(startDate).toISOString(),
        status: 'ACTIVE',
      });
      setIsCycleModalOpen(false);
      await fetchGroupData();
    } catch (err: any) {
      setCycleError(err.response?.data?.message || 'Failed to start new cycle.');
    } finally {
      setIsSubmittingCycle(false);
    }
  };

  const formatCurrency = (val: number | string | undefined) => {
    return `${Number(val || 0).toLocaleString()} RWF`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading VSLA group configuration..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">{group?.name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Group Code: <span className="font-semibold text-slate-700">{group?.code}</span> •
            Constitution & Policy Parameters
          </p>
        </div>
        {isAdmin() && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCycleModalOpen(true)}
            leftIcon={<PlusCircle size={16} />}
          >
            Start New Operational Cycle
          </Button>
        )}
      </div>

      {/* Policy Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Share Price</span>
          <p className="text-base font-bold text-[#0B1F3A] mt-1">
            {formatCurrency(group?.sharePrice)}
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Fixed per unit</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Max Shares / Member</span>
          <p className="text-base font-bold text-slate-900 mt-1">
            {group?.maxSharesPerMember} shares
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Per operational cycle</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Loan Interest Rate</span>
          <p className="text-base font-bold text-emerald-700 mt-1">
            {group?.loanInterestRate}% Flat
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Applied per loan</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Max Loan Duration</span>
          <p className="text-base font-bold text-slate-900 mt-1">
            {group?.maxLoanDurationMonths} months
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Repayment horizon</span>
        </div>
      </div>

      {/* Operational Cycles List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-[#0B1F3A]">Operational Cycles History</h3>
          <p className="text-xs text-slate-500">
            Lifecycle of savings and loan cycles within this VSLA group
          </p>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Cycle #</th>
              <th className="px-4 py-3">Start Date</th>
              <th className="px-4 py-3">End Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cycles.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="px-4 py-3 font-semibold text-slate-900">Cycle #{c.cycleNumber}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(c.startDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Ongoing (Active)'}
                </td>
                <td className="px-4 py-3">
                  <Badge status={c.status} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Start New Cycle Modal */}
      <Modal
        isOpen={isCycleModalOpen}
        onClose={() => setIsCycleModalOpen(false)}
        title="Start New Operational Cycle"
        subtitle="Launching a new cycle will complete any currently active cycle"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCycleModalOpen(false)}
              disabled={isSubmittingCycle}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCycle}
              isLoading={isSubmittingCycle}
            >
              Start Cycle
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCycle} className="space-y-3.5">
          {cycleError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{cycleError}</span>
            </div>
          )}

          <Input
            label="Cycle Number"
            type="number"
            min="1"
            value={newCycleNumber}
            onChange={(e) => setNewCycleNumber(parseInt(e.target.value, 10) || 1)}
            required
          />

          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
