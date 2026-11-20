import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Split,
  Merge,
  Search,
  Clock,
  Upload,
  Sparkles,
  ArrowRight,
  Check,
  ChevronUp,
  ChevronDown,
  Languages,
  Loader2,
} from 'lucide-react';
import { CaptionSegment } from '../types';
import { formatDisplayTime, parseSubtitleFile } from '../lib/captionParsers';
import { convertCaptionScript } from '../lib/gemini';

interface CaptionEditorProps {
  captions: CaptionSegment[];
  currentTime: number;
  onCaptionsChange: (captions: CaptionSegment[]) => void;
  onSeekTo: (time: number) => void;
  summary?: string;
  detectedLanguage?: string;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  captions,
  currentTime,
  onCaptionsChange,
  onSeekTo,
  summary,
  detectedLanguage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [isConvertingScript, setIsConvertingScript] = useState(false);
  const [shiftOffset, setShiftOffset] = useState(0.5);

  const handleConvertScript = async (targetScript: string) => {
    if (captions.length === 0) return;
    setIsConvertingScript(true);
    try {
      const res = await convertCaptionScript(captions, targetScript);
      if (res.success && res.captions) {
        onCaptionsChange(res.captions);
      } else {
        alert(res.error || 'Failed to convert caption script');
      }
    } catch (e: any) {
      alert(e.message || 'Error converting script');
    } finally {
      setIsConvertingScript(false);
      setShowScriptModal(false);
    }
  };

  const handleTextChange = (id: string, text: string) => {
    onCaptionsChange(
      captions.map((c) => (c.id === id ? { ...c, text } : c))
    );
  };

  const handleTimeChange = (id: string, field: 'start' | 'end', delta: number) => {
    onCaptionsChange(
      captions.map((c) => {
        if (c.id === id) {
          const newVal = Math.max(0, parseFloat((c[field] + delta).toFixed(2)));
          if (field === 'start' && newVal >= c.end) return c;
          if (field === 'end' && newVal <= c.start) return c;
          return { ...c, [field]: newVal };
        }
        return c;
      })
    );
  };

  const addSegment = (index: number) => {
    const prev = captions[index];
    const newStart = prev ? parseFloat((prev.end + 0.1).toFixed(2)) : 0;
    const newEnd = parseFloat((newStart + 2.5).toFixed(2));

    const newCap: CaptionSegment = {
      id: `cap-${Date.now()}`,
      start: newStart,
      end: newEnd,
      text: 'New subtitle cue text...',
    };

    const updated = [...captions];
    updated.splice(index + 1, 0, newCap);
    onCaptionsChange(updated);
  };

  const deleteSegment = (id: string) => {
    if (captions.length <= 1) return;
    onCaptionsChange(captions.filter((c) => c.id !== id));
  };

  const splitAtPlayhead = (id: string) => {
    const cue = captions.find((c) => c.id === id);
    if (!cue) return;

    if (currentTime <= cue.start || currentTime >= cue.end) return;

    const words = cue.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const text1 = words.slice(0, half).join(' ');
    const text2 = words.slice(half).join(' ');

    const cue1: CaptionSegment = {
      ...cue,
      end: parseFloat(currentTime.toFixed(2)),
      text: text1 || '...',
    };

    const cue2: CaptionSegment = {
      id: `cap-${Date.now()}`,
      start: parseFloat((currentTime + 0.05).toFixed(2)),
      end: cue.end,
      text: text2 || '...',
    };

    const index = captions.findIndex((c) => c.id === id);
    const updated = [...captions];
    updated.splice(index, 1, cue1, cue2);
    onCaptionsChange(updated);
  };

  const mergeWithNext = (index: number) => {
    if (index >= captions.length - 1) return;
    const current = captions[index];
    const next = captions[index + 1];

    const merged: CaptionSegment = {
      id: current.id,
      start: current.start,
      end: next.end,
      text: `${current.text} ${next.text}`.trim(),
    };

    const updated = [...captions];
    updated.splice(index, 2, merged);
    onCaptionsChange(updated);
  };

  const shiftAllTimestamps = (seconds: number) => {
    onCaptionsChange(
      captions.map((c) => ({
        ...c,
        start: Math.max(0, parseFloat((c.start + seconds).toFixed(2))),
        end: Math.max(0.1, parseFloat((c.end + seconds).toFixed(2))),
      }))
    );
  };

  const handleFindReplace = () => {
    if (!searchTerm) return;
    const regex = new RegExp(searchTerm, 'gi');
    onCaptionsChange(
      captions.map((c) => ({
        ...c,
        text: c.text.replace(regex, replaceTerm),
      }))
    );
    setShowSearchModal(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseSubtitleFile(text);
      if (parsed.length > 0) {
        onCaptionsChange(parsed);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-full overflow-hidden shadow-xl">
      
      {/* Editor Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-extrabold text-sm text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Interactive Caption Timeline</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 text-[11px] font-mono border border-slate-700">
              {captions.length} cues
            </span>
          </div>
          {detectedLanguage && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Detected Language: <span className="text-indigo-300 font-semibold">{detectedLanguage}</span>
            </p>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* AI Script / Language Switcher Button */}
          <button
            onClick={() => setShowScriptModal(!showScriptModal)}
            disabled={isConvertingScript}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isConvertingScript ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            ) : (
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Convert Script (Hinglish / Benglish / Hindi)</span>
          </button>

          {/* Find & Replace */}
          <button
            onClick={() => setShowSearchModal(!showSearchModal)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span>Find & Replace</span>
          </button>

          {/* Time Offset Tool */}
          <div className="flex items-center bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
            <button
              onClick={() => shiftAllTimestamps(-shiftOffset)}
              className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-[11px] font-bold cursor-pointer"
              title={`Shift all back by -${shiftOffset}s`}
            >
              -{shiftOffset}s
            </button>
            <span className="text-slate-600 px-1">|</span>
            <button
              onClick={() => shiftAllTimestamps(shiftOffset)}
              className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-[11px] font-bold cursor-pointer"
              title={`Shift all forward by +${shiftOffset}s`}
            >
              +{shiftOffset}s
            </button>
          </div>

          {/* Import Subtitle File */}
          <label className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import SRT/VTT</span>
            <input type="file" accept=".srt,.vtt,.txt" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Script Conversion Popover Bar */}
      {showScriptModal && (
        <div className="p-3 bg-indigo-950/80 border-b border-indigo-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-indigo-200">
            <Languages className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-bold">Convert Caption Script/Language:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'hinglish', label: 'Hinglish (Hindi in English Script)' },
              { id: 'benglish', label: 'Benglish (Bengali in English Script)' },
              { id: 'hindi', label: 'Hindi (Devanagari)' },
              { id: 'bengali', label: 'Bengali (Bangla)' },
              { id: 'english', label: 'English Translation' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => handleConvertScript(s.id)}
                disabled={isConvertingScript}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => setShowScriptModal(false)}
              className="px-2 py-1 text-slate-400 hover:text-white text-[11px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Box if present */}
      {summary && (
        <div className="px-4 py-2 bg-slate-850/60 border-b border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
          <span className="font-semibold text-cyan-400 shrink-0">Summary:</span>
          <span className="truncate italic text-slate-400">{summary}</span>
        </div>
      )}

      {/* Find & Replace Popover Bar */}
      {showSearchModal && (
        <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center space-x-2 text-xs">
          <input
            type="text"
            placeholder="Search word..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white w-32 focus:outline-none focus:border-cyan-500"
          />
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white w-32 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleFindReplace}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded cursor-pointer"
          >
            Replace All
          </button>
          <button
            onClick={() => setShowSearchModal(false)}
            className="text-slate-400 hover:text-slate-200 ml-auto cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Scrollable Caption Cues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/40">
        {captions.map((cap, index) => {
          const isActive = currentTime >= cap.start && currentTime <= cap.end;

          return (
            <div
              key={cap.id}
              className={`pt-3 first:pt-0 p-3 rounded-xl transition-all border ${
                isActive
                  ? 'bg-indigo-500/10 border-indigo-500/60 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                
                {/* Index & Jump to Time */}
                <div className="flex items-center space-x-2 shrink-0 pt-1">
                  <button
                    onClick={() => onSeekTo(cap.start)}
                    className={`px-2 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-indigo-400 hover:bg-slate-700'
                    }`}
                    title="Click to jump video to this cue"
                  >
                    #{index + 1}
                  </button>

                  {/* Start and End Time Adjusters */}
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    {/* Start Time */}
                    <div className="flex items-center space-x-1">
                      <span>{formatDisplayTime(cap.start)}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleTimeChange(cap.id, 'start', 0.1)}
                          className="hover:text-cyan-400 cursor-pointer text-[9px]"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleTimeChange(cap.id, 'start', -0.1)}
                          className="hover:text-cyan-400 cursor-pointer text-[9px]"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    <span className="text-slate-600">→</span>

                    {/* End Time */}
                    <div className="flex items-center space-x-1">
                      <span>{formatDisplayTime(cap.end)}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleTimeChange(cap.id, 'end', 0.1)}
                          className="hover:text-cyan-400 cursor-pointer text-[9px]"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleTimeChange(cap.id, 'end', -0.1)}
                          className="hover:text-cyan-400 cursor-pointer text-[9px]"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Text Area */}
                <div className="flex-1 min-w-0">
                  <textarea
                    rows={2}
                    value={cap.text}
                    onChange={(e) => handleTextChange(cap.id, e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-500 rounded-lg p-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none font-sans"
                    placeholder="Enter subtitle text..."
                  />
                </div>

                {/* Segment Action Buttons */}
                <div className="flex flex-col space-y-1 shrink-0 pt-0.5">
                  {/* Split */}
                  <button
                    onClick={() => splitAtPlayhead(cap.id)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Split segment at current playhead position"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>

                  {/* Merge with next */}
                  {index < captions.length - 1 && (
                    <button
                      onClick={() => mergeWithNext(index)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      title="Merge with next caption cue"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Add below */}
                  <button
                    onClick={() => addSegment(index)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Insert new cue below"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteSegment(cap.id)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete cue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
