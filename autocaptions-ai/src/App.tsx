import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Download,
  Palette,
  FileEdit,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayer } from './components/VideoPlayer';
import { CaptionEditor } from './components/CaptionEditor';
import { StyleCustomizer } from './components/StyleCustomizer';
import { ExportModal } from './components/ExportModal';

import { CaptionSegment, CaptionStyle, VideoMeta } from './types';
import { DEFAULT_STYLE, SAMPLE_VIDEOS, STYLE_PRESETS } from './data/presets';
import { generateCaptionsFromChunks } from './lib/gemini';
import { extractAudioChunks } from './lib/audioExtractor';

export default function App() {
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_STYLE);
  const [currentTime, setCurrentTime] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('Preparing audio track...');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [summary, setSummary] = useState<string>('');

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'style'>('editor');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Process video file with Gemini API
  const handleVideoSelected = async (
    meta: VideoMeta,
    targetLanguage: string,
    translateMode: boolean
  ) => {
    setVideoMeta(meta);
    setIsGenerating(true);
    setGenerationError(null);
    setCaptions([]);
    setProgressStatus('Decoding and extracting audio track...');
    setProgressPercent(10);

    try {
      if (!meta.file) {
        throw new Error('No video file provided');
      }

      // Extract lightweight audio buffer chunks (< 5MB each to avoid 413 error)
      const chunks = await extractAudioChunks(meta.file, (statusMsg) => {
        setProgressStatus(statusMsg);
      });

      setProgressPercent(30);

      // Call Gemini multi-chunk transcription runner
      const result = await generateCaptionsFromChunks(
        chunks,
        targetLanguage,
        translateMode,
        (current, total, msg) => {
          setProgressStatus(msg);
          const chunkProgress = 30 + Math.round((current / total) * 65);
          setProgressPercent(chunkProgress);
        }
      );

      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to generate captions');
      }

      setProgressPercent(100);
      setCaptions(result.captions || []);
      setDetectedLanguage(result.detectedLanguage || 'Auto-Detected');
      setSummary(result.summary || '');
    } catch (err: any) {
      console.error('Caption generation error:', err);
      setGenerationError(err.message || 'Error processing video captions');
    } finally {
      setIsGenerating(false);
    }
  };

  // Load sample demo video instantly
  const handleSampleSelected = (
    sample: typeof SAMPLE_VIDEOS[0],
    targetLanguage: string
  ) => {
    setVideoMeta({
      url: sample.url,
      name: sample.name,
      duration: sample.duration,
      size: 0,
    });
    setCaptions(sample.sampleCaptions);
    setDetectedLanguage(sample.detectedLanguage);
    setSummary('Sample demo video for instant caption editing and style preview.');
    setGenerationError(null);
    setIsGenerating(false);
  };

  const handleReset = () => {
    setVideoMeta(null);
    setCaptions([]);
    setCurrentTime(0);
    setGenerationError(null);
    setIsGenerating(false);
  };

  const handleSeekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        onLoadSample={() => handleSampleSelected(SAMPLE_VIDEOS[0], 'auto')}
        onReset={handleReset}
        hasVideo={!!videoMeta}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {!videoMeta ? (
          /* Landing & Upload Zone */
          <VideoUploader
            onVideoSelected={handleVideoSelected}
            onSampleSelected={handleSampleSelected}
          />
        ) : isGenerating ? (
          /* Loading State while Gemini processes video */
          <div className="max-w-xl mx-auto py-20 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Generating Automatic Captions...</h2>
              <p className="text-sm text-indigo-300 font-medium max-w-md mx-auto">
                {progressStatus}
              </p>
            </div>

            {/* Visual Progress Bar */}
            <div className="max-w-md mx-auto space-y-1.5">
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 px-0.5">
                <span>Optimizing & Transcribing</span>
                <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 inline-flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Handles full 30 min videos & audio tracks • Zero payload errors</span>
            </div>
          </div>
        ) : generationError ? (
          /* Error State */
          <div className="max-w-lg mx-auto py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Transcription Notice</h2>
            <p className="text-xs text-slate-300 bg-slate-900 border border-slate-800 p-4 rounded-xl leading-relaxed">
              {generationError}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (videoMeta) {
                    handleVideoSelected(videoMeta, 'auto', false);
                  } else {
                    handleReset();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                Retry Transcription
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                Select Another File
              </button>
            </div>
          </div>
        ) : (
          /* Main Video Workspace Editor */
          <div className="space-y-6">
            
            {/* Top Workspace Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                  VID
                </div>
                <div>
                  <h1 className="font-extrabold text-sm sm:text-base text-white truncate max-w-md">
                    {videoMeta.name}
                  </h1>
                  <p className="text-xs text-slate-400 flex items-center space-x-2">
                    <span>Language: <strong className="text-indigo-300">{detectedLanguage}</strong></span>
                    <span>•</span>
                    <span>{captions.length} captions generated</span>
                  </p>
                </div>
              </div>

              {/* Workspace Right Actions */}
              <div className="flex items-center space-x-3">
                <button
                  id="btn-export-center"
                  onClick={() => setIsExportOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT VIDEO</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Left Video Preview (Sticky) + Right Editor / Style Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Sticky Video Preview Player (5 Cols) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20 z-10 space-y-4">
                <VideoPlayer
                  videoUrl={videoMeta.url}
                  captions={captions}
                  style={captionStyle}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  onStyleChange={setCaptionStyle}
                  videoRef={videoRef}
                />

                {/* Subtitle Style Quick Switcher Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Quick Caption Presets</span>
                    </span>
                    <button
                      onClick={() => setActiveTab('style')}
                      className="text-xs text-indigo-400 hover:underline font-bold cursor-pointer"
                    >
                      All Style Options →
                    </button>
                  </div>

                  {/* Preset Pills Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLE_PRESETS.slice(0, 6).map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setCaptionStyle({ ...preset.style })}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          captionStyle.fontFamily === preset.style.fontFamily && captionStyle.highlightColor === preset.style.highlightColor
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                            : 'bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{preset.name}</div>
                        {preset.badge && (
                          <div className="text-[9px] text-amber-300 font-extrabold uppercase mt-0.5">{preset.badge}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Editor Tabs (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Mode Selector Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900 p-1.5 rounded-2xl gap-2">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      activeTab === 'editor'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>Caption Timeline Editor ({captions.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('style')}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      activeTab === 'style'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    <span>Advanced Typography & Colors</span>
                  </button>
                </div>

                {/* Active Tab View */}
                {activeTab === 'editor' ? (
                  <CaptionEditor
                    captions={captions}
                    currentTime={currentTime}
                    onCaptionsChange={setCaptions}
                    onSeekTo={handleSeekTo}
                    summary={summary}
                    detectedLanguage={detectedLanguage}
                  />
                ) : (
                  <StyleCustomizer
                    style={captionStyle}
                    onStyleChange={setCaptionStyle}
                  />
                )}

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Export & Download Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        captions={captions}
        style={captionStyle}
        videoRef={videoRef}
        videoName={videoMeta?.name}
      />

    </div>
  );
}
