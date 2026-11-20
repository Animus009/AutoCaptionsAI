import React, { useState, useRef } from 'react';
import { Upload, Film, Sparkles, Languages, Check, FileVideo, FileAudio, AlertCircle, Play, Music } from 'lucide-react';
import { LANGUAGE_OPTIONS, SAMPLE_VIDEOS } from '../data/presets';
import { VideoMeta } from '../types';

interface VideoUploaderProps {
  onVideoSelected: (video: VideoMeta, targetLanguage: string, translateMode: boolean) => void;
  onSampleSelected: (sample: typeof SAMPLE_VIDEOS[0], targetLanguage: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoSelected,
  onSampleSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLang, setSelectedLang] = useState('auto');
  const [translateMode, setTranslateMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndProcessFile = (file: File) => {
    setErrorMsg(null);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i.test(file.name);

    if (!isVideo && !isAudio) {
      setErrorMsg('Please upload a valid video or audio file (.mp4, .webm, .mov, .mp3, .wav, .m4a, .aac, .ogg)');
      return;
    }

    const fileUrl = URL.createObjectURL(file);

    if (isAudio && !isVideo) {
      const tempAudio = new Audio();
      tempAudio.preload = 'metadata';
      tempAudio.src = fileUrl;

      tempAudio.onloadedmetadata = () => {
        const duration = tempAudio.duration;
        onVideoSelected(
          {
            file,
            url: fileUrl,
            name: file.name,
            duration: Math.round(duration || 0),
            size: file.size,
            width: 1280,
            height: 720,
          },
          selectedLang,
          translateMode
        );
      };

      tempAudio.onerror = () => {
        setErrorMsg('Could not load audio metadata. Please try a different audio format.');
      };
      return;
    }

    // Video metadata
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = fileUrl;

    tempVideo.onloadedmetadata = () => {
      const duration = tempVideo.duration;
      if (duration > 1800) {
        console.warn('Media is longer than 30 minutes; processing may take longer');
      }

      onVideoSelected(
        {
          file,
          url: fileUrl,
          name: file.name,
          duration: Math.round(duration),
          size: file.size,
          width: tempVideo.videoWidth || 1280,
          height: tempVideo.videoHeight || 720,
        },
        selectedLang,
        translateMode
      );
    };

    tempVideo.onerror = () => {
      setErrorMsg('Could not load media metadata. Please try a different video/audio format.');
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Title & Introduction */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>AI Multilingual Video Subtitler & Burn-In Generator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Automatically Generate & Edit Video Captions
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Upload videos up to 2-5 minutes. Supports <strong className="text-amber-300">Hinglish</strong>, <strong className="text-emerald-300">Benglish</strong>, Hindi, Bengali & 50+ languages. Download SRT, WebVTT, or video with burned-in subtitles.
        </p>
      </div>

      {/* Language Selection Bar */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Languages className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">1. Select Video Target Language</h2>
          </div>
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={translateMode}
              onChange={(e) => setTranslateMode(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
            />
            <span>Auto-Translate Speech to Target Language</span>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = selectedLang === lang.id;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedLang(lang.id)}
                className={`relative p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{lang.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{lang.nativeName}</div>
                {lang.badge && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {lang.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        id="dropzone-video"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900 hover:bg-slate-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.m4a,.aac,.ogg,.flac"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-xl group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-lg font-bold text-white">
              Drag & Drop your video or audio file here, or <span className="text-indigo-400 underline decoration-indigo-500/40">browse</span>
            </p>
            <p className="text-xs text-slate-400">
              Supports <strong className="text-slate-200">Video</strong> (MP4, WebM, MOV, AVI) & <strong className="text-slate-200">Audio</strong> (MP3, WAV, M4A, AAC, OGG) up to 30 mins
            </p>
          </div>

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-800/80 text-xs text-slate-300 border border-slate-700">
            <FileVideo className="w-4 h-4 text-indigo-400 shrink-0" />
            <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Auto-detects speech from video or voice audio tracks</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Instant Sample Video Selector */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Film className="w-4 h-4 text-amber-400" />
            <span>Or test immediately with Sample Demo Videos</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_VIDEOS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onSampleSelected(sample, selectedLang)}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition-all cursor-pointer group flex items-start space-x-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-cyan-400/20" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {sample.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {sample.duration}s
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {sample.description}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-amber-300">
                  Detected: {sample.detectedLanguage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
