import React from 'react';

interface MoneyDisplayProps {
  amount: number | string | undefined | null;
  currency?: string;
  type?: 'positive' | 'negative' | 'neutral' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSign?: boolean;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  currency = 'UGX',
  type = 'neutral',
  size = 'md',
  className = '',
  showSign = false,
}) => {
  const numericValue = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const isPositive = numericValue > 0;
  const isNegative = numericValue < 0;

  let computedType: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (type === 'auto') {
    if (isPositive) computedType = 'positive';
    else if (isNegative) computedType = 'negative';
    else computedType = 'neutral';
  } else if (type === 'positive' || type === 'negative' || type === 'neutral') {
    computedType = type;
  }

  const colorStyles = {
    positive: 'text-emerald-600 font-semibold',
    negative: 'text-red-600 font-semibold',
    neutral: 'text-slate-900 font-semibold',
  };

  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-bold',
    xl: 'text-xl font-bold tracking-tight',
  };

  const formattedNumber = Math.abs(numericValue).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const sign = showSign ? (isPositive ? '+' : isNegative ? '-' : '') : '';

  return (
    <span className={`inline-flex items-baseline gap-1 font-mono ${colorStyles[computedType]} ${sizeStyles[size]} ${className}`}>
      <span>
        {sign}{formattedNumber}
      </span>
      <span className="text-[0.75em] text-slate-500 font-sans uppercase font-medium">
        {currency}
      </span>
    </span>
  );
};
