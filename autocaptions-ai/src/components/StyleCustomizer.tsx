import React from 'react';
import {
  Palette,
  Type,
  Layout,
  Zap,
  Film,
  Sparkles,
  Square,
  Flame,
  ArrowUpToLine,
  Sliders,
  Check,
} from 'lucide-react';
import { CaptionStyle, StylePreset } from '../types';
import { STYLE_PRESETS } from '../data/presets';

interface StyleCustomizerProps {
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
}

const FONT_OPTIONS = [
  { label: 'Poppins (Modern Clean)', value: 'Poppins, sans-serif' },
  { label: 'Montserrat (Bold Viral)', value: 'Montserrat, sans-serif' },
  { label: 'Inter (Classic Sans)', value: 'Inter, sans-serif' },
  { label: 'Oswald (Tall Display)', value: 'Oswald, sans-serif' },
  { label: 'JetBrains Mono (Tech)', value: 'JetBrains Mono, monospace' },
  { label: 'Impact (Comic Bold)', value: 'Impact, sans-serif' },
  { label: 'Noto Sans Devanagari (Hindi)', value: 'Noto Sans Devanagari, sans-serif' },
  { label: 'Noto Sans Bengali (Bangla)', value: 'Noto Sans Bengali, sans-serif' },
];

const PRESET_COLORS = [
  '#FFFFFF', '#FACC15', '#06B6D4', '#EC4899', '#10B981', '#3B82F6', '#F97316', '#000000'
];

export const StyleCustomizer: React.FC<StyleCustomizerProps> = ({
  style,
  onStyleChange,
}) => {
  const updateStyleField = <K extends keyof CaptionStyle>(
    key: K,
    value: CaptionStyle[K]
  ) => {
    onStyleChange({ ...style, [key]: value });
  };

  const applyPreset = (preset: StylePreset) => {
    onStyleChange({ ...preset.style });
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Film': return <Film className="w-4 h-4 text-cyan-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-pink-400" />;
      case 'Square': return <Square className="w-4 h-4 text-emerald-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-red-400" />;
      case 'ArrowUpToLine': return <ArrowUpToLine className="w-4 h-4 text-blue-400" />;
      default: return <Palette className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-6 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5 text-indigo-400" />
          <h2 className="font-extrabold text-sm text-white">Subtitle Visual Style & Presets</h2>
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick Visual Presets</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="p-1 rounded-lg bg-slate-900 border border-slate-700">
                  {getPresetIcon(preset.icon)}
                </span>
                {preset.badge && (
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {preset.badge}
                  </span>
                )}
              </div>
              <div className="font-bold text-xs text-slate-200 mt-2 group-hover:text-indigo-400 transition-colors">
                {preset.name}
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800/80">
        
        {/* Left Column: Typography & Text Colors */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Type className="w-4 h-4 text-cyan-400" />
            <span>Typography & Colors</span>
          </h3>

          {/* Font Family */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Font Family</label>
            <select
              value={style.fontFamily}
              onChange={(e) => updateStyleField('fontFamily', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Slider & Quick Size Presets */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Font Size Adjustment</span>
              <span className="font-mono text-indigo-400 font-extrabold">{style.fontSize}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={80}
              value={style.fontSize}
              onChange={(e) => updateStyleField('fontSize', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            {/* Quick Size Preset Buttons */}
            <div className="flex items-center justify-between gap-1 mt-1.5">
              {[
                { label: 'S', size: 20 },
                { label: 'M', size: 28 },
                { label: 'L', size: 36 },
                { label: 'XL', size: 48 },
                { label: 'XXL', size: 64 },
                { label: 'MAX', size: 80 },
              ].map((p) => (
                <button
                  key={p.size}
                  type="button"
                  onClick={() => updateStyleField('fontSize', p.size)}
                  className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                    style.fontSize === p.size
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {p.label} ({p.size})
                </button>
              ))}
            </div>
          </div>

          {/* Text Color Swatches & Color Picker */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Text Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={style.textColor}
                onChange={(e) => updateStyleField('textColor', e.target.value)}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer shrink-0"
              />
              <div className="flex items-center space-x-1.5 flex-1 overflow-x-auto">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateStyleField('textColor', c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                      style.textColor.toUpperCase() === c.toUpperCase()
                        ? 'scale-125 border-indigo-400 ring-2 ring-indigo-500/50'
                        : 'border-slate-700 hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Active Word Highlight Options (TikTok / Reels Style) */}
          <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700/90 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block">Active Word Highlight</span>
                <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Highlights active spoken word in real-time</span>
              </div>
              <button
                type="button"
                onClick={() => updateStyleField('animation', style.animation === 'word-highlight' ? 'none' : 'word-highlight')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  style.animation === 'word-highlight'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {style.animation === 'word-highlight' ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Highlight Color Selection */}
            {style.animation === 'word-highlight' && (
              <div className="pt-2 border-t border-slate-700/70 space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-300 block">Highlight Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={style.highlightColor || '#FFE600'}
                    onChange={(e) => updateStyleField('highlightColor', e.target.value)}
                    className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer shrink-0"
                  />
                  <div className="flex items-center space-x-1.5 flex-1 overflow-x-auto">
                    {['#FFE600', '#FACC15', '#84CC16', '#06B6D4', '#EC4899', '#F97316', '#FFFFFF'].map((hc) => (
                      <button
                        key={hc}
                        type="button"
                        onClick={() => updateStyleField('highlightColor', hc)}
                        style={{ backgroundColor: hc }}
                        className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                          (style.highlightColor || '').toUpperCase() === hc.toUpperCase()
                            ? 'scale-125 border-white ring-2 ring-indigo-500'
                            : 'border-slate-700 hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Background, Outline & Position */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Layout className="w-4 h-4 text-cyan-400" />
            <span>Background Box & Position</span>
          </h3>

          {/* Background Opacity & Box Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Box Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={style.bgColor}
                  onChange={(e) => updateStyleField('bgColor', e.target.value)}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">{style.bgColor}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Box Opacity</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(style.bgOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={style.bgOpacity}
                onChange={(e) => updateStyleField('bgOpacity', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Outline Stroke Width */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Text Outline Stroke</span>
              <span className="font-mono text-cyan-400 font-bold">{style.strokeWidth}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={style.strokeWidth}
              onChange={(e) => updateStyleField('strokeWidth', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Position & Screen Placement Selection */}
          <div className="space-y-3 p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">Screen Placement</label>
              <span className="text-[11px] font-mono text-indigo-400 font-bold">
                {style.position.toUpperCase()} {style.offsetY ? `(${style.offsetY > 0 ? '+' : ''}${style.offsetY}%)` : ''}
              </span>
            </div>

            {/* Major Screen Position Presets */}
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[
                { id: 'top', label: 'Top', offset: 0 },
                { id: 'center', label: 'Center', offset: 0 },
                { id: 'bottom', label: 'Lower 3rd', offset: -12 },
                { id: 'bottom', label: 'Bottom', offset: 0 },
              ].map((posItem, idx) => {
                const isActive = style.position === posItem.id && style.offsetY === posItem.offset;
                return (
                  <button
                    key={`${posItem.id}-${idx}`}
                    type="button"
                    onClick={() => {
                      onStyleChange({ ...style, position: posItem.id as any, offsetY: posItem.offset });
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {posItem.label}
                  </button>
                );
              })}
            </div>

            {/* Vertical Y-Offset Height Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Vertical Y-Offset Adjustment</span>
                <span className="font-mono text-indigo-400 font-bold">{style.offsetY || 0}%</span>
              </div>
              <input
                type="range"
                min={-40}
                max={40}
                step={2}
                value={style.offsetY || 0}
                onChange={(e) => updateStyleField('offsetY', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                <span>Higher (Top)</span>
                <span>Default</span>
                <span>Lower (Bottom)</span>
              </div>
            </div>
          </div>

          {/* Uppercase & Alignment Toggles */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={style.uppercase}
                onChange={(e) => updateStyleField('uppercase', e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="font-bold">ALL CAPS (UPPERCASE)</span>
            </label>

            <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateStyleField('alignment', align)}
                  className={`px-2 py-0.5 rounded capitalize text-[11px] font-mono cursor-pointer ${
                    style.alignment === align
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
