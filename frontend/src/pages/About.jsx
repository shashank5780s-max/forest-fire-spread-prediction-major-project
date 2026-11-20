import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const PipelineScene = lazy(() => import('../components/PipelineScene'));

const stages = [
  {
    title: '1. Thermal preprocessing',
    detail: 'Each frame is normalized and prepared for model inference, preserving spatial continuity across the thermal sequence.',
    tone: 'text-[#42E8E0]',
    accent: 'from-[#42E8E0]/20 to-[#42E8E0]/5',
  },
  {
    title: '2. U-Net semantic segmentation',
    detail: 'The segmentation network isolates active fire contours and suppresses non-fire thermal noise at the pixel level.',
    tone: 'text-[#5eead4]',
    accent: 'from-[#14b8a6]/20 to-[#14b8a6]/5',
  },
  {
    title: '3. ConvLSTM forecasting',
    detail: 'Sequential masks are transformed into a time-aware feature tensor, allowing the model to predict probable future fire spread.',
    tone: 'text-[#99f6e4]',
    accent: 'from-[#2dd4bf]/20 to-[#2dd4bf]/5',
  },
  {
    title: '4. Scientific analytics',
    detail: 'Results are visualized through overlays, error maps, and risk summaries to help interpret model output in context.',
    tone: 'text-[#2dd4bf]',
    accent: 'from-[#0f766e]/20 to-[#0f766e]/5',
  },
];

const techStack = ['Python 3.12', 'PyTorch', 'FastAPI', 'Rasterio', 'OpenCV', 'React', 'Vite', 'TailwindCSS'];

const demoSteps = [
  {
    title: 'Load thermal frames',
    detail: 'Start with five sequential thermal images from the sample sequence or upload your own frames.',
    label: 'INPUT · 5 FRAMES',
  },
  {
    title: 'Prepare the sequence',
    detail: 'The backend reads and normalizes the frames so they can be passed through the fire segmentation model.',
    label: 'PREPROCESSING',
  },
  {
    title: 'Segment active fire',
    detail: 'U-Net produces fire masks from the thermal imagery, isolating the detected fire region in each frame.',
    label: 'U-NET · FIRE MASKS',
  },
  {
    title: 'Forecast and review',
    detail: 'ConvLSTM forecasts the next fire mask. Open Results to inspect the generated prediction and analysis.',
    label: 'CONVLSTM · RESULTS',
  },
];

function DemoVisual({ step }) {
  if (step === 0) {
    return (
      <div className="grid w-full max-w-2xl grid-cols-5 gap-2 sm:gap-4">
        {demoSteps.map((_, index) => (
          <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#5eead4]/30 bg-[#062526]">
            <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: "url('/prediction-bg.jpg')" }} />
            <div
              className="absolute h-7 w-7 rounded-full bg-gradient-to-br from-[#fde047] via-[#f97316] to-[#dc2626] blur-[3px]"
              style={{ left: `${24 + index * 7}%`, top: `${28 + (index % 2) * 12}%` }}
            />
            <span className="absolute bottom-1.5 left-2 text-[9px] font-semibold tracking-wider text-white">T{index + 1}</span>
          </div>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-5">
        <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-[#5eead4]/25 bg-[#03191a]/75 p-3 sm:gap-2 sm:p-5">
          {Array.from({ length: 36 }, (_, index) => (
            <span
              key={index}
              className="h-5 w-5 rounded-sm sm:h-8 sm:w-8"
              style={{ backgroundColor: `rgba(45, 212, 191, ${0.12 + ((index * 7) % 8) * 0.08})` }}
            />
          ))}
        </div>
        <span className="rounded-full border border-[#5eead4]/30 bg-[#14b8a6]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#99f6e4]">NORMALIZED INPUT</span>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="relative h-36 w-full max-w-2xl overflow-hidden rounded-xl border border-[#5eead4]/25 bg-cover bg-center sm:h-48" style={{ backgroundImage: "linear-gradient(rgba(3, 25, 26, 0.36), rgba(3, 25, 26, 0.5)), url('/prediction-bg.jpg')" }}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 220" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M92 126c35-56 68-43 102-17s49-32 89-35 45 45 82 35 63-28 92-8 52 13 92-18" stroke="#2dd4bf" strokeWidth="3" strokeDasharray="9 7" />
          <path d="M92 126c35-56 68-43 102-17s49-32 89-35 45 45 82 35 63-28 92-8 52 13 92-18" stroke="#5eead4" strokeWidth="14" opacity=".16" />
          <circle cx="283" cy="74" r="13" fill="#14b8a6" opacity=".85" />
          <circle cx="283" cy="74" r="25" stroke="#5eead4" opacity=".7" />
        </svg>
        <span className="absolute bottom-3 left-3 rounded bg-[#03191a]/80 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#99f6e4]">FIRE MASK</span>
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-2xl items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-5">
      {['CURRENT MASK', 'PREDICTED MASK'].map((label, index) => (
        <div key={label} className="relative h-24 overflow-hidden rounded-xl border border-[#5eead4]/25 bg-cover bg-center sm:h-36" style={{ backgroundImage: `linear-gradient(rgba(3, 25, 26, ${index ? 0.48 : 0.64}), rgba(3, 25, 26, 0.68)), url('/prediction-bg.jpg')` }}>
          <div className={`absolute left-1/2 top-1/2 h-10 w-14 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 ${index ? 'scale-125 border-[#f97316] bg-[#f97316]/25' : 'border-[#facc15] bg-[#facc15]/20'}`} />
          <span className="absolute bottom-2 left-2 text-[9px] font-semibold tracking-wider text-white">{label}</span>
        </div>
      ))}
      <svg className="mx-auto hidden h-6 w-6 text-[#5eead4] sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function DemoVideo() {
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => {
      if (activeStep === demoSteps.length - 1) {
        setPlaying(false);
      } else {
        setActiveStep((current) => current + 1);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeStep, playing]);

  const selectStep = (index) => {
    setActiveStep(index);
    setPlaying(false);
  };

  return (
    <section aria-labelledby="demo-video-heading" className="panel overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5 sm:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#99f6e4]">Step-by-step walkthrough</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="demo-video-heading" className="text-xl font-bold text-[#F4F7FC] sm:text-2xl">Project demo video</h2>
            <p className="mt-1 text-sm text-[#A7B4C8]">A short visual guide to the wildfire prediction workflow.</p>
          </div>
          <span className="rounded-full border border-[#5eead4]/25 bg-[#14b8a6]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#99f6e4]">Illustrative demo</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)]">
        <div className="min-w-0 p-4 sm:p-6">
          <div className="relative flex aspect-video min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-[#5eead4]/20 bg-[#03191a] p-5 sm:min-h-[300px] sm:p-8">
            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/prediction-bg.jpg')" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-[#03191a]/40 via-[#03191a]/50 to-[#03191a]/85" />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 flex w-full flex-col items-center text-center"
              >
                <span className="mb-5 rounded-full border border-[#5eead4]/25 bg-[#03191a]/70 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#99f6e4]">{demoSteps[activeStep].label}</span>
                <DemoVisual step={activeStep} />
                <h3 className="mt-5 text-lg font-bold text-[#F4F7FC] sm:text-xl">{demoSteps[activeStep].title}</h3>
                <p className="mt-2 max-w-xl text-xs leading-5 text-[#D0D9E4] sm:text-sm sm:leading-6">{demoSteps[activeStep].detail}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Demo progress" aria-valuemin={0} aria-valuemax={demoSteps.length - 1} aria-valuenow={activeStep}>
            <div className="h-full rounded-full bg-gradient-to-r from-[#14b8a6] to-[#5eead4] transition-[width] duration-500" style={{ width: `${((activeStep + 1) / demoSteps.length) * 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => selectStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0} aria-label="Previous demo step" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#D0D9E4] transition hover:border-[#5eead4]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zm13 0v14L9 12z" /></svg>
              </button>
              <button type="button" onClick={() => {
                if (activeStep === demoSteps.length - 1) {
                  setActiveStep(0);
                  setPlaying(true);
                } else {
                  setPlaying((current) => !current);
                }
              }} aria-label={playing ? 'Pause demo video' : activeStep === demoSteps.length - 1 ? 'Replay demo video' : 'Play demo video'} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#14b8a6] to-[#5eead4] text-[#03191a] shadow-[0_6px_20px_rgba(20,184,166,0.25)] transition hover:scale-105">
                {playing ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" /></svg>
                ) : (
                  <svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
                )}
              </button>
              <button type="button" onClick={() => selectStep(Math.min(demoSteps.length - 1, activeStep + 1))} disabled={activeStep === demoSteps.length - 1} aria-label="Next demo step" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#D0D9E4] transition hover:border-[#5eead4]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5v14l10-7z" /></svg>
              </button>
            </div>
            <p className="text-[10px] font-medium tracking-wider text-[#A7B4C8]">STEP {String(activeStep + 1).padStart(2, '0')} / {String(demoSteps.length).padStart(2, '0')}</p>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-[#91A1B5]">This generated visual walkthrough explains the workflow; it does not display live model inference.</p>
        </div>

        <ol className="flex flex-col gap-2 border-t border-white/10 p-4 sm:p-6 xl:border-l xl:border-t-0">
          {demoSteps.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                onClick={() => selectStep(index)}
                aria-current={activeStep === index ? 'step' : undefined}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${activeStep === index ? 'border-[#5eead4]/40 bg-[#14b8a6]/10' : 'border-white/10 bg-[#03191a]/30 hover:border-white/20'}`}
              >
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activeStep === index ? 'bg-[#14b8a6] text-[#03191a]' : 'bg-white/10 text-[#B8C5D6]'}`}>{index + 1}</span>
                <span>
                  <span className={`block text-xs font-semibold ${activeStep === index ? 'text-[#99f6e4]' : 'text-[#DDE7F5]'}`}>{item.title}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#A7B4C8]">{item.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const About = () => {
  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="panel p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#42E8E0]">Research overview</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#F4F7FC] sm:text-4xl">Model Architecture</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#A7B4C8]">
          Wildfire Vision AI combines thermal image understanding with spatio-temporal forecasting to estimate how fire regions may evolve in the next prediction step.
        </p>
      </motion.div>

      <div className="panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#A7B4C8]">Model pipeline</p>
            <h2 className="mt-1 text-xl font-bold text-[#F4F7FC]">Thermal Frames → U-Net Segmentation → ConvLSTM → Future Fire Map</h2>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="flex h-[280px] w-full items-center justify-center rounded-[24px] border border-[#2B3B53] bg-[#0B1020] text-sm text-[#A7B4C8]">
              Loading 3D architecture preview...
            </div>
          }
        >
          <PipelineScene />
        </Suspense>
      </div>

      <div className="grid gap-5">
        {stages.map((stage, idx) => (
          <motion.div
            key={stage.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className={`panel relative overflow-hidden bg-gradient-to-r ${stage.accent} p-[1px]`}
          >
            <div className="bg-[#111A2E] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2B3B53] bg-[#172338] text-base font-bold ${stage.tone}`}>
                  {idx + 1}
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${stage.tone}`}>{stage.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#DDE7F5]">{stage.detail}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-xl font-bold text-[#F4F7FC]">Dataset</h2>
          <p className="mt-4 text-sm leading-7 text-[#A7B4C8]">
            The model is trained on FLAME 3 thermal sequence data, with emphasis on nadir-style wildfire imagery where fire evolution, terrain context, and temporal change are critical for forecasting spread behavior.
          </p>
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-bold text-[#F4F7FC]">Technology stack</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <span key={tech} className="rounded-full border border-[#2B3B53] bg-[#172338] px-3 py-1.5 text-xs font-medium text-[#DDE7F5]">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <DemoVideo />
      </div>
    </div>
  );
};

export default About;
