import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'emerald' | 'danger';
  isLoading?: boolean;
  details?: { label: string; value: string | number }[];
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  details,
}) => {
  const icon =
    variant === 'danger' ? (
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
        <AlertTriangle size={20} />
      </div>
    ) : variant === 'emerald' ? (
      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
        <CheckCircle2 size={20} />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0B1F3A] flex items-center justify-center shrink-0">
        <Info size={20} />
      </div>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'emerald' ? 'emerald' : variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        {icon}
        <div className="flex-1">
          <p className="text-sm text-slate-700">{message}</p>

          {details && details.length > 0 && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1.5 text-xs">
              {details.map((d, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-slate-500 font-medium">{d.label}:</span>
                  <span className="text-slate-900 font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
