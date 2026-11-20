import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Gauge, MoveVertical } from 'lucide-react';
import { CaptionSegment, CaptionStyle } from '../types';
import { drawCaptionOnCanvas } from '../lib/videoBurner';

interface VideoPlayerProps {
  videoUrl: string;
  captions: CaptionSegment[];
  style: CaptionStyle;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onStyleChange?: (style: CaptionStyle) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  captions,
  style,
  currentTime,
  onTimeUpdate,
  onStyleChange,
  videoRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Sync video time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef, onTimeUpdate]);

  // Render subtitle overlay on canvas matching video frame
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match video container resolution
    const width = video.videoWidth || canvas.parentElement?.clientWidth || 1280;
    const height = video.videoHeight || canvas.parentElement?.clientHeight || 720;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Draw active caption onto overlay canvas
    drawCaptionOnCanvas(ctx, width, height, captions, currentTime, style);
  }, [captions, currentTime, style, videoRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      onTimeUpdate(time);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => console.error(err));
      } else {
        document.exitFullscreen().catch((err) => console.error(err));
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      
      {/* Video Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          crossOrigin="anonymous"
          className="w-full h-full object-contain pointer-events-auto"
          onClick={togglePlay}
        />

        {/* Subtitle Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10 object-contain"
        />

        {/* Center Big Play Button Overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-xl shadow-cyan-500/30 hover:scale-110 transition-transform z-20 cursor-pointer"
          >
            <Play className="w-8 h-8 fill-white ml-1" />
          </button>
        )}
      </div>

      {/* Control Toolbar */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2">
        
        {/* Scrubber Slider */}
        <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeekSlider}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-200" />}
            </button>

            <button
              onClick={() => seekRelative(-2)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Rewind 2s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => seekRelative(2)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Forward 2s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Caption Position Selector */}
            {onStyleChange && (
              <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg text-xs border border-slate-700">
                <MoveVertical className="w-3.5 h-3.5 text-indigo-400 mr-0.5" />
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Position:</span>
                {[
                  { id: 'top', label: 'Top', offset: 0 },
                  { id: 'center', label: 'Center', offset: 0 },
                  { id: 'bottom', label: 'Lower 3rd', offset: -12 },
                  { id: 'bottom', label: 'Bottom', offset: 0 },
                ].map((posItem, idx) => {
                  const isActive = style.position === posItem.id && (style.offsetY || 0) === posItem.offset;
                  return (
                    <button
                      key={`${posItem.id}-${idx}`}
                      type="button"
                      onClick={() => onStyleChange({ ...style, position: posItem.id as any, offsetY: posItem.offset })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {posItem.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Speed Selector */}
            <div className="flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg text-xs border border-slate-700">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => changeSpeed(rate)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
