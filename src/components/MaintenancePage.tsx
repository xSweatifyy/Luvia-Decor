import React from 'react';
import { useApp } from '../context/AppContext';

export const MaintenancePage: React.FC = () => {
  const { config } = useApp();
  return (
    <main className="min-h-screen bg-[#FCFAF7] flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-xl text-center">
        <img src="/Luvia-Decor.jpeg" alt="Logo Luvia Decor" className="w-28 h-28 object-contain mx-auto mb-8" />
        <div className="mx-auto h-px w-20 bg-[#C5A880] mb-8" />
        <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#2D2723]">Probíhá údržba systému, děkujeme za pochopení.</h1>
        <p className="text-sm text-[#8B7D70] mt-4">{config.siteName || 'Luvia Decor'}</p>
      </section>
    </main>
  );
};
