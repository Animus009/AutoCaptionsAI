import React, { useState } from 'react';
import {
  Download,
  FileText,
  Video,
  Check,
  Copy,
  Loader2,
  Sparkles,
  X,
  Code,
  FileCode2,
} from 'lucide-react';
import { CaptionSegment, CaptionStyle } from '../types';
import {
  exportToSRT,
  exportToVTT,
  exportToTXT,
  exportToJSON,
  exportToASS,
  downloadFile,
} from '../lib/captionParsers';
import { renderBurnedInVideo, BurnInProgress } from '../lib/videoBurner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  style: CaptionStyle;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoName?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  captions,
  style,
  videoRef,
  videoName = 'video-subtitled',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'subtitles' | 'burned-video'>('subtitles');
  const [selectedFormat, setSelectedFormat] = useState<'srt' | 'vtt' | 'txt' | 'json' | 'ass'>('srt');
  
  // Burn-in video rendering state
  const [isBurning, setIsBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState<BurnInProgress>({
    progress: 0,
    status: 'initializing',
  });
  const [burnedVideoUrl, setBurnedVideoUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseFileName = videoName.replace(/\.[^/.]+$/, '');

  const getExportContent = (format: typeof selectedFormat) => {
    switch (format) {
      case 'srt': return exportToSRT(captions);
      case 'vtt': return exportToVTT(captions);
      case 'txt': return exportToTXT(captions, true);
      case 'json': return exportToJSON(captions, style);
      case 'ass': return exportToASS(captions, style);
      default: return exportToSRT(captions);
    }
  };

  const handleDownloadSubtitle = (format: typeof selectedFormat) => {
    const content = getExportContent(format);
    const mimeMap: Record<string, string> = {
      srt: 'text/plain',
      vtt: 'text/vtt',
      txt: 'text/plain',
      json: 'application/json',
      ass: 'text/plain',
    };
    downloadFile(`${baseFileName}.${format}`, content, mimeMap[format] || 'text/plain');
  };

  const handleCopyContent = () => {
    const content = getExportContent(selectedFormat);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startBurnInVideoProcess = async () => {
    if (!videoRef.current) return;
    setIsBurning(true);
    setBurnedVideoUrl(null);

    try {
      const downloadUrl = await renderBurnedInVideo(
        videoRef.current,
        captions,
        style,
        (progressInfo) => {
          setBurnProgress(progressInfo);
        }
      );
      setBurnedVideoUrl(downloadUrl);
    } catch (err: any) {
      console.error('Burn-in video error:', err);
    } finally {
      setIsBurning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Export Subtitles & Video</h2>
              <p className="text-xs text-slate-400">
                Choose subtitle file formats or download video with burned-in subtitles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'subtitles'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Subtitle Files (SRT / VTT / ASS / TXT)</span>
          </button>

          <button
            onClick={() => setActiveTab('burned-video')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'burned-video'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Video className="w-4 h-4 text-indigo-200" />
            <span>Download Video with Burned-In Captions</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {activeTab === 'subtitles' ? (
            <div className="space-y-5">
              
              {/* Format Selection Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Select File Format
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'srt', label: '.SRT', desc: 'SubRip Standard' },
                    { id: 'vtt', label: '.VTT', desc: 'WebVTT Video' },
                    { id: 'ass', label: '.ASS', desc: 'Styled SubStation' },
                    { id: 'txt', label: '.TXT', desc: 'Plain Transcript' },
                    { id: 'json', label: '.JSON', desc: 'Raw Data' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedFormat === fmt.id
                          ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-extrabold text-xs block">{fmt.label}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 truncate">{fmt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Code Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">Preview ({selectedFormat.toUpperCase()})</span>
                  <button
                    onClick={handleCopyContent}
                    className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Content'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={getExportContent(selectedFormat)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-300/90 focus:outline-none resize-none"
                />
              </div>

              {/* Download Button */}
              <button
                onClick={() => handleDownloadSubtitle(selectedFormat)}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD .{selectedFormat.toUpperCase()} SUBTITLE FILE</span>
              </button>

            </div>
          ) : (
            <div className="space-y-6 text-center py-2">
              
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Burn-In Subtitles Directly onto Video</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Your video will be rendered frame-by-frame with your selected typography, colors, and TikTok word highlights applied cleanly.
                  </p>
                </div>
              </div>

              {/* Progress Tracker */}
              {isBurning && (
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                    <span className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Rendering video frames with subtitles...</span>
                    </span>
                    <span className="font-mono text-cyan-400">{burnProgress.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${burnProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Download Burned Video Button */}
              {burnedVideoUrl ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Burned-in Subtitle Video Ready for Download!</span>
                  </div>
                  <a
                    href={burnedVideoUrl}
                    download={`${baseFileName}-subtitled.webm`}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download Burned-In Video File</span>
                  </a>
                </div>
              ) : (
                <button
                  onClick={startBurnInVideoProcess}
                  disabled={isBurning}
                  className={`w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer ${
                    isBurning ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isBurning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Video Stream... ({burnProgress.progress}%)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Start Burn-In & Download Video</span>
                    </>
                  )}
                </button>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
