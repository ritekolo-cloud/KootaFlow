import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  CreditCard,
  Building,
  PiggyBank,
  PieChart,
  Landmark,
  Calendar,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import { membersApi } from '../../api';
import { Member, Transaction } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [ledger, setLedger] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'shares' | 'savings' | 'loans' | 'ledger'>('overview');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [memberRes, ledgerRes] = await Promise.all([
          membersApi.get(parseInt(id, 10)),
          membersApi.getLedger(parseInt(id, 10), { limit: 20 }),
        ]);
        setMember(memberRes.data);
        setLedger(ledgerRes.data || []);
      } catch (err) {
        console.error('Failed to load member profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const formatCurrency = (amount: number | string | undefined) => {
    return `${Number(amount || 0).toLocaleString()} UGX`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading member profile..." />;
  }

  if (!member) {
    return (
      <div className="text-center p-8 bg-white rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">Member Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested member profile does not exist or has been removed.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/members')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const totalSavings = (member.savingsAccounts || []).reduce((sum, a) => sum + Number(a.balance), 0);
  const totalSharesCount = (member.shares || []).reduce((sum, s) => sum + s.quantity, 0);
  const totalSharesValue = (member.shares || []).reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const activeLoans = (member.loans || []).filter((l) => l.status === 'ACTIVE');
  const totalLoanBalance = activeLoans.reduce((sum, l) => sum + Number(l.balanceRemaining), 0);

  return (
    <div className="space-y-5">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/members')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-xs text-slate-500">
            Member Code: <span className="font-semibold text-slate-700">{member.memberNumber}</span> • {member.group?.name}
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Phone Number</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">{member.phone || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">National ID / Document</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">{member.nationalId || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Date Joined</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {new Date(member.joinedAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Membership Status</span>
            <div className="mt-1">
              <Badge status={member.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
            <span className="text-slate-500 text-[11px] uppercase font-semibold">Total Savings</span>
            <p className="text-base font-bold text-emerald-700 mt-0.5">{formatCurrency(totalSavings)}</p>
          </div>
          <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
            <span className="text-slate-500 text-[11px] uppercase font-semibold">Share Holdings</span>
            <p className="text-base font-bold text-[#0B1F3A] mt-0.5">
              {totalSharesCount} shares ({formatCurrency(totalSharesValue)})
            </p>
          </div>
          <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
            <span className="text-slate-500 text-[11px] uppercase font-semibold">Active Loan Balance</span>
            <p className="text-base font-bold text-amber-700 mt-0.5">{formatCurrency(totalLoanBalance)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-semibold">
        {(['overview', 'shares', 'savings', 'loans', 'ledger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[#0B1F3A] text-[#0B1F3A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
        {activeTab === 'overview' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-[#0B1F3A]">VSLA Group Parameters</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded border border-slate-200">
              <div>
                <span className="text-slate-500">Group Code:</span>
                <p className="font-semibold text-slate-900">{member.group?.code}</p>
              </div>
              <div>
                <span className="text-slate-500">Share Price:</span>
                <p className="font-semibold text-slate-900">{formatCurrency(member.group?.sharePrice)}</p>
              </div>
              <div>
                <span className="text-slate-500">Max Shares Allowed:</span>
                <p className="font-semibold text-slate-900">{member.group?.maxSharesPerMember} shares</p>
              </div>
              <div>
                <span className="text-slate-500">Loan Interest Rate:</span>
                <p className="font-semibold text-slate-900">{member.group?.loanInterestRate}%</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shares' && (
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A] mb-3">Share Purchase Records</h3>
            {!member.shares || member.shares.length === 0 ? (
              <p className="text-xs text-slate-500">No share purchases recorded for this member.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Price Per Share</th>
                    <th className="px-3 py-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {member.shares.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="px-3 py-2">{new Date(s.purchaseDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{s.quantity} shares</td>
                      <td className="px-3 py-2">{formatCurrency(s.pricePerShare)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#0B1F3A]">{formatCurrency(s.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'savings' && (
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A] mb-3">Voluntary Savings Accounts</h3>
            {!member.savingsAccounts || member.savingsAccounts.length === 0 ? (
              <p className="text-xs text-slate-500">No savings accounts found.</p>
            ) : (
              <div className="space-y-3">
                {member.savingsAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-xs text-slate-900">{acc.accountType} Savings</p>
                      <p className="text-[11px] text-slate-500">Account ID: #{acc.id}</p>
                    </div>
                    <p className="text-base font-bold text-emerald-700">{formatCurrency(acc.balance)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'loans' && (
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A] mb-3">Loan History</h3>
            {!member.loans || member.loans.length === 0 ? (
              <p className="text-xs text-slate-500">No loans recorded for this member.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Principal</th>
                    <th className="px-3 py-2">Interest</th>
                    <th className="px-3 py-2">Total Payable</th>
                    <th className="px-3 py-2">Remaining Balance</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {member.loans.map((l) => (
                    <tr key={l.id} className="table-row">
                      <td className="px-3 py-2">{new Date(l.createdAt || '').toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(l.principalAmount)}</td>
                      <td className="px-3 py-2">{l.interestRate}% ({formatCurrency(l.interestAmount)})</td>
                      <td className="px-3 py-2 font-bold text-[#0B1F3A]">{formatCurrency(l.totalRepayable)}</td>
                      <td className="px-3 py-2 font-semibold text-amber-700">{formatCurrency(l.balanceRemaining)}</td>
                      <td className="px-3 py-2">
                        <Badge status={l.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'ledger' && (
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A] mb-3">Member Financial Audit Ledger</h3>
            {ledger.length === 0 ? (
              <p className="text-xs text-slate-500">No financial transactions recorded.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((tx) => (
                    <tr key={tx.id} className="table-row">
                      <td className="px-3 py-2 text-slate-600">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <Badge status={tx.type} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-slate-700">{tx.description || '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
