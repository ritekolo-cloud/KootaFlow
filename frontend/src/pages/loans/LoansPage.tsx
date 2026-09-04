import React, { useState, useEffect } from 'react';
import {
  Landmark,
  PlusCircle,
  CheckCircle2,
  XCircle,
  CreditCard,
  Search,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { loansApi, membersApi, groupsApi } from '../../api';
import { Loan, LoanStatus, Member, Cycle, VslaGroup } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const LoansPage: React.FC = () => {
  const { user, isMember, isTreasurer, isAdmin } = useAuthStore();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LoanStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLoans, setTotalLoans] = useState(0);

  // Group & Member Data for Forms
  const [group, setGroup] = useState<VslaGroup | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // 1. Apply Loan Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyMemberId, setApplyMemberId] = useState<number>(0);
  const [applyCycleId, setApplyCycleId] = useState<number>(0);
  const [applyPrincipal, setApplyPrincipal] = useState<string>('20000');
  const [applyDuration, setApplyDuration] = useState<number>(2);
  const [applyPurpose, setApplyPurpose] = useState<string>('');
  const [applyError, setApplyError] = useState<string | null>(null);

  // 2. Approve / Reject Modal State
  const [actionLoan, setActionLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'REPAY' | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // 3. Repayment Modal State
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayReceipt, setRepayReceipt] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [repayError, setRepayError] = useState<string | null>(null);

  // Confirmation state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
        status: statusFilter || undefined,
      };

      if (isMember() && user?.memberProfile?.id) {
        params.memberId = user.memberProfile.id;
      }

      const res = await loansApi.list(params);
      setLoans(res.data || []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
        setTotalLoans(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to load loans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [page, statusFilter, user]);

  useEffect(() => {
    if (isAdmin() || isTreasurer()) {
      groupsApi.list({ limit: 1 }).then(async (res) => {
        if (res.data && res.data.length > 0) {
          const g = res.data[0];
          setGroup(g);
          const cyclesRes = await groupsApi.listCycles(g.id);
          const active = (cyclesRes.data || []).filter((c) => c.status === 'ACTIVE');
          setCycles(active);
          if (active.length > 0) setApplyCycleId(active[0].id);
        }
      }).catch(() => {});

      membersApi.list({ limit: 100 }).then((res) => {
        setMembers(res.data || []);
        if (res.data && res.data.length > 0) setApplyMemberId(res.data[0].id);
      }).catch(() => {});
    }
  }, [user]);

  const formatCurrency = (val: number | string | undefined) => {
    return `${Number(val || 0).toLocaleString()} UGX`;
  };

  // Interest calculation helper for loan application
  const interestRate = Number(group?.loanInterestRate || 10);
  const calculatedPrincipal = parseFloat(applyPrincipal) || 0;
  const calculatedInterest = (calculatedPrincipal * interestRate) / 100;
  const calculatedTotalRepayable = calculatedPrincipal + calculatedInterest;

  // Open Handlers
  const handleOpenApply = () => {
    setIsApplyModalOpen(true);
    setApplyError(null);
    setApplyPrincipal('20000');
    setApplyDuration(2);
    setApplyPurpose('');
    if (isMember() && user?.memberProfile?.id) {
      setApplyMemberId(user.memberProfile.id);
    }
  };

  const handleOpenApprove = (loan: Loan) => {
    setActionLoan(loan);
    setActionType('APPROVE');
    setIsConfirmOpen(true);
  };

  const handleOpenReject = (loan: Loan) => {
    setActionLoan(loan);
    setActionType('REJECT');
    setRejectReason('');
    setIsConfirmOpen(true);
  };

  const handleOpenRepay = (loan: Loan) => {
    setActionLoan(loan);
    setActionType('REPAY');
    setRepayAmount(String(loan.balanceRemaining));
    setRepayReceipt(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setRepayNotes('Regular loan installment repayment');
    setRepayError(null);
  };

  // Apply Form Submission
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);

    const mId = isMember() ? user?.memberProfile?.id : applyMemberId;
    if (!mId) {
      setApplyError('Please select a member.');
      return;
    }
    if (calculatedPrincipal <= 0) {
      setApplyError('Please enter a valid loan principal amount.');
      return;
    }

    setIsProcessing(true);
    try {
      await loansApi.apply({
        memberId: mId,
        cycleId: applyCycleId || cycles[0]?.id || 1,
        principalAmount: calculatedPrincipal,
        durationMonths: applyDuration,
        purpose: applyPurpose || 'General support',
      });
      setIsApplyModalOpen(false);
      await fetchLoans();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || 'Failed to submit loan application.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Confirmation (Approve, Reject, Repay)
  const handleConfirmAction = async () => {
    if (!actionLoan) return;
    setIsProcessing(true);

    try {
      if (actionType === 'APPROVE') {
        await loansApi.approve(actionLoan.id);
      } else if (actionType === 'REJECT') {
        await loansApi.reject(actionLoan.id, rejectReason);
      } else if (actionType === 'REPAY') {
        const numRepay = parseFloat(repayAmount);
        if (!numRepay || numRepay <= 0) {
          setRepayError('Please enter a valid repayment amount.');
          setIsProcessing(false);
          return;
        }
        await loansApi.repay(actionLoan.id, {
          amountPaid: numRepay,
          receiptNumber: repayReceipt,
          notes: repayNotes,
        });
        setActionType(null);
      }
      setIsConfirmOpen(false);
      setActionLoan(null);
      await fetchLoans();
    } catch (err: any) {
      if (actionType === 'REPAY') {
        setRepayError(err.response?.data?.message || 'Repayment failed.');
      } else {
        alert(err.response?.data?.message || 'Operation failed.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading loan records..." />;
  }

  // Active metrics
  const activeLoansList = loans.filter((l) => l.status === 'ACTIVE');
  const totalOutstanding = activeLoansList.reduce((sum, l) => sum + Number(l.balanceRemaining), 0);
  const pendingCount = loans.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">
            {isMember() ? 'My Loans & Credit' : 'Loan Portfolio Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isMember()
              ? 'View personal loans, repayment schedules, and apply for new loans'
              : 'Review loan applications, approve disbursements, and track loan repayments'}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenApply}
          leftIcon={<PlusCircle size={16} />}
        >
          Apply for Loan
        </Button>
      </div>

      {/* KPI Stats (For Officers) */}
      {(isAdmin() || isTreasurer()) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Outstanding Balance"
            value={formatCurrency(totalOutstanding)}
            subtitle="Active unpaid principal & interest"
            icon={<Landmark size={22} />}
            accent="navy"
          />
          <StatCard
            title="Pending Applications"
            value={pendingCount}
            subtitle="Awaiting chairperson approval"
            icon={<Clock size={22} className="text-amber-600" />}
            accent="amber"
          />
          <StatCard
            title="Standard Interest Rate"
            value={`${interestRate}% Flat`}
            subtitle={`Maximum loan term: ${group?.maxLoanDurationMonths || 3} months`}
            icon={<CreditCard size={22} />}
            accent="slate"
          />
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['', 'PENDING', 'ACTIVE', 'PAID', 'REJECTED', 'DEFAULTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Loans' : st}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {loans.length} of {totalLoans} loans
        </span>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {loans.length === 0 ? (
          <EmptyState
            title="No loans found"
            description={
              statusFilter
                ? `No loans matching status "${statusFilter}".`
                : 'No loan records found in this cycle.'
            }
            actionLabel="Apply for Loan"
            onAction={handleOpenApply}
            icon={<Landmark size={24} />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Loan ID</th>
                    {!isMember() && <th className="px-4 py-3">Member</th>}
                    <th className="px-4 py-3">Principal</th>
                    <th className="px-4 py-3">Interest ({interestRate}%)</th>
                    <th className="px-4 py-3">Total Payable</th>
                    <th className="px-4 py-3">Remaining Balance</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loans.map((loan) => {
                    const totalRep = Number(loan.totalRepayable);
                    const balRem = Number(loan.balanceRemaining);
                    const paid = totalRep - balRem;
                    const percentPaid = totalRep > 0 ? Math.min(100, (paid / totalRep) * 100) : 0;

                    return (
                      <tr key={loan.id} className="table-row">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          #{loan.id}
                        </td>
                        {!isMember() && (
                          <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                            {loan.member?.firstName} {loan.member?.lastName}
                            <span className="text-[10px] text-slate-500 block font-normal">
                              {loan.member?.memberNumber}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {formatCurrency(loan.principalAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatCurrency(loan.interestAmount)}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#0B1F3A]">
                          {formatCurrency(loan.totalRepayable)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-amber-700">{formatCurrency(balRem)}</div>
                          {loan.status === 'ACTIVE' && (
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 border border-slate-200">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={loan.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Admin Loan Review Actions */}
                            {loan.status === 'PENDING' && isAdmin() && (
                              <>
                                <button
                                  onClick={() => handleOpenApprove(loan)}
                                  className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-300 font-semibold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleOpenReject(loan)}
                                  className="text-xs px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 font-semibold"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* Treasurer Repayment Action */}
                            {loan.status === 'ACTIVE' && (isTreasurer() || isAdmin()) && (
                              <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => handleOpenRepay(loan)}
                              >
                                Repay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalLoans}
              itemsPerPage={10}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. APPLY LOAN MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Submit Loan Application"
        subtitle="Apply for a new VSLA loan with clear interest calculation"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplySubmit}
              isLoading={isProcessing}
            >
              Submit Application
            </Button>
          </>
        }
      >
        <form onSubmit={handleApplySubmit} className="space-y-3.5">
          {applyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{applyError}</span>
            </div>
          )}

          {!isMember() && (
            <Select
              label="Select Member"
              value={applyMemberId}
              onChange={(e) => setApplyMemberId(parseInt(e.target.value, 10))}
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} — {m.firstName} {m.lastName}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Requested Principal (UGX)"
              type="number"
              min="5000"
              step="1000"
              value={applyPrincipal}
              onChange={(e) => setApplyPrincipal(e.target.value)}
              required
            />
            <Input
              label="Duration (Months)"
              type="number"
              min="1"
              max={group?.maxLoanDurationMonths || 3}
              value={applyDuration}
              onChange={(e) => setApplyDuration(parseInt(e.target.value, 10) || 1)}
              required
              helperText={`Max ${group?.maxLoanDurationMonths || 3} months`}
            />
          </div>

          <Textarea
            label="Loan Purpose"
            placeholder="e.g. Small business working capital, agriculture inputs"
            value={applyPurpose}
            onChange={(e) => setApplyPurpose(e.target.value)}
            rows={2}
          />

          {/* Real-time financial calculation preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Principal:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(calculatedPrincipal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Flat Interest ({interestRate}%):</span>
              <span className="font-semibold text-slate-900">{formatCurrency(calculatedInterest)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200 text-sm">
              <span>Total Repayable:</span>
              <span className="text-[#0B1F3A]">{formatCurrency(calculatedTotalRepayable)}</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          2. RECORD REPAYMENT MODAL (Treasurer)
      ───────────────────────────────────────────────────────────── */}
      {actionType === 'REPAY' && actionLoan && (
        <Modal
          isOpen={true}
          onClose={() => setActionType(null)}
          title={`Record Loan Repayment (Loan #${actionLoan.id})`}
          subtitle={`Member: ${actionLoan.member?.firstName} ${actionLoan.member?.lastName} • Balance: ${formatCurrency(
            actionLoan.balanceRemaining
          )}`}
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setActionType(null)}>
                Cancel
              </Button>
              <Button
                variant="emerald"
                size="sm"
                onClick={handleConfirmAction}
                isLoading={isProcessing}
              >
                Record Payment
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            {repayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{repayError}</span>
              </div>
            )}

            <Input
              label="Payment Amount (UGX)"
              type="number"
              min="100"
              max={Number(actionLoan.balanceRemaining)}
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              required
              helperText={`Maximum outstanding balance: ${formatCurrency(actionLoan.balanceRemaining)}`}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Receipt / Voucher #"
                placeholder="REC-000"
                value={repayReceipt}
                onChange={(e) => setRepayReceipt(e.target.value)}
              />
              <Input
                label="Payment Date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <Input
              label="Notes"
              placeholder="e.g. Month 1 payment"
              value={repayNotes}
              onChange={(e) => setRepayNotes(e.target.value)}
            />

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs flex justify-between">
              <span className="text-slate-600">Balance after payment:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(
                  Math.max(0, Number(actionLoan.balanceRemaining) - (parseFloat(repayAmount) || 0))
                )}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. APPROVE / REJECT CONFIRMATION DIALOG
      ───────────────────────────────────────────────────────────── */}
      {actionLoan && actionType !== 'REPAY' && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleConfirmAction}
          title={actionType === 'APPROVE' ? 'Approve & Disburse Loan' : 'Reject Loan Application'}
          message={
            actionType === 'APPROVE'
              ? `Are you sure you want to approve and disburse this loan of ${formatCurrency(
                  actionLoan.principalAmount
                )} to ${actionLoan.member?.firstName} ${actionLoan.member?.lastName}? This will activate the loan and log a LOAN_DISBURSEMENT transaction.`
              : `Are you sure you want to reject this loan application for ${actionLoan.member?.firstName} ${actionLoan.member?.lastName}?`
          }
          confirmLabel={actionType === 'APPROVE' ? 'Approve & Disburse' : 'Reject Application'}
          variant={actionType === 'APPROVE' ? 'emerald' : 'danger'}
          isLoading={isProcessing}
          details={[
            {
              label: 'Member',
              value: `${actionLoan.member?.firstName} ${actionLoan.member?.lastName}`,
            },
            { label: 'Principal', value: formatCurrency(actionLoan.principalAmount) },
            { label: 'Total Payable', value: formatCurrency(actionLoan.totalRepayable) },
            { label: 'Term', value: `${actionLoan.durationMonths} month(s)` },
          ]}
        />
      )}
    </div>
  );
};
