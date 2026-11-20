import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { uploadImages, predict } from '../services/api';

const frameSequence = [1, 2, 3, 4, 5];

const Prediction = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('sample');
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const isUploading = useRef(false);
  const fileInputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleUploadAndPredictClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const executeUpload = async (selectedFiles) => {
    if (selectedFiles.length !== 5) return;
    if (isUploading.current) return;

    isUploading.current = true;
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      await uploadImages(selectedFiles, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });

      const result = await predict();
      navigate('/results', { state: { predictionData: result } });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload or Prediction failed');
    } finally {
      isUploading.current = false;
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files).slice(0, 5);
      setFiles(selected);
      if (selected.length === 5) {
        executeUpload(selected);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files).slice(0, 5);
      setFiles(selected);
      if (selected.length === 5) {
        executeUpload(selected);
      }
    }
  };

  const handlePredictSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await predict('sequence_001');
      navigate('/results', { state: { predictionData: result } });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Prediction failed');
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex max-w-6xl flex-col pb-10">
      {error && (
        <div className="absolute right-0 top-0 z-50 mt-2 flex items-center gap-3 rounded-2xl border border-[#FF647C]/50 bg-[#FF647C]/15 px-4 py-3 text-sm text-[#F4F7FC] shadow-[0_15px_35px_rgba(255,100,124,0.2)]">
          <svg className="h-5 w-5 text-[#FF647C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-1 text-[#F4F7FC]/80 hover:text-white" aria-label="Dismiss error">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#42E8E0]">Inference</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#F4F7FC] sm:text-4xl">Run Prediction</h1>
        <p className="mt-2 text-[#A7B4C8]">Select five sequential thermal images to drive the fire spread forecast.</p>
      </motion.div>

      <div className="mb-8 inline-flex w-full max-w-md rounded-2xl border border-[#2B3B53] bg-[#111A2E] p-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => setMode('sample')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === 'sample' ? 'bg-[#172338] text-[#F4F7FC] shadow-[inset_0_0_0_1px_rgba(66,232,224,0.28)]' : 'text-[#A7B4C8] hover:text-[#F4F7FC]'
          } ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          Use sample data
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setMode('upload')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === 'upload' ? 'bg-[#172338] text-[#F4F7FC] shadow-[inset_0_0_0_1px_rgba(66,232,224,0.28)]' : 'text-[#A7B4C8] hover:text-[#F4F7FC]'
          } ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          Upload own images
        </button>
      </div>

      {mode === 'sample' ? (
        <motion.div
          key="sample"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel flex min-h-[420px] flex-col items-center justify-center overflow-hidden bg-cover bg-center p-8 text-center"
          style={{
            backgroundImage: "linear-gradient(rgba(3, 25, 26, 0.76), rgba(3, 25, 26, 0.82)), url('/prediction-bg.jpg')",
          }}
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#42E8E0]/30 bg-[#42E8E0]/10 text-[#42E8E0]">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 16.5A3.5 3.5 0 0 1 7 9.5a4 4 0 1 1 7.8-1.5A5 5 0 1 1 17 16.5H7Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h3 className="text-3xl font-bold text-[#F4F7FC]">Sequence 001</h3>
          <p className="mt-3 max-w-lg text-[#A7B4C8]">
            Five thermal TIFF frames are bundled for a wildfire scenario using the project’s sample dataset.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {frameSequence.map((frame) => (
              <span key={frame} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2B3B53] bg-[#172338] text-sm font-semibold text-[#42E8E0]">
                {frame}
              </span>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handlePredictSample}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#0f766e] via-[#2dd4bf] to-[#14b8a6] px-6 py-3 text-base font-semibold text-[#03191a] shadow-[0_18px_40px_rgba(20,184,166,0.3)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M4 12a8 8 0 0 1 8-8" strokeLinecap="round" />
                </svg>
                Processing model...
              </>
            ) : (
              <>
                Run Prediction
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="upload"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div
            className={`panel flex min-h-[340px] flex-col items-center justify-center overflow-hidden border-2 border-dashed bg-cover bg-center p-8 text-center transition ${
              dragActive ? 'border-[#42E8E0] bg-[#42E8E0]/5' : 'border-[#2B3B53] hover:border-[#42E8E0]/60'
            }`}
            style={{
              backgroundImage: "linear-gradient(rgba(3, 25, 26, 0.76), rgba(3, 25, 26, 0.82)), url('/prediction-bg.jpg')",
            }}
            onDragEnter={!loading ? handleDrag : undefined}
            onDragLeave={!loading ? handleDrag : undefined}
            onDragOver={!loading ? handleDrag : undefined}
            onDrop={!loading ? handleDrop : undefined}
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[#2B3B53] bg-[#111A2E] text-[#A7B4C8]">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-[#F4F7FC]">Drag & drop thermal images</h3>
            <p className="mt-3 max-w-xl text-[#A7B4C8]">
              Upload exactly five sequential TIFF frames to satisfy the current backend validation requirements.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {frameSequence.map((frame) => (
                <span key={frame} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#42E8E0]/30 bg-[#42E8E0]/10 text-sm font-semibold text-[#42E8E0]">
                  {frame}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={handleUploadAndPredictClick}
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-[#14b8a6] to-[#5eead4] px-6 py-3 text-sm font-semibold text-[#03191a] shadow-[0_16px_40px_rgba(20,184,166,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Upload & predict
              </button>

              <button
                type="button"
                onClick={handlePredictSample}
                disabled={loading}
                className="rounded-2xl border border-[#2B3B53] bg-[#111A2E] px-6 py-3 text-sm font-semibold text-[#F4F7FC] transition hover:border-[#42E8E0]/60 hover:text-[#42E8E0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Predict sample data
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".tif,.tiff,.jpg,.jpeg"
              className="hidden"
              disabled={loading}
              onChange={handleFileSelect}
            />
          </div>

          {files.length > 0 && (
            <div className="panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-base font-semibold text-[#F4F7FC]">Selected files ({files.length}/5)</h4>
                {files.length === 5 && !loading && <span className="text-sm text-[#35D39A]">Ready to predict</span>}
              </div>

              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-[#2B3B53] bg-[#172338] px-3 py-2.5 text-sm text-[#DDE7F5]">
                    <span className="truncate pr-3">{file.name}</span>
                    <span className="text-[#A7B4C8]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>

              {files.length === 5 && !loading && (
                <button
                  type="button"
                  onClick={() => executeUpload(files)}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#14b8a6] to-[#5eead4] px-6 py-3 text-sm font-semibold text-[#03191a] shadow-[0_16px_40px_rgba(20,184,166,0.25)] transition hover:-translate-y-0.5"
                >
                  Predict uploaded files
                </button>
              )}

              {loading && progress > 0 && progress < 100 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#A7B4C8]">
                    <span>Uploading</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#172338]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#0f766e] via-[#14b8a6] to-[#5eead4]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Prediction;
