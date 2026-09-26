import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  subtitle,
  action,
  footer,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={twMerge('bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden', className)}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
};
