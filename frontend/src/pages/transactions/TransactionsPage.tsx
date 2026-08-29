import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Filter,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { transactionsApi } from '../../api';
import { Transaction, TransactionType } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const TransactionsPage: React.FC = () => {
  const { user, isMember } = useAuthStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: 15,
        type: typeFilter || undefined,
      };

      if (isMember() && user?.memberProfile?.id) {
        params.memberId = user.memberProfile.id;
      }

      const res = await transactionsApi.list(params);
      setTransactions(res.data?.transactions || []);
      setTotals(res.data?.totals || {});
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
        setTotalItems(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter, user]);

  const formatCurrency = (amount: number | string | undefined) => {
    return `${Number(amount || 0).toLocaleString()} RWF`;
  };

  const isCreditType = (type: TransactionType) => {
    return [
      'SHARE_PURCHASE',
      'SAVINGS_DEPOSIT',
      'LOAN_REPAYMENT',
      'WELFARE_CONTRIBUTION',
    ].includes(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">
            {isMember() ? 'My Personal Financial Ledger' : 'VSLA Transaction Audit Ledger'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isMember()
              ? 'Complete immutable audit log of your contributions, shares, and repayments'
              : 'Complete immutable audit ledger of all monetary movements and cash inflows/outflows'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: '', label: 'All Transactions' },
            { value: 'SHARE_PURCHASE', label: 'Shares' },
            { value: 'SAVINGS_DEPOSIT', label: 'Deposits' },
            { value: 'SAVINGS_WITHDRAWAL', label: 'Withdrawals' },
            { value: 'LOAN_DISBURSEMENT', label: 'Disbursements' },
            { value: 'LOAN_REPAYMENT', label: 'Repayments' },
            { value: 'SHARE_OUT', label: 'Share-Out' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setTypeFilter(t.value as TransactionType | '');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                typeFilter === t.value
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {transactions.length} of {totalItems} records
        </span>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading audit ledger records..." />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No transaction records match the selected criteria."
            icon={<ArrowLeftRight size={24} />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Txn #</th>
                    <th className="px-4 py-3">Date & Time</th>
                    {!isMember() && <th className="px-4 py-3">Member</th>}
                    <th className="px-4 py-3">Transaction Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount (RWF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const isCredit = isCreditType(tx.type);
                    return (
                      <tr key={tx.id} className="table-row">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-500 text-[11px]">
                          TX-{String(tx.id).padStart(5, '0')}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {new Date(tx.transactionDate).toLocaleDateString()}
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(tx.transactionDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        {!isMember() && (
                          <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                            {tx.member ? (
                              <>
                                {tx.member.firstName} {tx.member.lastName}
                                <span className="text-[10px] text-slate-500 block font-normal">
                                  {tx.member.memberNumber}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-500 italic">Group Treasury</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Badge status={tx.type} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-sm">
                          {tx.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-bold">
                          <span
                            className={
                              isCredit ? 'text-emerald-700 font-bold' : 'text-slate-900 font-bold'
                            }
                          >
                            {isCredit ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
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
              totalItems={totalItems}
              itemsPerPage={15}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
