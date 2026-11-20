export interface CaptionSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  speaker?: string;
}

export type SubtitlePosition = 'bottom' | 'center' | 'top';
export type TextAlignment = 'left' | 'center' | 'right';
export type CaptionAnimation = 'none' | 'fade' | 'pop' | 'word-highlight';

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number; // in px
  fontWeight: '400' | '600' | '700' | '800' | '900';
  textColor: string;
  bgColor: string;
  bgOpacity: number; // 0 to 1
  bgPaddingHorizontal: number; // in px
  bgPaddingVertical: number;   // in px
  borderRadius: number;       // in px
  strokeWidth: number;        // in px
  strokeColor: string;
  shadow: boolean;
  shadowColor: string;
  position: SubtitlePosition;
  offsetY: number;            // -50 to 50 %
  alignment: TextAlignment;
  uppercase: boolean;
  animation: CaptionAnimation;
  highlightColor: string;     // color for word-level highlights
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  style: CaptionStyle;
}

export interface LanguageOption {
  id: string; // e.g. 'auto', 'hinglish', 'benglish', 'hi', 'bn', 'en', 'es'
  name: string;
  nativeName: string;
  badge?: string;
  description: string;
}

export type ExportFormat = 'srt' | 'vtt' | 'txt' | 'json' | 'ass';

export interface VideoMeta {
  file?: File;
  url: string;
  name: string;
  duration: number; // in seconds
  size: number;     // in bytes
  width?: number;
  height?: number;
}

export interface TranscriptionResponse {
  success: boolean;
  detectedLanguage: string;
  languageConfidence: number;
  summary: string;
  captions: CaptionSegment[];
  error?: string;
}
