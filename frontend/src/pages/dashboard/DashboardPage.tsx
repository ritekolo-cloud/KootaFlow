import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiggyBank,
  PieChart,
  Landmark,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { dashboardApi, savingsApi, sharesApi, loansApi, transactionsApi } from '../../api';
import { DashboardStats, Loan, Transaction, SavingsAccount, Share } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const DashboardPage: React.FC = () => {
  const { user, isMember, isOfficer, isChairperson, isTreasurer } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Member-specific state
  const [memberSavings, setMemberSavings] = useState<SavingsAccount[]>([]);
  const [memberShares, setMemberShares] = useState<{ shares: Share[]; summary: { totalShares: number; totalValue: number } } | null>(null);
  const [memberLoans, setMemberLoans] = useState<Loan[]>([]);
  const [memberTransactions, setMemberTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (isMember() && user?.memberProfile?.id) {
          const memberId = user.memberProfile.id;
          const [savingsRes, sharesRes, loansRes, txnsRes] = await Promise.all([
            savingsApi.getByMember(memberId),
            sharesApi.getByMember(memberId),
            loansApi.list({ memberId }),
            transactionsApi.list({ memberId, limit: 5 }),
          ]);
          setMemberSavings(savingsRes.data || []);
          setMemberShares(sharesRes.data);
          setMemberLoans(loansRes.data || []);
          setMemberTransactions(txnsRes.data?.transactions || []);
        } else if (isOfficer()) {
          const res = await dashboardApi.get();
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const num = Number(amount || 0);
    return `${num.toLocaleString()} RWF`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MEMBER PERSONAL DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────
  if (isMember()) {
    const totalSavings = memberSavings.reduce((sum, a) => sum + Number(a.balance), 0);
    const activeLoan = memberLoans.find(
      (l) => l.status === 'ACTIVE' || l.status === 'APPROVED' || l.status === 'PENDING'
    );
    const sharesCount = memberShares?.summary?.totalShares || 0;
    const sharesValue = memberShares?.summary?.totalValue || 0;

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#0B1F3A]">
              {getTimeGreeting()}, {user?.firstName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Member ID:{' '}
              <span className="font-semibold text-slate-700">
                {user?.memberProfile?.memberNumber || 'Pending'}
              </span>{' '}
              • Personal Financial Portal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/savings')}
              leftIcon={<PiggyBank size={16} />}
            >
              My Savings
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/loans')}
              leftIcon={<PlusCircle size={16} />}
            >
              Apply for Loan
            </Button>
          </div>
        </div>

        {/* Member KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="My Savings Balance"
            value={formatCurrency(totalSavings)}
            subtitle="Voluntary Savings"
            icon={<PiggyBank size={20} />}
            accent="emerald"
            onClick={() => navigate('/savings')}
          />
          <StatCard
            title="My Share Holdings"
            value={`${sharesCount} shares`}
            subtitle={`Valuation: ${formatCurrency(sharesValue)}`}
            icon={<PieChart size={20} />}
            accent="navy"
            onClick={() => navigate('/shares')}
          />
          <StatCard
            title="Active Loan Balance"
            value={activeLoan ? formatCurrency(activeLoan.balanceRemaining) : '0 RWF'}
            subtitle={
              activeLoan
                ? `Status: ${activeLoan.status} • Due ${
                    activeLoan.dueDate
                      ? new Date(activeLoan.dueDate).toLocaleDateString()
                      : 'Pending'
                  }`
                : 'No active loan'
            }
            icon={<Landmark size={20} />}
            accent={activeLoan ? 'amber' : 'slate'}
            onClick={() => navigate('/loans')}
          />
        </div>

        {/* Active Loan Progress (if member has an active loan) */}
        {activeLoan && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0B1F3A]">Current Loan Status</h3>
                <p className="text-xs text-slate-500">
                  Principal: {formatCurrency(activeLoan.principalAmount)} • Total Repayable:{' '}
                  {formatCurrency(activeLoan.totalRepayable)}
                </p>
              </div>
              <Badge status={activeLoan.status} />
            </div>

            {/* Progress Bar */}
            {activeLoan.status === 'ACTIVE' && (
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                  <span>
                    Repaid:{' '}
                    {formatCurrency(
                      Number(activeLoan.totalRepayable) - Number(activeLoan.balanceRemaining)
                    )}
                  </span>
                  <span>Remaining: {formatCurrency(activeLoan.balanceRemaining)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-[#10B981] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((Number(activeLoan.totalRepayable) - Number(activeLoan.balanceRemaining)) /
                            Number(activeLoan.totalRepayable)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Personal Transactions */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F3A]">Recent Personal Transactions</h3>
              <p className="text-xs text-slate-500">Your latest savings, shares, and loan activity</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/transactions')}
              rightIcon={<ArrowRight size={14} />}
            >
              View Full Ledger
            </Button>
          </div>

          {memberTransactions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No transactions recorded yet on your account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberTransactions.map((tx) => (
                    <tr key={tx.id} className="table-row">
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge status={tx.type} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{tx.description || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. OFFICER / ADMIN OPERATIONAL DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">
            {getTimeGreeting()}, {user?.firstName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role: <span className="font-semibold text-slate-700">{user?.role}</span> • VSLA
            Operational Overview & Management
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isTreasurer() && (
            <>
              <Button
                variant="emerald"
                size="sm"
                onClick={() => navigate('/savings')}
                leftIcon={<PlusCircle size={16} />}
              >
                Record Deposit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/shares')}
                leftIcon={<PieChart size={16} />}
              >
                Purchase Shares
              </Button>
            </>
          )}
          {isChairperson() && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/loans')}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Loan Approvals ({stats?.loans?.pending || 0})
            </Button>
          )}
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Group Savings"
          value={formatCurrency(stats?.financials?.totalSavings)}
          subtitle="All Active Accounts"
          icon={<PiggyBank size={20} />}
          accent="emerald"
          onClick={() => navigate('/savings')}
        />
        <StatCard
          title="Loan Portfolio"
          value={formatCurrency(stats?.loans?.totalOutstanding)}
          subtitle={`${stats?.loans?.active || 0} active loans outstanding`}
          icon={<Landmark size={20} />}
          accent="navy"
          onClick={() => navigate('/loans')}
        />
        <StatCard
          title="Total Shares Value"
          value={formatCurrency(stats?.financials?.totalShareValue)}
          subtitle="Current Cycle Pool"
          icon={<PieChart size={20} />}
          accent="navy"
          onClick={() => navigate('/shares')}
        />
        <StatCard
          title="Active Members"
          value={stats?.overview?.activeMembers || 0}
          subtitle={`Total: ${stats?.overview?.totalMembers || 0} registered`}
          icon={<Users size={20} />}
          accent="slate"
          onClick={() => navigate('/members')}
        />
      </div>

      {/* Secondary Operational Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total Loans Disbursed</p>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {formatCurrency(stats?.loans?.totalDisbursed)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <ArrowUpRight size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Total Repayments Collected</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {formatCurrency(stats?.loans?.totalRepaid)}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ArrowDownLeft size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Pending Loan Reviews</p>
            <p className="text-lg font-bold text-amber-600 mt-1">{stats?.loans?.pending || 0}</p>
          </div>
          <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Pending Loan Applications Queue (Important for Chairperson & Officers) */}
      {stats?.pendingLoanDetails && stats.pendingLoanDetails.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-amber-50/50 border-b border-amber-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-900">
                Pending Loan Applications ({stats.pendingLoanDetails.length})
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/loans')}
              rightIcon={<ArrowRight size={14} />}
            >
              Manage in Loans
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">Requested Principal</th>
                  <th className="px-4 py-2.5">Interest Rate</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Purpose</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.pendingLoanDetails.map((loan) => (
                  <tr key={loan.id} className="table-row">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {loan.member?.firstName} {loan.member?.lastName}
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {loan.member?.memberNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0B1F3A]">
                      {formatCurrency(loan.principalAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{loan.interestRate}%</td>
                    <td className="px-4 py-3 text-slate-600">{loan.durationMonths} month(s)</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {loan.purpose || 'General support'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/loans`)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Ledger Activity */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Recent Financial Activity</h3>
            <p className="text-xs text-slate-500">Live operational transactions across the group</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transactions')}
            rightIcon={<ArrowRight size={14} />}
          >
            Full Transaction Ledger
          </Button>
        </div>

        {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No transactions recorded yet in this cycle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {new Date(tx.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {tx.member ? `${tx.member.firstName} ${tx.member.lastName}` : 'Group Fund'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge status={tx.type} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{tx.description || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
