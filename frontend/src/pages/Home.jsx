import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const featureCards = [
  {
    title: 'Thermal Preprocessing',
    description: 'Automated scaling and normalization of infrared sequence data.',
    accent: 'text-[#a7f3d0] border-[#a7f3d0]/30 bg-[#14b8a6]/10',
    icon: 'M8 18h8M5 15h14M6 11h12M9 7h6',
  },
  {
    title: 'U-Net Segmentation',
    description: 'Pixel-perfect semantic segmentation to isolate active fire boundaries.',
    accent: 'text-[#99f6e4] border-[#99f6e4]/30 bg-[#2dd4bf]/10',
    icon: 'M4 7h16v10H4zM8 11h8M8 15h5',
  },
  {
    title: 'ConvLSTM Forecasting',
    description: 'Spatiotemporal modeling to predict future fire progression and risk.',
    accent: 'text-[#5eead4] border-[#5eead4]/30 bg-[#14b8a6]/10',
    icon: 'M5 15l5-5 4 4 6-8',
  },
  {
    title: 'Results & Analysis',
    description: 'Visualize predictions, compare results and analyze fire spread patterns.',
    accent: 'text-[#99f6e4] border-[#99f6e4]/30 bg-[#0f766e]/10',
    icon: 'M7 15V9m5 6V5m5 10v-8',
  },
];

const Home = () => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-[calc(100vh-132px)] overflow-hidden pb-6">

      <motion.section
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="relative z-10 grid min-h-[610px] gap-8 px-4 pb-12 pt-9 sm:px-8 sm:pt-12 lg:min-h-[590px] lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-12 lg:px-10 lg:pt-14"
      >
        <div className="max-w-3xl self-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#5eead4]/40 bg-[#041d1f]/70 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.19em] text-[#d1fae5] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#14b8a6] shadow-[0_0_12px_rgba(20,184,166,0.8)]" />
            AI Powered Wildfire Prediction
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.04] text-[#F8FAFC] sm:text-5xl lg:text-[56px]">
            <span className="bg-gradient-to-r from-[#14b8a6] to-[#5eead4] bg-clip-text text-transparent">Wildfire</span> Intelligence<br />&amp; Forecasting
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#D0D9E4] sm:text-base sm:leading-7">
            Understand fire evolution through thermal imagery and spatio-temporal deep learning. Predict future fire spread and support early decision-making.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/prediction"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#14b8a6] to-[#5eead4] px-5 py-3 text-sm font-bold text-[#062a2c] shadow-[0_8px_26px_rgba(20,184,166,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(20,184,166,0.38)] active:translate-y-0"
            >
              Start Prediction <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/about"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 bg-[#072b2d]/60 px-5 py-3 text-sm font-semibold text-[#F8FAFC] backdrop-blur-md transition hover:border-[#5eead4]/60 hover:bg-[#072b2d]/80"
            >
              How it works
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[34%] top-[62%] hidden items-center gap-2 lg:flex" aria-label="Illustrative forest area annotation">
          <span className="h-px w-14 bg-[#00E6D2]/75 shadow-[0_0_8px_rgba(0,230,210,0.65)]" />
          <span className="relative h-2 w-2 rounded-full border border-[#00E6D2] bg-[#00E6D2]/30 shadow-[0_0_10px_rgba(0,230,210,0.8)]" />
          <span className="rounded border border-[#99f6e4]/30 bg-[#072b2d]/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#d1fae5] backdrop-blur-md">Forest Area</span>
        </div>
        <div className="pointer-events-none absolute bottom-12 right-[27%] hidden items-center gap-2 lg:flex" aria-label="Illustrative fire zone annotation">
          <span className="rounded border border-[#99f6e4]/35 bg-[#072b2d]/75 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#d1fae5] backdrop-blur-md">Active Fire Zone · illustrative</span>
          <span className="relative h-2 w-2 rounded-full border border-[#5eead4] bg-[#14b8a6]/50 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
          <span className="h-px w-12 bg-[#99f6e4]/80 shadow-[0_0_8px_rgba(153,246,228,0.6)]" />
        </div>
      </motion.section>

      <section aria-labelledby="workflow-heading" className="relative z-10 px-4 sm:px-8 lg:px-10">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#99f6e4]">Prediction pipeline</p>
            <h2 id="workflow-heading" className="mt-1 text-lg font-semibold text-[#F8FAFC]">From thermal frames to a fire forecast</h2>
          </div>
          <span className="hidden text-[9px] uppercase tracking-[0.12em] text-[#B8C5D6] sm:block">Illustrative environment</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: reducedMotion ? 0 : 0.14 + idx * 0.08 }}
              className={`group relative min-h-[166px] overflow-hidden rounded-xl border border-[rgba(139,165,195,0.25)] bg-[rgba(10,22,36,0.88)] p-4 pb-11 shadow-[0_14px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_18px_45px_rgba(0,0,0,0.34)] after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-current after:opacity-70 after:shadow-[0_0_12px_currentColor] ${feature.accent.split(' ').find((part) => part.startsWith('text-'))}`}
            >
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${feature.accent}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d={feature.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#93A5B7]">0{idx + 1} / workflow</p>
                  <h3 className="mt-1 text-sm font-semibold leading-snug text-[#F8FAFC]">{feature.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#B8C5D6]">{feature.description}</p>
              <Link
                to={idx === 3 ? '/results' : '/about'}
                aria-label={`Open ${feature.title}`}
                className="absolute bottom-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[#F8FAFC] transition hover:border-current hover:bg-white/10"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
