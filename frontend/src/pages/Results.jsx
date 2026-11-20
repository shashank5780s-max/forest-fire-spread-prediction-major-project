import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { loadPredictionLayers, RasterCanvas } from '../utils/resultsRaster';

const ThermalSurfaceScene = lazy(() => import('../components/ThermalSurfaceScene'));
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const API_BASE = configuredApiBaseUrl;
const OUTPUT_BASE = API_BASE;
const MIN_DIRECTION_DISPLACEMENT_PX = 0.5;
const COMPASS_DIRECTIONS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];

const getOutputUrl = (path, requestId = Date.now()) => (path ? `${OUTPUT_BASE}${path}?result=${requestId}` : '');
const isFiniteNumber = (value) => value !== undefined && value !== null && Number.isFinite(Number(value));
const formatValue = (value, digits = 1) => (isFiniteNumber(value) ? Number(value).toFixed(digits) : 'Unavailable');

function calculateMaskDisplacement(layers) {
  if (!layers) return null;
  const { width, height, currentMask, futureMask } = layers;
  const pixelCount = width * height;
  if (!width || !height || currentMask.length !== pixelCount || futureMask.length !== pixelCount) return null;

  const getCentroid = (mask) => {
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    for (let index = 0; index < pixelCount; index += 1) {
      if (!mask[index]) continue;
      count += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      sumX += x;
      sumY += y;
    }
    if (!count) return null;
    return { x: sumX / count, y: sumY / count };
  };

  const currentCentroid = getCentroid(currentMask);
  const futureCentroid = getCentroid(futureMask);
  const candidates = [];
  if (currentCentroid && futureCentroid) {
    candidates.push({ source: 'centroid', start: currentCentroid, end: futureCentroid });
  }

  const expansionMask = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    if (futureMask[index] && !currentMask[index]) expansionMask[index] = 1;
  }
  if (currentCentroid) {
    const expansionCentroid = getCentroid(expansionMask);
    if (expansionCentroid) {
      candidates.push({ source: 'expansion', start: currentCentroid, end: expansionCentroid });
    }
  }

  for (const candidate of candidates) {
    const deltaX = candidate.end.x - candidate.start.x;
    const deltaY = candidate.end.y - candidate.start.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (!Number.isFinite(distance) || distance < MIN_DIRECTION_DISPLACEMENT_PX) continue;
    const rawBearing = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
    const bearing = ((rawBearing % 360) + 360) % 360;
    if (Number.isFinite(bearing)) {
      return { bearing, distance, source: candidate.source };
    }
  }

  return null;
}

const compassDirection = (bearing) => COMPASS_DIRECTIONS[Math.round(bearing / 45) % COMPASS_DIRECTIONS.length];
const formatBearing = (bearing) => `${((Math.floor(bearing * 100) / 100) % 360).toFixed(2)}°`;

function Metric({ label, value, detail, tone = 'text-[#F4F7FC]', tooltip }) {
  return (
    <article className="rounded-lg border border-[#2B3B53] bg-[#172338] p-4" title={tooltip}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A7B4C8]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#91A1B5]">{detail}</p>
    </article>
  );
}

function LegendItem({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[#B8C5D6]">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function RasterCard({ eyebrow, title, description, children, legend, action }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#2B3B53] bg-[#111A2E]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2B3B53] px-4 py-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8FA2B7]">{eyebrow}</p>
          <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-[#F4F7FC]">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#A7B4C8]">{description}</p>
        </div>
        {action}
      </div>
      <div data-results-visualization className="flex min-h-[280px] items-center justify-center bg-[#0B1020] p-3 sm:min-h-[340px] sm:p-5">
        {children}
      </div>
      {legend && <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#2B3B53] px-4 py-3">{legend}</div>}
    </section>
  );
}

function SpreadFigure({ title, description, onOpen, children }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-lg border border-[#2B3B53] bg-[#111A2E]">
      <figcaption className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2B3B53] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[#F4F7FC]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#A7B4C8]">{description}</p>
        </div>
        <button type="button" onClick={onOpen} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#2B3B53] bg-[#172338] px-3 py-1.5 text-xs font-semibold text-[#F4F7FC] transition hover:border-[#42E8E0]/50 hover:text-[#42E8E0]">
          Open larger view
        </button>
      </figcaption>
      <div data-results-visualization className="flex min-h-[260px] items-center justify-center bg-[#0B1020] p-3 sm:min-h-[320px]">
        {children}
      </div>
    </figure>
  );
}

function ResultsEmptyState({ invalid = false }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#2B3B53] bg-[#172338] text-[#42E8E0]">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M4 19h16M6 16V9m4 7V5m4 11v-4m4 4V7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-[#F4F7FC]">{invalid ? 'Prediction output unavailable' : 'No prediction results yet'}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#A7B4C8]">{invalid ? 'The response is unsuccessful, incomplete, or references shared output files that cannot be tied to this prediction. Run a new thermal prediction to inspect its isolated model outputs.' : 'Run a prediction to inspect real segmentation masks, model scores, and spread metrics.'}</p>
      <Link to="/prediction" className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#FF8A35] px-4 py-2.5 text-sm font-semibold text-[#101720] transition hover:bg-[#FFAA32]">
        Go to Prediction <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

const Results = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const dashboardRef = useRef(null);
  const responseData = location.state?.predictionData;
  const runId = responseData?.current_fire_mask?.match(/^\/outputs\/([^/]+)\/current_fire_mask\.png$/)?.[1];
  const runArtifacts = [
    ['predicted_future_fire', 'predicted_future_fire.png'],
    ['future_fire_overlay', 'future_fire_overlay.png'],
    ['fire_probability_heatmap', 'fire_probability_heatmap.png'],
    ['difference_map', 'difference_map.png'],
    ['fire_boundary', 'fire_boundary.png'],
    ['fire_direction', 'fire_direction.png'],
    ['risk_dashboard', 'risk_dashboard.png'],
  ];
  const hasRunScopedOutputs = Boolean(runId) && runArtifacts.every(([key, filename]) => responseData?.[key] === `/outputs/${runId}/${filename}`);
  const data = responseData?.status === 'success' && hasRunScopedOutputs ? responseData : null;
  const analytics = data?.analytics || {};
  const [layerResult, setLayerResult] = useState({ data: null, layers: null, error: '' });
  const [csvError, setCsvError] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [spreadView, setSpreadView] = useState('side-by-side');
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [modalZoom, setModalZoom] = useState(1);
  const modalRef = useRef(null);
  const layers = layerResult.data === data ? layerResult.layers : null;
  const rasterError = layerResult.data === data ? layerResult.error : '';

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nativeFullscreen = document.fullscreenElement === dashboardRef.current;
      setIsNativeFullscreen(nativeFullscreen);
      setIsExpanded(nativeFullscreen);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && document.fullscreenElement !== dashboardRef.current) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fallbackActive = isExpanded && !isNativeFullscreen;
    document.documentElement.classList.toggle('results-fullscreen-fallback', fallbackActive);
    return () => document.documentElement.classList.remove('results-fullscreen-fallback');
  }, [isExpanded, isNativeFullscreen]);

  const enterFullscreen = async () => {
    setFullscreenError('');
    setIsExpanded(true);
    if (!dashboardRef.current?.requestFullscreen) return;
    try {
      await dashboardRef.current.requestFullscreen();
    } catch {
      setFullscreenError('Browser fullscreen is unavailable. The dashboard is expanded in this tab instead.');
    }
  };

  const exitFullscreen = async () => {
    setFullscreenError('');
    if (document.fullscreenElement === dashboardRef.current && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreenError('Could not exit browser fullscreen. Press Escape to return to the page.');
        return;
      }
    }
    setIsExpanded(false);
  };

  const urls = useMemo(() => {
    const requestId = Date.now();
    const scorePath = data?.current_fire_mask?.replace(/current_fire_mask\.png$/, 'probability_map.npy') || '/outputs/probability_map.npy';
    return {
      current: getOutputUrl(data?.current_fire_mask, requestId),
      future: getOutputUrl(data?.predicted_future_fire, requestId),
      overlay: getOutputUrl(data?.future_fire_overlay, requestId),
      score: getOutputUrl(scorePath, requestId),
      difference: getOutputUrl(data?.difference_map, requestId),
      boundary: getOutputUrl(data?.fire_boundary, requestId),
      direction: getOutputUrl(data?.fire_direction, requestId),
    };
  }, [data]);

  useEffect(() => {
    if (!data) {
      setLayerResult({ data: null, layers: null, error: '' });
      return undefined;
    }
    if (!urls.current || !urls.future || !urls.score) {
      setLayerResult({ data, layers: null, error: 'Prediction response is missing a required mask or model-score output.' });
      return undefined;
    }
    const controller = new AbortController();
    loadPredictionLayers({ scoreUrl: urls.score, currentUrl: urls.current, futureUrl: urls.future }, controller.signal)
      .then((loadedLayers) => {
        const currentArea = data.analytics?.current_fire_area;
        const futureArea = data.analytics?.future_fire_area;
        if ((isFiniteNumber(currentArea) && Number(currentArea) !== loadedLayers.currentArea)
          || (isFiniteNumber(futureArea) && Number(futureArea) !== loadedLayers.futureArea)) {
          throw new Error('Mask pixel counts do not match this prediction response. The output files may be stale or invalid; run a new prediction.');
        }
        setLayerResult({ data, layers: loadedLayers, error: '' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLayerResult({ data, layers: null, error: error.message || 'Raster outputs could not be loaded.' });
      });
    return () => controller.abort();
  }, [data, urls]);

  const maskDisplacement = useMemo(() => calculateMaskDisplacement(layers), [layers]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setTransitionProgress((progress) => {
        const next = Math.min(1, progress + (reducedMotion ? 1 : 0.025));
        if (next >= 1) setIsPlaying(false);
        return next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [isPlaying, reducedMotion]);

  useEffect(() => {
    if (!modalMode) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    modalRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setModalMode(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [modalMode]);

  useEffect(() => {
    setIsPlaying(false);
    setTransitionProgress(0);
    setSpreadView('side-by-side');
    setModalMode(null);
  }, [data]);

  if (!data) return <ResultsEmptyState invalid={Boolean(responseData)} />;

  const risk = analytics.risk || 'Unavailable';
  const riskTone = risk === 'High' ? 'text-[#FF647C]' : risk === 'Medium' ? 'text-[#FFAA32]' : risk === 'Low' ? 'text-[#35D39A]' : 'text-[#A7B4C8]';
  const areaChange = isFiniteNumber(analytics.growth_percentage) ? Number(analytics.growth_percentage) : null;
  const spreadDistance = analytics.spread_distance;
  const bearing = maskDisplacement?.bearing;
  const directionName = bearing === undefined ? 'Unavailable' : compassDirection(bearing);
  const confidence = analytics.confidence;
  const fireStatus = analytics.fire_status || 'UNCERTAIN — MANUAL VERIFICATION REQUIRED';
  const fireStatusCode = analytics.fire_status_code || 'UNCERTAIN';
  const fireStatusTone = fireStatusCode === 'FIRE'
    ? 'border-[#FF647C]/50 bg-[#4A1C2A] text-[#FFB3BF]'
    : fireStatusCode === 'NO_FIRE'
      ? 'border-[#35D39A]/50 bg-[#12352F] text-[#7EF2C3]'
      : 'border-[#FFAA32]/50 bg-[#3A2C18] text-[#FFD28A]';
  const rawScoreRange = layers ? layers.scores.reduce((range, score) => [Math.min(range[0], score), Math.max(range[1], score)], [Infinity, -Infinity]) : null;
  const areaChangePixels = layers ? layers.futureArea - layers.currentArea : null;
  const areaChangePercent = layers?.currentArea ? (areaChangePixels / layers.currentArea) * 100 : null;

  const downloadCsv = async () => {
    setCsvError('');
    setCsvLoading(true);
    try {
      const csvPath = data?.current_fire_mask?.replace(/current_fire_mask\.png$/, 'prediction_results.csv') || '/outputs/prediction_results.csv';
      const response = await fetch(getOutputUrl(csvPath));
      if (!response.ok) throw new Error(`CSV download failed (${response.status}).`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'prediction_results.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setCsvError(error.message || 'CSV could not be downloaded.');
    } finally {
      setCsvLoading(false);
    }
  };

  const openRaster = (mode) => {
    setModalZoom(1);
    setModalMode(mode);
  };

  const playTransition = () => {
    if (transitionProgress >= 1) setTransitionProgress(0);
    setSpreadView('transition');
    setIsPlaying(true);
  };

  const resetTransition = () => {
    setIsPlaying(false);
    setTransitionProgress(0);
    setSpreadView('transition');
  };

  const metricCards = [
    { label: 'Current fire area', value: `${analytics.current_fire_area ?? (layers ? layers.currentArea : 'Unavailable')} px`, detail: 'Pixels in the latest U-Net mask.', tone: 'text-[#42E8E0]', tooltip: 'Count of mask pixels above the segmentation threshold.' },
    { label: 'Predicted area', value: `${analytics.future_fire_area ?? (layers ? layers.futureArea : 'Unavailable')} px`, detail: 'Pixels in the next-step ConvLSTM mask.', tone: 'text-[#FF9A43]', tooltip: 'Count of pixels in the thresholded future mask.' },
    { label: 'Area change', value: areaChange === null ? 'Unavailable' : `${areaChange >= 0 ? '+' : ''}${areaChange.toFixed(2)}%`, detail: 'Predicted area relative to current area.', tone: areaChange === null ? 'text-[#A7B4C8]' : areaChange >= 0 ? 'text-[#FF9A43]' : 'text-[#A7B4C8]', tooltip: 'Backend calculation: (predicted area - current area) / current area × 100.' },
    { label: 'Centroid shift', value: isFiniteNumber(spreadDistance) ? `${Number(spreadDistance).toFixed(2)} px` : 'Unavailable', detail: 'Pixel-space displacement between mask centroids.', tone: 'text-[#A78BFA]', tooltip: 'This is image-coordinate displacement, not geographic distance.' },
  ];

  const modalTitles = {
    current: 'Current Fire Region',
    future: 'Predicted Future Fire Region',
    comparison: 'Current vs. predicted mask comparison',
    transition: 'Prediction output transition',
  };
  const modalElement = modalMode && layers ? createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-[#050912]/95 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalMode(null); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="spread-zoom-title" tabIndex={-1} className="flex max-h-full w-full max-w-6xl flex-col rounded-lg border border-[#34475E] bg-[#111A2E] shadow-2xl outline-none">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2B3B53] px-4 py-3">
          <h2 id="spread-zoom-title" className="text-sm font-semibold text-[#F4F7FC]">{modalTitles[modalMode]}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setModalZoom((zoom) => Math.max(1, zoom - 0.25))} className="h-9 w-9 rounded border border-[#2B3B53] bg-[#172338] text-lg text-[#F4F7FC] disabled:opacity-50" disabled={modalZoom <= 1}>−</button>
            <span className="min-w-12 text-center text-xs tabular-nums text-[#B8C5D6]">{Math.round(modalZoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setModalZoom((zoom) => Math.min(4, zoom + 0.25))} className="h-9 w-9 rounded border border-[#2B3B53] bg-[#172338] text-lg text-[#F4F7FC] disabled:opacity-50" disabled={modalZoom >= 4}>+</button>
            <button type="button" onClick={() => setModalZoom(1)} className="min-h-9 rounded border border-[#2B3B53] bg-[#172338] px-3 text-xs font-semibold text-[#F4F7FC]">Reset zoom</button>
            <button type="button" autoFocus onClick={() => setModalMode(null)} className="min-h-9 rounded border border-[#2B3B53] bg-[#172338] px-3 text-xs font-semibold text-[#F4F7FC]">Close</button>
          </div>
        </header>
        <div className="overflow-auto p-3 sm:p-5">
          <RasterCanvas
            layers={layers}
            mode={modalMode}
            progress={transitionProgress}
            label={`${modalTitles[modalMode]} enlarged visualization`}
            className="mx-auto block h-auto max-w-none object-contain"
            style={{ width: `${Math.min(window.innerWidth * 0.88, 960) * modalZoom}px`, height: 'auto' }}
          />
        </div>
      </div>
    </div>,
    document.fullscreenElement === dashboardRef.current ? dashboardRef.current : document.body,
  ) : null;

  return (
    <>
    <div ref={dashboardRef} data-results-dashboard className={isExpanded ? 'results-fullscreen fixed inset-0 z-[100] h-screen space-y-3 overflow-y-auto bg-[#0B1020] px-3 py-4 sm:px-6 lg:px-8' : 'space-y-4 pb-6'}>
      <motion.header
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={isExpanded ? 'sticky top-0 z-20 flex flex-col justify-between gap-4 border-b border-[#2B3B53] bg-[#0B1020]/95 pb-3 pt-1 backdrop-blur sm:flex-row sm:items-end' : 'flex flex-col justify-between gap-4 border-b border-[#2B3B53] pb-4 sm:flex-row sm:items-end'}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#42E8E0]">Results / model output</p>
          <h1 className="mt-1 text-3xl font-bold text-[#F4F7FC]">Analysis Results</h1>
          <p className="mt-1 text-sm text-[#A7B4C8]">Assessment of predicted fire spread and model outputs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#2B3B53] bg-[#172338] px-4 py-2 text-sm font-semibold text-[#F4F7FC] transition hover:border-[#42E8E0]/50 hover:text-[#42E8E0]">
            <span aria-hidden="true">←</span> Back to Dashboard
          </Link>
          <button type="button" onClick={isExpanded ? exitFullscreen : enterFullscreen} aria-pressed={isExpanded} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#42E8E0]/50 bg-[#15313B] px-4 py-2 text-sm font-semibold text-[#F4F7FC] transition hover:bg-[#1A4147] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#42E8E0]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={isExpanded ? 'M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5' : 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'} strokeLinecap="round" strokeLinejoin="round" /></svg>
            {isExpanded ? 'Exit Full Screen' : 'View Full Screen'}
          </button>
          <button type="button" onClick={downloadCsv} disabled={csvLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#2B3B53] bg-[#172338] px-4 py-2 text-sm font-semibold text-[#F4F7FC] transition hover:border-[#42E8E0]/50 hover:text-[#42E8E0] disabled:cursor-wait disabled:opacity-60">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {csvLoading ? 'Preparing CSV…' : 'Download CSV'}
          </button>
        </div>
      </motion.header>

      {csvError && <p role="alert" className="text-sm text-[#FF8A9B]">{csvError}</p>}
      {fullscreenError && <p role="status" className="text-sm text-[#FFAA32]">{fullscreenError}</p>}
      <section role="status" aria-live="polite" className={`rounded-lg border px-4 py-3 ${fireStatusTone}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">Fire detection decision</p>
        <p className="mt-1 text-lg font-bold">{fireStatus}</p>
        <p className="mt-1 text-xs opacity-90">
          Based on U-Net sequence validation and calibrated ConvLSTM output, not raw risk score alone.
        </p>
      </section>

      <section aria-labelledby="future-spread-title" className="overflow-hidden rounded-lg border border-[#34475E] bg-[#111A2E]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2B3B53] bg-[#172338] px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFAA32]">Model estimate · one output step</p>
            <h2 id="future-spread-title" className="mt-1 text-lg font-bold uppercase text-[#F4F7FC]">FUTURE FIRE SPREAD PREDICTION</h2>
            <p className="mt-1 text-sm leading-5 text-[#B8C5D6]">Model-estimated fire region for the next prediction time step.</p>
          </div>
          <p className="max-w-xs text-xs leading-5 text-[#A7B4C8]">Predicted masks are model outputs, not confirmed future observations. The outlined boundary comes directly from the predicted mask.</p>
        </header>

        {layers ? (
          <div className="space-y-4 p-3 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Current fire area" value={`${layers.currentArea.toLocaleString()} px`} detail="Pixels in the current U-Net mask." tone="text-[#42E8E0]" />
              <Metric label="Predicted fire area" value={`${layers.futureArea.toLocaleString()} px`} detail="Pixels in the one-step ConvLSTM mask." tone="text-[#FF9A43]" />
              <Metric label="Area change" value={`${areaChangePixels >= 0 ? '+' : ''}${areaChangePixels.toLocaleString()} px`} detail="Predicted area minus current area." tone={areaChangePixels >= 0 ? 'text-[#FF647C]' : 'text-[#42E8E0]'} />
              <Metric label="Area change %" value={areaChangePercent === null ? 'Unavailable' : `${areaChangePercent >= 0 ? '+' : ''}${areaChangePercent.toFixed(2)}%`} detail="Relative to current fire area; unavailable if current area is zero." tone="text-[#F4F7FC]" />
              <Metric label="Image-relative direction" value={maskDisplacement ? `${directionName} · ${formatBearing(maskDisplacement.bearing)}` : 'Unavailable'} detail="Derived from predicted mask displacement." tone="text-[#FFAA32]" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Future fire visualization mode" className="inline-flex flex-wrap gap-1 rounded-md border border-[#2B3B53] bg-[#0B1020] p-1">
                {[
                  ['side-by-side', 'Side by side'],
                  ['comparison', 'Combined overlay'],
                  ['transition', 'Transition'],
                ].map(([mode, label]) => (
                  <button key={mode} type="button" role="tab" aria-selected={spreadView === mode} onClick={() => { setIsPlaying(false); setSpreadView(mode); }} className={`min-h-9 rounded px-3 py-1.5 text-xs font-semibold transition ${spreadView === mode ? 'bg-[#26384E] text-[#F4F7FC]' : 'text-[#A7B4C8] hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {spreadView === 'transition' && (
                <div className="flex flex-wrap items-center gap-2" aria-label="Prediction transition playback controls">
                  <button type="button" disabled={isPlaying} onClick={playTransition} className="min-h-9 rounded-md border border-[#2B3B53] bg-[#172338] px-3 py-1.5 text-xs font-semibold text-[#F4F7FC] hover:border-[#42E8E0]/50 disabled:opacity-45">Play</button>
                  <button type="button" disabled={!isPlaying} onClick={() => setIsPlaying(false)} className="min-h-9 rounded-md border border-[#2B3B53] bg-[#172338] px-3 py-1.5 text-xs font-semibold text-[#F4F7FC] hover:border-[#42E8E0]/50 disabled:opacity-45">Pause</button>
                  <button type="button" onClick={resetTransition} className="min-h-9 rounded-md border border-[#2B3B53] bg-[#172338] px-3 py-1.5 text-xs font-semibold text-[#F4F7FC] hover:border-[#42E8E0]/50">Reset</button>
                </div>
              )}
            </div>

            {spreadView === 'side-by-side' && (
              <div className="grid gap-4 lg:grid-cols-2">
                <SpreadFigure title="Current Fire Region" description="Latest segmented U-Net mask. Cyan fill and outline are derived from the current mask." onOpen={() => openRaster('current')}>
                  <RasterCanvas layers={layers} mode="current" label="Current fire mask with actual segmentation boundary" className="block h-auto max-h-[58vh] w-full max-w-[560px] object-contain" />
                </SpreadFigure>
                <SpreadFigure title="Predicted Future Fire Region" description="One-step ConvLSTM estimate. Orange fill and outlined edge are derived from the predicted mask." onOpen={() => openRaster('future')}>
                  <RasterCanvas layers={layers} mode="future" label="Predicted future fire mask with actual predicted boundary" className="block h-auto max-h-[58vh] w-full max-w-[560px] object-contain" />
                </SpreadFigure>
              </div>
            )}

            {spreadView === 'comparison' && (
              <SpreadFigure title="Current vs. predicted mask comparison" description={`Red marks predicted-only pixels (${layers.expansionArea.toLocaleString()} px); cyan marks current-only pixels; pale marks overlap.`} onOpen={() => openRaster('comparison')}>
                <RasterCanvas layers={layers} mode="comparison" label="Aligned current and predicted fire masks with predicted-only pixels in red" className="block h-auto max-h-[58vh] w-full max-w-[720px] object-contain" />
              </SpreadFigure>
            )}

            {spreadView === 'transition' && (
              <SpreadFigure title="Prediction output transition" description={reducedMotion ? 'Reduced-motion preference switches directly between the actual current and predicted masks; no intermediate predictions are generated.' : 'Cross-fade between the actual current mask and the single actual model-predicted mask. Intermediate opacity is only a visualization, not another prediction.'} onOpen={() => openRaster('transition')}>
                <div className="w-full max-w-[720px]">
                  <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A7B4C8]">
                    <span>Current output</span><span>Next-step model output</span>
                  </div>
                  <RasterCanvas layers={layers} mode="transition" progress={transitionProgress} label="Visualization-only cross-fade between actual current and predicted masks" className="mx-auto mt-2 block h-auto max-h-[52vh] w-full object-contain" />
                  <input type="range" min="0" max="1" step="0.01" value={transitionProgress} aria-label="Transition between current and predicted mask outputs" onChange={(event) => { setIsPlaying(false); setTransitionProgress(Number(event.target.value)); }} className="mt-2 w-full accent-[#FFAA32]" />
                  <p className="mt-1 text-center text-[10px] text-[#91A1B5]">Visualization only · no intermediate model predictions</p>
                </div>
              </SpreadFigure>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2B3B53] pt-3">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <LegendItem color="#00CDCD" label="Current fire region" />
                <LegendItem color="#FF8932" label="Predicted future fire region" />
                <LegendItem color="#FF3737" label="Predicted-only pixels" />
                <LegendItem color="#FFE1AE" label="Predicted mask boundary" />
                <LegendItem color="#0C1727" label="Non-fire region" />
              </div>
              <p className="text-xs text-[#91A1B5]">Measurement source: predicted mask displacement · horizon: next model output step</p>
            </div>
          </div>
        ) : rasterError ? (
          <div role="alert" className="m-4 rounded-md border border-[#FF647C]/40 bg-[#FF647C]/10 p-4 text-sm text-[#F4F7FC]">
            <p className="font-semibold">Future fire spread is unavailable</p>
            <p className="mt-1 text-[#B8C5D6]">{rasterError}</p>
            <p className="mt-1 text-xs text-[#A7B4C8]">No substitute or simulated prediction is shown. Run a valid prediction to create a new result.</p>
          </div>
        ) : (
          <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#A7B4C8]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#42E8E0]/30 border-t-[#42E8E0]" />
            Loading and validating current and predicted mask outputs…
          </div>
        )}
      </section>

      <section aria-label="Prediction summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-lg border border-[#2B3B53] bg-[#172338] p-4" title="Risk category and score generated by the backend's existing heuristic.">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A7B4C8]">Risk category</p>
            <span className="h-2 w-2 rounded-full bg-[#35D39A]" />
          </div>
          <p className={`mt-2 text-2xl font-semibold ${riskTone}`}>{risk}</p>
          <p className="mt-1 text-xs leading-5 text-[#91A1B5]">Backend risk category; not a calibrated probability.</p>
          {isFiniteNumber(analytics.risk_score) && <p className="mt-2 text-[11px] text-[#B8C5D6]">Heuristic score: {Number(analytics.risk_score).toFixed(1)} / 100</p>}
        </article>
        {metricCards.map((metric) => <Metric key={metric.label} {...metric} />)}
      </section>

      <section data-results-terrain-section className="overflow-hidden rounded-lg border border-[#2B3B53] bg-[#111A2E]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2B3B53] px-4 py-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8FA2B7]">Spatial inspection</p>
            <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-[#F4F7FC]">2.5D thermal score surface</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[#A7B4C8]">Height and base color are derived from the ConvLSTM sigmoid score map; cyan and orange overlays come from current and predicted binary masks. This is an image-space visualization, not geographic elevation.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded border border-[#2B3B53] bg-[#172338] px-2 py-1 text-[#B8C5D6]">{layers ? `${layers.width} × ${layers.height} px` : 'Loading pixel grid'}</span>
          </div>
        </div>
        <div data-results-viewer className="relative">
          {layers ? (
            <Suspense fallback={<div className="flex h-[380px] items-center justify-center text-sm text-[#A7B4C8]">Preparing 2.5D surface…</div>}>
              <ThermalSurfaceScene layers={layers} />
            </Suspense>
          ) : rasterError ? (
            <div className="grid min-h-[280px] place-items-center p-6 text-center">
              <div><p className="text-sm font-semibold text-[#F4F7FC]">Interactive surface unavailable</p><p className="mt-2 max-w-lg text-xs leading-5 text-[#A7B4C8]">{rasterError}</p><p className="mt-2 text-xs text-[#91A1B5]">The mask grids did not pass validation, so no substitute surface or spread image is shown.</p></div>
            </div>
          ) : (
            <div className="flex h-[380px] items-center justify-center gap-3 text-sm text-[#A7B4C8]" role="status">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#42E8E0]/30 border-t-[#42E8E0]" />
              Loading and validating output grids…
            </div>
          )}
        </div>
        {layers && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2B3B53] px-4 py-3">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <LegendItem color="#7560C0" label="Lower raw sigmoid score" />
              <LegendItem color="#EF5140" label="Higher raw sigmoid score" />
              <LegendItem color="#00D5D2" label="Current segmented region" />
              <LegendItem color="#FF8A35" label="Predicted region" />
              <LegendItem color="#E9C77B" label="Overlap" />
            </div>
          </div>
        )}
      </section>

      {layers && <section className="grid gap-4 xl:grid-cols-2">
        {urls.overlay && <RasterCard eyebrow="Backend visualization" title="Latest thermal frame with forecast overlay" description="The backend composes the latest preprocessed thermal frame with the predicted future mask. This is an overlay, not an unmodified raw thermal input." legend={<><LegendItem color="#764927" label="Thermal intensity background" /><LegendItem color="#FF8932" label="Predicted future mask overlay" /></>}>
          <img src={urls.overlay} alt="Latest preprocessed thermal frame with predicted future fire mask overlaid" className="block max-h-[420px] max-w-full object-contain" onError={(event) => { event.currentTarget.dataset.failed = 'true'; }} />
        </RasterCard>}

        <RasterCard eyebrow="Derived mask comparison" title="Current vs. predicted fire overlay" description="Pixel-aligned comparison of the latest segmented mask and the next-step predicted mask. Expansion is computed as predicted pixels outside the current mask; this is not prediction error." legend={<><LegendItem color="#00CDCD" label="Current only" /><LegendItem color="#FF3737" label={`Predicted-only expansion (${layers.expansionArea.toLocaleString()} px)`} /><LegendItem color="#ECE2CC" label="Current/predicted overlap" /><LegendItem color="#0C1727" label="Neither mask" /></>}>
          <RasterCanvas layers={layers} mode="comparison" label="Pixel-aligned current and predicted fire mask comparison" className="block max-h-[420px] max-w-full object-contain" />
        </RasterCard>

        <RasterCard eyebrow="ConvLSTM sigmoid output" title="Raw model score map" description="The backend saves sigmoid-transformed ConvLSTM outputs. Values are model scores, not calibrated probabilities or verified fire likelihoods." legend={<><span className="inline-flex items-center gap-2 text-xs text-[#B8C5D6]">Score scale <span className="h-2.5 w-32 rounded-sm" style={{ backgroundImage: 'linear-gradient(90deg,#0E192D 0%,#6F4DB5 25%,#1DAFC1 50%,#F4A947 75%,#EF5140 100%)' }} />{rawScoreRange && <span className="tabular-nums">{rawScoreRange[0].toFixed(3)}–{rawScoreRange[1].toFixed(3)}</span>}</span><span className="text-xs text-[#91A1B5]">Raw sigmoid score, not calibrated probability</span></>}>
          <RasterCanvas layers={layers} mode="score" label="Continuous raw ConvLSTM sigmoid score heatmap" className="block max-h-[420px] max-w-full object-contain" />
        </RasterCard>
      </section>}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-[#2B3B53] bg-[#111A2E] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8FA2B7]">Comparison semantics</p>
              <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-[#F4F7FC]">Difference map</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#A7B4C8]">Backend map compares the current mask with the predicted next-step mask. It is not a forecast error map because no ground-truth future observation is provided.</p>
            </div>
            <span className="rounded border border-[#2B3B53] bg-[#172338] px-2 py-1 text-[10px] text-[#A7B4C8]">Mask-to-mask comparison</span>
          </div>
          <div data-results-visualization className="mt-4 flex min-h-[250px] items-center justify-center rounded-md border border-[#2B3B53] bg-[#0B1020] p-3">
            {layers && urls.difference ? <img src={urls.difference} alt="Backend current-versus-predicted mask difference map; not ground-truth error" className="block max-h-[360px] max-w-full object-contain" onError={(event) => { event.currentTarget.dataset.failed = 'true'; }} /> : <p className="text-sm text-[#91A1B5]">{rasterError || 'Difference map is unavailable until the prediction masks pass validation.'}</p>}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2"><LegendItem color="#0000FF" label="Current-only fire pixels" /><LegendItem color="#FF0000" label="Predicted-only pixels" /><LegendItem color="#FFFFFF" label="Overlap" /><LegendItem color="#000000" label="Neither mask" /></div>
        </div>

        <aside data-results-direction className="space-y-4 rounded-lg border border-[#2B3B53] bg-[#111A2E] p-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8FA2B7]">Image-relative direction</p>
            <h2 className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-[#F4F7FC]">Fire direction</h2>
            <p className="mt-1 text-xs leading-5 text-[#A7B4C8]">Clockwise bearing from north, calculated from current-to-predicted fire-mask centroid displacement. The images have no geographic orientation.</p>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-md border border-[#2B3B53] bg-[#0B1020] p-4 sm:flex-row sm:items-start">
            <div className="relative h-36 w-36 shrink-0 rounded-full border border-[#34475E] bg-[#172338] text-[10px] font-semibold text-[#B8C5D6]" role="img" aria-label={bearing === undefined ? 'Compass directions; bearing unavailable' : `Compass bearing ${formatBearing(bearing)}`}>
              <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[#F4F7FC]">N</span>
              <span className="absolute right-3 top-4">NE</span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[#F4F7FC]">E</span>
              <span className="absolute bottom-4 right-3">SE</span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[#F4F7FC]">S</span>
              <span className="absolute bottom-4 left-3">SW</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[#F4F7FC]">W</span>
              <span className="absolute left-3 top-4">NW</span>
              {bearing !== undefined && (
                <span className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) rotate(${bearing}deg)` }}>
                  <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
                    <path d="M32 5 42 37 32 31 22 37Z" fill="#FF9A43" />
                    <path d="M32 31v22" stroke="#FFAA32" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              )}
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F4F7FC]" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8FA2B7]">Direction</p>
              <p className="mt-1 text-2xl font-semibold text-[#F4F7FC]">{directionName}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8FA2B7]">Bearing</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[#FFAA32]">{bearing === undefined ? 'Unavailable' : formatBearing(bearing)}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8FA2B7]">Measurement source</p>
              <p className="mt-1 text-xs text-[#B8C5D6]">Predicted mask displacement</p>
              <p className="mt-2 text-[10px] text-[#8FA2B7]">{maskDisplacement ? `${maskDisplacement.distance.toFixed(2)} px centroid shift · 0° north · clockwise` : 'Insufficient mask movement for a reliable direction.'}</p>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Spread speed" value={isFiniteNumber(analytics.spread_speed) ? `${formatValue(analytics.spread_speed, 2)} px / step` : 'Unavailable'} detail="Backend assumes one frame interval; timestamps are not provided." tone="text-[#A78BFA]" />
            <Metric label="Mean mask score" value={isFiniteNumber(confidence) ? formatValue(confidence, 3) : 'Unavailable'} detail="Mean raw score over predicted foreground; not calibrated." tone="text-[#A78BFA]" />
          </div>
        </aside>
      </section>

    </div>
    {modalElement}
    </>
  );
};

export default Results;