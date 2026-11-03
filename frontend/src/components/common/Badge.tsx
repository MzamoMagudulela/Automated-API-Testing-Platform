import React from 'react';

interface MethodBadgeProps {
  method: string;
  size?: 'sm' | 'md';
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, size = 'md' }) => {
  const m = (method || 'GET').toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  let colorClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (m === 'GET') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
  } else if (m === 'POST') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60';
  } else if (m === 'PUT') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
  } else if (m === 'DELETE') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60';
  } else if (m === 'PATCH') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60';
  }

  return (
    <span className={`inline-flex items-center font-mono font-bold rounded border ${sizeClasses} ${colorClasses}`}>
      {m}
    </span>
  );
};

interface StatusBadgeProps {
  statusCode?: number | null;
  statusText?: string | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ statusCode, statusText }) => {
  if (!statusCode) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
        ERROR
      </span>
    );
  }

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  if (statusCode >= 200 && statusCode < 300) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
  } else if (statusCode >= 300 && statusCode < 400) {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800';
  } else if (statusCode >= 400 && statusCode < 500) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
  } else if (statusCode >= 500) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${colorClasses}`}>
      <span>{statusCode}</span>
      {statusText && <span className="font-normal opacity-85">({statusText})</span>}
    </span>
  );
};

export const ResultBadge: React.FC<{ isSuccess: boolean }> = ({ isSuccess }) => {
  return isSuccess ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
      PASS
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
      FAIL
    </span>
  );
};
