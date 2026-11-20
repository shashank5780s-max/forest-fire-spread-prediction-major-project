import React from 'react';
import { useLocation } from 'react-router-dom';

const Navbar = ({
  onMenuClick,
  forestBackground = false,
  theme = 'forest',
  onThemeChange = () => {},
  customAccent = '#14b8a6',
  onCustomAccentChange = () => {},
}) => {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/prediction': return 'Prediction Workspace';
      case '/results': return 'Analysis Results';
      case '/about': return 'Model Architecture';
      default: return 'Wildfire Vision AI';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/': return 'Real-time thermal imaging and ConvLSTM prediction system';
      case '/prediction': return 'Upload thermal sequences and trigger inference';
      case '/results': return 'Assessment of predicted fire spread and model outputs';
      case '/about': return 'Research architecture and scientific pipeline';
      default: return 'Spatio-temporal wildfire risk intelligence';
    }
  };

  return (
    <header className={`sticky top-0 z-20 border-b border-white/[0.08] px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 ${forestBackground ? 'bg-[#03191a]/60' : 'bg-[#03191a]/90'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#072b2d] text-[#F8FAFC] md:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#91A1B2]">Wildfire Vision AI</p>
            <h2 className="text-lg font-bold text-[#F8FAFC] sm:text-xl">{getPageTitle()}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-2 rounded-full border border-[rgba(153,246,228,0.28)] bg-[#072b2d]/90 px-3 py-1.5 text-xs text-[#F8FAFC]">
            <span className="sr-only">Color theme</span>
            <svg className="h-4 w-4 shrink-0 text-[#5eead4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.3-3.1 1.7 1.7 0 0 1 1.2-2.9H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z" />
              <circle cx="7.5" cy="11" r="1" fill="currentColor" />
              <circle cx="10" cy="7.5" r="1" fill="currentColor" />
              <circle cx="14.5" cy="8" r="1" fill="currentColor" />
            </svg>
            <select
              aria-label="Color theme"
              value={theme}
              onChange={(event) => onThemeChange(event.target.value)}
              className="max-w-[92px] cursor-pointer bg-transparent text-xs text-[#F8FAFC] outline-none"
            >
              <option value="forest">Forest</option>
              <option value="ocean">Ocean</option>
              <option value="violet">Violet</option>
              <option value="ember">Ember</option>
              <option value="black">Black</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="color"
              aria-label="Choose custom accent color"
              title="Choose custom accent color"
              value={customAccent}
              onChange={(event) => onCustomAccentChange(event.target.value)}
              className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </label>

          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search model data"
              className="w-64 rounded-full border border-[rgba(153,246,228,0.28)] bg-[#072b2d]/90 py-2 pl-10 pr-4 text-xs text-[#F8FAFC] placeholder:text-[#c8f6f2] outline-none transition focus:border-[#5eead4]/70 focus:ring-2 focus:ring-[#5eead4]/15"
            />
            <svg className="absolute left-4 top-2.5 h-4 w-4 text-[#91A1B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button type="button" aria-label="Notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#072b2d] text-[#DDE7F5] transition hover:border-[#5eead4]/60 hover:text-[#F8FAFC]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5eead4]/30 bg-gradient-to-br from-[#0f766e] to-[#14b8a6] text-xs font-bold text-[#F8FAFC] shadow-[0_8px_24px_rgba(20,184,166,0.25)]">
            AI
          </div>
        </div>
      </div>

      <p className="mt-1 hidden text-xs text-[#B8C5D6] md:block">{getPageSubtitle()}</p>
    </header>
  );
};

export default Navbar;
