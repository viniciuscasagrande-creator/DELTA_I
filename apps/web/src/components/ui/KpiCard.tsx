import React from 'react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  trend?: {
    value: number | string;
    isPositive: boolean;
  };
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'slate';
}

const toneMap: Record<NonNullable<KpiCardProps['tone']>, { bar: string; badgeBg: string; badgeText: string }> = {
  indigo: { bar: 'from-indigo-600 to-blue-500', badgeBg: 'bg-indigo-50 border-indigo-200', badgeText: 'text-indigo-700' },
  emerald: { bar: 'from-emerald-600 to-teal-500', badgeBg: 'bg-emerald-50 border-emerald-200', badgeText: 'text-emerald-700' },
  amber: { bar: 'from-amber-500 to-orange-500', badgeBg: 'bg-amber-50 border-amber-200', badgeText: 'text-amber-700' },
  rose: { bar: 'from-rose-600 to-pink-500', badgeBg: 'bg-rose-50 border-rose-200', badgeText: 'text-rose-700' },
  violet: { bar: 'from-violet-600 to-purple-500', badgeBg: 'bg-violet-50 border-violet-200', badgeText: 'text-violet-700' },
  cyan: { bar: 'from-cyan-600 to-sky-500', badgeBg: 'bg-cyan-50 border-cyan-200', badgeText: 'text-cyan-700' },
  slate: { bar: 'from-slate-700 to-slate-500', badgeBg: 'bg-slate-100 border-slate-200', badgeText: 'text-slate-700' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  trend,
  tone = 'indigo',
}) => {
  const palette = toneMap[tone];

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${palette.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
        {badge && (
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${palette.badgeBg} ${palette.badgeText}`}>
            {badge}
          </span>
        )}
      </div>

      <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>

      {(trend || subtitle) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center font-bold px-2 py-0.5 rounded-full ${
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'}{' '}
              {typeof trend.value === 'number' ? `${Math.abs(trend.value)}%` : trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-500 text-[11px] truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
