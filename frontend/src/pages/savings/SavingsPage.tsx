import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  PlusCircle,
  MinusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { savingsApi, membersApi, transactionsApi } from '../../api';
import { SavingsAccount, Member, Transaction } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const SavingsPage: React.FC = () => {
  const { user, isMember, isTreasurer, isOfficer } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [totalGroupSavings, setTotalGroupSavings] = useState<number>(0);
  const [accountCount, setAccountCount] = useState<number>(0);

  // Officer / Treasurer state
  const [members, setMembers] = useState<Member[]>([]);
  const [searchMember, setSearchMember] = useState('');

  // Member-only state
  const [mySavings, setMySavings] = useState<SavingsAccount[]>([]);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);

  // Modals state
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Confirm dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSavingsData = async () => {
    setIsLoading(true);
    try {
      if (isMember() && user?.memberProfile?.id) {
        const memberId = user.memberProfile.id;
        const [savingsRes, txnsRes] = await Promise.all([
          savingsApi.getByMember(memberId),
          transactionsApi.list({ memberId, type: 'SAVINGS_DEPOSIT' }),
        ]);
        setMySavings(savingsRes.data || []);
        setMyTransactions(txnsRes.data?.transactions || []);
      } else if (isOfficer()) {
        const [summaryRes, membersRes] = await Promise.all([
          savingsApi.getSummary(),
          membersApi.list({ limit: 100 }),
        ]);
        setTotalGroupSavings(summaryRes.data?.totalSavings || 0);
        setAccountCount(summaryRes.data?.accountCount || 0);
        setMembers(membersRes.data || []);
        if (membersRes.data && membersRes.data.length > 0) {
          setSelectedMemberId(membersRes.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load savings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavingsData();
  }, [user]);

  const formatCurrency = (val: number | string | undefined) => {
    return `${Number(val || 0).toLocaleString()} RWF`;
  };

  const openDepositModal = (memberId?: number) => {
    setModalType('DEPOSIT');
    setModalError(null);
    setAmount('');
    setDescription('Voluntary savings contribution');
    if (memberId) setSelectedMemberId(memberId);
    else if (members[0]) setSelectedMemberId(members[0].id);
  };

  const openWithdrawModal = (memberId?: number) => {
    setModalType('WITHDRAW');
    setModalError(null);
    setAmount('');
    setDescription('Savings withdrawal');
    if (memberId) setSelectedMemberId(memberId);
    else if (members[0]) setSelectedMemberId(members[0].id);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setModalError('Please enter a valid positive amount.');
      return;
    }

    if (modalType === 'WITHDRAW') {
      const selectedMember = members.find((m) => m.id === selectedMemberId);
      const acc = selectedMember?.savingsAccounts?.[0];
      const currentBalance = Number(acc?.balance || 0);
      if (numAmount > currentBalance) {
        setModalError(
          `Insufficient funds. Current balance: ${formatCurrency(currentBalance)}. Requested: ${formatCurrency(numAmount)}.`
        );
        return;
      }
    }

    setIsConfirmOpen(true);
  };

  const handleExecuteTransaction = async () => {
    setIsProcessing(true);
    try {
      const numAmount = parseFloat(amount);
      if (modalType === 'DEPOSIT') {
        await savingsApi.deposit({
          memberId: selectedMemberId,
          amount: numAmount,
          description,
        });
      } else {
        await savingsApi.withdraw({
          memberId: selectedMemberId,
          amount: numAmount,
          description,
        });
      }
      setIsConfirmOpen(false);
      setModalType(null);
      await fetchSavingsData();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Transaction failed. Please try again.');
      setIsConfirmOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedMemberObj = members.find((m) => m.id === selectedMemberId);

  if (isLoading) {
    return <LoadingSpinner message="Loading savings records..." />;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MEMBER PERSONAL SAVINGS VIEW
  // ─────────────────────────────────────────────────────────────
  if (isMember()) {
    const totalBalance = mySavings.reduce((sum, a) => sum + Number(a.balance), 0);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <h1 className="text-xl font-bold text-[#0B1F3A]">My Savings Account</h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal voluntary savings balance and contribution history
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Current Savings Balance"
            value={formatCurrency(totalBalance)}
            subtitle="Available voluntary savings"
            icon={<PiggyBank size={22} />}
            accent="emerald"
          />
          <StatCard
            title="Account Status"
            value="Active & Earning"
            subtitle="Contributions eligible for cycle share-out"
            icon={<CheckCircle2 size={22} className="text-emerald-600" />}
            accent="navy"
          />
        </div>

        {/* Personal Savings History */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-[#0B1F3A]">My Savings Ledger</h3>
            <p className="text-xs text-slate-500">History of your deposits and withdrawals</p>
          </div>

          {myTransactions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No savings transactions recorded on your account yet.
            </div>
          ) : (
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
                {myTransactions.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="px-4 py-2.5 text-slate-600">
                      {new Date(tx.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge status={tx.type} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{tx.description || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      +{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. OFFICER / TREASURER SAVINGS MANAGEMENT VIEW
  // ─────────────────────────────────────────────────────────────
  const filteredMembers = members.filter((m) => {
    if (!searchMember) return true;
    const q = searchMember.toLowerCase();
    return (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">Savings Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track voluntary member savings, record weekly deposits and processed withdrawals
          </p>
        </div>
        {isTreasurer() && (
          <div className="flex items-center gap-2">
            <Button
              variant="emerald"
              size="sm"
              onClick={() => openDepositModal()}
              leftIcon={<PlusCircle size={16} />}
            >
              Record Deposit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openWithdrawModal()}
              leftIcon={<MinusCircle size={16} />}
            >
              Record Withdrawal
            </Button>
          </div>
        )}
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Group Savings"
          value={formatCurrency(totalGroupSavings)}
          subtitle="Cumulative voluntary savings pool"
          icon={<PiggyBank size={22} />}
          accent="emerald"
        />
        <StatCard
          title="Savings Accounts"
          value={accountCount}
          subtitle="Active member savings accounts"
          icon={<CheckCircle2 size={22} className="text-blue-600" />}
          accent="navy"
        />
      </div>

      {/* Members Savings Registry */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0B1F3A]">Member Savings Registry</h3>
            <p className="text-xs text-slate-500">Individual member savings balances</p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search member..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3">Member #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Account Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Savings Balance</th>
                {isTreasurer() && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => {
                const acc = m.savingsAccounts?.[0];
                const bal = acc?.balance || 0;
                return (
                  <tr key={m.id} className="table-row">
                    <td className="px-4 py-3 font-semibold text-slate-900">{m.memberNumber}</td>
                    <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">Voluntary</td>
                    <td className="px-4 py-3">
                      <Badge status={m.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatCurrency(bal)}
                    </td>
                    {isTreasurer() && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openDepositModal(m.id)}
                            className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium"
                          >
                            + Deposit
                          </button>
                          <button
                            onClick={() => openWithdrawModal(m.id)}
                            className="text-xs px-2 py-1 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded border border-slate-200 font-medium"
                          >
                            - Withdraw
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deposit / Withdrawal Form Modal */}
      {modalType && (
        <Modal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          title={modalType === 'DEPOSIT' ? 'Record Savings Deposit' : 'Record Savings Withdrawal'}
          subtitle="Financial transaction will be logged immediately to the VSLA audit ledger"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setModalType(null)}>
                Cancel
              </Button>
              <Button
                variant={modalType === 'DEPOSIT' ? 'emerald' : 'primary'}
                size="sm"
                onClick={handleOpenConfirm}
              >
                Review & Confirm
              </Button>
            </>
          }
        >
          <form onSubmit={handleOpenConfirm} className="space-y-3.5">
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{modalError}</span>
              </div>
            )}

            <Select
              label="Select Member"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(parseInt(e.target.value, 10))}
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} — {m.firstName} {m.lastName}
                </option>
              ))}
            </Select>

            <Input
              label="Transaction Amount (RWF)"
              type="number"
              min="100"
              step="100"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              helperText={
                modalType === 'WITHDRAW' && selectedMemberObj
                  ? `Available balance: ${formatCurrency(
                      selectedMemberObj.savingsAccounts?.[0]?.balance || 0
                    )}`
                  : undefined
              }
            />

            <Input
              label="Notes / Description"
              placeholder="e.g. Weekly meeting savings contribution"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleExecuteTransaction}
        title={modalType === 'DEPOSIT' ? 'Confirm Savings Deposit' : 'Confirm Savings Withdrawal'}
        message={
          modalType === 'DEPOSIT'
            ? 'Are you sure you want to record this voluntary savings deposit? This will credit the member balance and write to the transaction ledger.'
            : 'Are you sure you want to record this withdrawal? This will deduct the amount from the member balance.'
        }
        confirmLabel={modalType === 'DEPOSIT' ? 'Record Deposit' : 'Process Withdrawal'}
        variant={modalType === 'DEPOSIT' ? 'emerald' : 'primary'}
        isLoading={isProcessing}
        details={[
          {
            label: 'Member',
            value: selectedMemberObj
              ? `${selectedMemberObj.memberNumber} - ${selectedMemberObj.firstName} ${selectedMemberObj.lastName}`
              : 'Unknown',
          },
          { label: 'Amount', value: formatCurrency(amount) },
          { label: 'Type', value: modalType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal' },
        ]}
      />
    </div>
  );
};
