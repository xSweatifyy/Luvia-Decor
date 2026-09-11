import React from 'react';
import { AlertTriangle, Clock3, Info, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MaintenanceBanner: React.FC = () => {
  const { page, config } = useApp();
  const banner = config.maintenanceBanner;

  if (page === 'admin' || !banner?.enabled || !banner.title?.trim() || !banner.message?.trim()) return null;

  const variant = banner.variant || 'maintenance';
  const styles = {
    maintenance: {
      wrapper: 'bg-[#2D2723] border-[#51453D] text-white',
      accent: 'text-[#E8CFAE]',
      icon: Wrench,
      label: 'Odstávka e-shopu',
    },
    warning: {
      wrapper: 'bg-[#6B4D22] border-[#8B6A35] text-white',
      accent: 'text-[#FFE2A6]',
      icon: AlertTriangle,
      label: 'Důležité upozornění',
    },
    info: {
      wrapper: 'bg-[#3B4650] border-[#596774] text-white',
      accent: 'text-[#D5E6F2]',
      icon: Info,
      label: 'Informace',
    },
    closed: {
      wrapper: 'bg-[#4A2424] border-[#6A3636] text-white',
      accent: 'text-[#FFD1D1]',
      icon: Clock3,
      label: 'E-shop je dočasně uzavřen',
    },
  }[variant];

  const Icon = styles.icon;

  return (
    <div className={`relative z-30 w-full border-b ${styles.wrapper}`} role="status" aria-live="polite">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`mt-0.5 shrink-0 h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center ${styles.accent}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-bold ${styles.accent}`}>
              {styles.label}
            </div>
            <h2 className="mt-0.5 text-sm sm:text-base font-bold tracking-tight">{banner.title}</h2>
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-white/85">{banner.message}</p>
            {banner.until?.trim() && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-white/75">
                <Clock3 className="w-3.5 h-3.5" />
                <span>{banner.until}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
