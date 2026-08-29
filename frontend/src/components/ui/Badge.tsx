import React from 'react';
import { LoanStatus, MemberStatus, TransactionType, UserRole } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  status?: LoanStatus | MemberStatus | TransactionType | UserRole | string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'navy' | 'emerald';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status,
  variant,
  size = 'md',
}) => {
  const text = children || status;

  let computedVariant: string = variant || 'neutral';

  if (!variant && status) {
    switch (status) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'PAID':
      case 'COMPLETED':
        computedVariant = 'success';
        break;
      case 'PENDING':
      case 'PLANNING':
        computedVariant = 'warning';
        break;
      case 'REJECTED':
      case 'DEFAULTED':
      case 'SUSPENDED':
      case 'EXITED':
        computedVariant = 'danger';
        break;
      case 'ADMIN':
        computedVariant = 'navy';
        break;
      case 'TREASURER':
        computedVariant = 'emerald';
        break;
      case 'MEMBER':
        computedVariant = 'neutral';
        break;
      case 'SHARE_PURCHASE':
      case 'SAVINGS_DEPOSIT':
      case 'LOAN_REPAYMENT':
        computedVariant = 'success';
        break;
      case 'SAVINGS_WITHDRAWAL':
      case 'LOAN_DISBURSEMENT':
      case 'SHARE_OUT':
        computedVariant = 'navy';
        break;
      case 'FINE':
        computedVariant = 'danger';
        break;
      default:
        computedVariant = 'neutral';
    }
  }

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-red-50 text-red-800 border border-red-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    navy: 'bg-[#EFF6FF] text-[#1E3E6D] border border-[#BFDBFE]',
    emerald: 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-md tracking-tight ${
        variantStyles[computedVariant as keyof typeof variantStyles] || variantStyles.neutral
      } ${sizeStyles[size]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          computedVariant === 'success'
            ? 'bg-emerald-500'
            : computedVariant === 'warning'
            ? 'bg-amber-500'
            : computedVariant === 'danger'
            ? 'bg-red-500'
            : computedVariant === 'navy'
            ? 'bg-blue-600'
            : 'bg-slate-400'
        }`}
      />
      {text}
    </span>
  );
};
