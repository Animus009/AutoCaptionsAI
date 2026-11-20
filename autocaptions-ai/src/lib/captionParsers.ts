import { CaptionSegment, CaptionStyle } from '../types';

/**
 * Formats seconds into HH:MM:SS,MS (SRT format, e.g. 00:01:23,450)
 */
export function formatSRTTime(seconds: number): string {
  const pad = (num: number, size = 2) => String(num).padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Formats seconds into HH:MM:SS.MS (VTT format, e.g. 00:01:23.450)
 */
export function formatVTTTime(seconds: number): string {
  const pad = (num: number, size = 2) => String(num).padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * Formats seconds into M:SS or MM:SS for display
 */
export function formatDisplayTime(seconds: number): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);

  return `${mins}:${pad(secs)}.${ms}`;
}

/**
 * Export to SRT (.srt) format string
 */
export function exportToSRT(captions: CaptionSegment[]): string {
  return captions
    .map((cap, index) => {
      const startTime = formatSRTTime(cap.start);
      const endTime = formatSRTTime(cap.end);
      const speakerPrefix = cap.speaker ? `[${cap.speaker}] ` : '';
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerPrefix}${cap.text}\n`;
    })
    .join('\n');
}

/**
 * Export to WebVTT (.vtt) format string
 */
export function exportToVTT(captions: CaptionSegment[]): string {
  let content = 'WEBVTT\n\n';
  content += captions
    .map((cap, index) => {
      const startTime = formatVTTTime(cap.start);
      const endTime = formatVTTTime(cap.end);
      const speakerPrefix = cap.speaker ? `<v ${cap.speaker}>` : '';
      return `${index + 1}\n${startTime} --> ${endTime}\n${speakerPrefix}${cap.text}\n`;
    })
    .join('\n');
  return content;
}

/**
 * Export to Plain Text (.txt) format string
 */
export function exportToTXT(captions: CaptionSegment[], includeTimestamps = true): string {
  if (!includeTimestamps) {
    return captions.map((c) => c.text).join('\n');
  }

  return captions
    .map((c) => {
      const time = formatDisplayTime(c.start);
      const speaker = c.speaker ? `${c.speaker}: ` : '';
      return `[${time}] ${speaker}${c.text}`;
    })
    .join('\n');
}

/**
 * Export to JSON (.json) format string
 */
export function exportToJSON(captions: CaptionSegment[], style?: CaptionStyle): string {
  return JSON.stringify(
    {
      generator: 'AutoCaptions AI',
      timestamp: new Date().toISOString(),
      captionCount: captions.length,
      style: style || null,
      captions,
    },
    null,
    2
  );
}

/**
 * Export to Advanced SubStation Alpha (.ass) format string with full visual styling!
 */
export function exportToASS(captions: CaptionSegment[], style: CaptionStyle): string {
  const fontName = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  const primaryColor = hexToASSColor(style.textColor);
  const backColor = hexToASSColor(style.bgColor, style.bgOpacity);
  const outlineColor = hexToASSColor(style.strokeColor);

  let ass = `[Script Info]
Title: AutoCaptions AI Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${style.fontSize},${primaryColor},&H00000000,${outlineColor},${backColor},${style.fontWeight === '700' || style.fontWeight === '800' || style.fontWeight === '900' ? 1 : 0},0,0,0,100,100,0,0,1,${style.strokeWidth},${style.shadow ? 2 : 0},2,10,10,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  captions.forEach((cap) => {
    const startStr = formatASSTime(cap.start);
    const endStr = formatASSTime(cap.end);
    const textStr = style.uppercase ? cap.text.toUpperCase() : cap.text;
    ass += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${textStr}\n`;
  });

  return ass;
}

/**
 * Formats time into ASS format (H:MM:SS.cs)
 */
function formatASSTime(seconds: number): string {
  const pad = (num: number, size = 2) => String(num).padStart(size, '0');
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);

  return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(cs)}`;
}

/**
 * Converts Hex / RGBA color to ASS &HAABBGGRR format
 */
function hexToASSColor(hexOrRgb: string, alphaMultiplier = 1): string {
  if (!hexOrRgb || hexOrRgb === 'transparent') return '&HFF000000';

  let hex = hexOrRgb.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  if (hex.length === 6) {
    const r = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const b = hex.substring(4, 6);
    const alphaHex = Math.floor((1 - alphaMultiplier) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
    return `&H${alphaHex}${b}${g}${r}`.toUpperCase();
  }

  return '&H00FFFFFF';
}

/**
 * Parses an SRT or VTT string back into CaptionSegment array for import
 */
export function parseSubtitleFile(text: string): CaptionSegment[] {
  const lines = text.split(/\r?\n/);
  const captions: CaptionSegment[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let currentTextLines: string[] = [];
  let inCue = false;

  const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (timeRegex.test(line)) {
      const match = line.match(timeRegex);
      if (match) {
        if (inCue && currentTextLines.length > 0) {
          captions.push({
            id: `imported-${captions.length + 1}`,
            start: currentStart,
            end: currentEnd,
            text: currentTextLines.join(' '),
          });
          currentTextLines = [];
        }

        currentStart =
          parseInt(match[1]) * 3600 +
          parseInt(match[2]) * 60 +
          parseInt(match[3]) +
          parseInt(match[4]) / 1000;
        currentEnd =
          parseInt(match[5]) * 3600 +
          parseInt(match[6]) * 60 +
          parseInt(match[7]) +
          parseInt(match[8]) / 1000;
        inCue = true;
      }
    } else if (inCue && line !== '' && !/^\d+$/.test(line) && line !== 'WEBVTT') {
      currentTextLines.push(line.replace(/<[^>]*>/g, '')); // strip HTML tags
    } else if (line === '' && inCue) {
      if (currentTextLines.length > 0) {
        captions.push({
          id: `imported-${captions.length + 1}`,
          start: currentStart,
          end: currentEnd,
          text: currentTextLines.join(' '),
        });
        currentTextLines = [];
        inCue = false;
      }
    }
  }

  if (inCue && currentTextLines.length > 0) {
    captions.push({
      id: `imported-${captions.length + 1}`,
      start: currentStart,
      end: currentEnd,
      text: currentTextLines.join(' '),
    });
  }

  return captions;
}

/**
 * Triggers file download in browser
 */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
