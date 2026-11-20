import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Prediction', path: '/prediction', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'Results', path: '/results', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'About', path: '/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  const linkClass = (active) =>
    `sidebar-link relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${active ? 'sidebar-link-active' : ''}`;

  const sidebarContent = (
    <div className="app-sidebar relative flex h-full flex-col overflow-hidden border-r border-white/[0.08] backdrop-blur-xl">
      <div aria-hidden="true" className="sidebar-decoration pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex items-center justify-between border-b border-white/[0.08] px-5 py-5">
        <Link to="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
          <div className="sidebar-logo-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[#99f6e4]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.3 2.3c.6 3.2-.8 4.7-2.1 6.2-1.1 1.2-2.1 2.4-1.8 4.8.6-1.1 1.5-1.9 2.7-2.6-.1 2.3 2.2 3.3 2.2 5.9 0 1.5-1 2.6-2.4 2.6-1.8 0-3-1.4-3-3.4 0-.6.1-1.1.3-1.7C7 15.4 6 17.1 6 19a6 6 0 0 0 12 0c0-3.8-2.2-6.6-3.6-9.1-1-1.8-1.6-3.6-1.1-7.6Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-[#F8FAFC]">Wildfire <span className="sidebar-brand-accent">Vision</span></h1>
            <p className="mt-0.5 text-[9px] text-[#9EAFBE]">AI Powered Forest Monitoring</p>
          </div>
        </Link>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[#B8C5D6] transition hover:border-[#99f6e4]/50 hover:text-white md:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
            <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <nav className="relative flex-1 space-y-2 px-4 py-7">
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <Link key={link.name} to={link.path} onClick={onClose} className="block">
              <div className={linkClass(active)}>
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="sidebar-active-indicator absolute inset-0 rounded-lg border"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
                <div className="relative flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  <span className="relative">{link.name}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-mobile-backdrop fixed inset-0 z-40 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={{ x: -32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 24 }}
        className={
          `fixed inset-y-0 left-0 z-50 w-[260px] md:static md:w-[260px] ${
            isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`
        }
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
};

export default Sidebar;
