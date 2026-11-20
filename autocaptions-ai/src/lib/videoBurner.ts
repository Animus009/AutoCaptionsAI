import { CaptionSegment, CaptionStyle } from '../types';

export interface BurnInProgress {
  progress: number; // 0 to 100
  status: 'initializing' | 'rendering' | 'finalizing' | 'completed' | 'error';
  errorMessage?: string;
  blobUrl?: string;
}

/**
 * Draws styled caption on a 2D canvas context based on CaptionStyle and current video timestamp
 */
export function drawCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  captions: CaptionSegment[],
  currentTime: number,
  style: CaptionStyle
) {
  // Find current active caption
  const activeCue = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  if (!activeCue) return;

  const text = style.uppercase ? activeCue.text.toUpperCase() : activeCue.text;
  if (!text.trim()) return;

  ctx.save();

  // Calculate font size proportional to canvas width (e.g. baseline 1080p canvas)
  const scale = width / 1280;
  const scaledFontSize = Math.max(14, style.fontSize * scale);
  const fontWeightStr = style.fontWeight || '800';
  const fontFamilyStr = style.fontFamily || 'Poppins, sans-serif';

  ctx.font = `${fontWeightStr} ${scaledFontSize}px ${fontFamilyStr}`;
  ctx.textAlign = style.alignment;
  ctx.textBaseline = 'middle';

  // Measure text dimensions
  const words = text.split(' ');
  const lines: string[] = [];
  const maxLineWidth = width * 0.85; // 85% max width
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxLineWidth && i > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const lineHeight = scaledFontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;
  const horizontalPadding = style.bgPaddingHorizontal * scale;
  const verticalPadding = style.bgPaddingVertical * scale;

  // Calculate vertical Y position
  let startY = height * 0.85; // Default bottom
  if (style.position === 'top') {
    startY = height * 0.15;
  } else if (style.position === 'center') {
    startY = height * 0.5;
  }
  // Apply offsetY adjustment
  startY += (style.offsetY / 100) * height;

  // Calculate horizontal X position
  let startX = width / 2;
  if (style.alignment === 'left') startX = width * 0.1;
  if (style.alignment === 'right') startX = width * 0.9;

  // Draw background box for each line or bounding block
  if (style.bgOpacity > 0 && style.bgColor) {
    ctx.save();
    ctx.fillStyle = hexToRgba(style.bgColor, style.bgOpacity);

    lines.forEach((line, idx) => {
      const lineMetrics = ctx.measureText(line);
      const boxWidth = lineMetrics.width + horizontalPadding * 2;
      const boxHeight = lineHeight + verticalPadding;

      let boxX = startX - boxWidth / 2;
      if (style.alignment === 'left') boxX = startX - horizontalPadding;
      if (style.alignment === 'right') boxX = startX - boxWidth + horizontalPadding;

      const lineY = startY + (idx - (lines.length - 1) / 2) * lineHeight;
      const boxY = lineY - boxHeight / 2;

      const cornerRadius = style.borderRadius * scale;
      drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, cornerRadius);
      ctx.fill();
    });
    ctx.restore();
  }

  // Draw Shadow
  if (style.shadow) {
    ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;
  }

  // Calculate word level animation (if TikTok word highlight enabled)
  const isWordHighlight = style.animation === 'word-highlight';
  const cueDuration = activeCue.end - activeCue.start;
  const progressInCue = Math.max(0, Math.min(1, (currentTime - activeCue.start) / cueDuration));
  const activeWordIdx = Math.floor(progressInCue * words.length);

  // Draw Stroke and Text
  lines.forEach((line, lineIdx) => {
    const lineY = startY + (lineIdx - (lines.length - 1) / 2) * lineHeight;

    if (isWordHighlight) {
      // Must set textAlign to left when rendering sequential words to prevent centered word overlap
      ctx.textAlign = 'left';

      // Draw word by word with active highlight color
      const lineWords = line.split(' ').filter(Boolean);
      const totalLineWidth = ctx.measureText(line).width;
      let currentX = startX;

      if (style.alignment === 'center') currentX = startX - totalLineWidth / 2;
      else if (style.alignment === 'right') currentX = startX - totalLineWidth;
      else currentX = startX;

      // Count global word index
      let globalWordCounter = 0;
      for (let l = 0; l < lineIdx; l++) {
        globalWordCounter += lines[l].split(' ').filter(Boolean).length;
      }

      const spaceWidth = ctx.measureText(' ').width;

      lineWords.forEach((word, wIdx) => {
        const wordMetrics = ctx.measureText(word);
        const isCurrentActive = globalWordCounter === activeWordIdx;

        ctx.fillStyle = isCurrentActive ? (style.highlightColor || '#FFE600') : style.textColor;

        // Draw Stroke
        if (style.strokeWidth > 0) {
          ctx.strokeStyle = style.strokeColor;
          ctx.lineWidth = style.strokeWidth * scale * 2;
          ctx.strokeText(word, currentX, lineY);
        }

        ctx.fillText(word, currentX, lineY);
        currentX += wordMetrics.width + (wIdx < lineWords.length - 1 ? spaceWidth : 0);
        globalWordCounter++;
      });
    } else {
      // Standard line text
      ctx.textAlign = style.alignment;
      if (style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth * scale * 2;
        ctx.strokeText(line, startX, lineY);
      }

      ctx.fillStyle = style.textColor;
      ctx.fillText(line, startX, lineY);
    }
  });

  ctx.restore();
}

/**
 * Helper to draw a rounded rectangle on Canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Convert Hex color to RGBA string
 */
function hexToRgba(hex: string, opacity: number): string {
  if (!hex || hex === 'transparent') return 'transparent';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Renders and records the video with burned-in subtitles, returning downloadable WebM/MP4 Blob URL
 */
export async function renderBurnedInVideo(
  videoElement: HTMLVideoElement,
  captions: CaptionSegment[],
  style: CaptionStyle,
  onProgress: (status: BurnInProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      onProgress({ progress: 0, status: 'initializing' });

      // Create hidden video clone for offscreen playback
      const renderVideo = document.createElement('video');
      renderVideo.src = videoElement.src;
      renderVideo.crossOrigin = 'anonymous';
      renderVideo.muted = false; // keep audio
      renderVideo.playsInline = true;

      renderVideo.onloadedmetadata = async () => {
        const width = renderVideo.videoWidth || 1280;
        const height = renderVideo.videoHeight || 720;
        const duration = renderVideo.duration || 10;

        // Setup Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // Setup Audio + Canvas Stream
        const canvasStream = canvas.captureStream(30); // 30 FPS

        let combinedStream = canvasStream;
        try {
          // Attempt capturing audio from rendering video
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioCtx.createMediaElementSource(renderVideo);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination); // enable sound during burn-in if wanted

          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) {
            combinedStream.addTrack(audioTrack);
          }
        } catch (e) {
          console.warn('Could not capture audio track for burned-in video:', e);
        }

        // Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 5000000, // 5 Mbps quality
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          onProgress({ progress: 100, status: 'finalizing' });
          const finalBlob = new Blob(chunks, { type: mimeType });
          const downloadUrl = URL.createObjectURL(finalBlob);
          onProgress({ progress: 100, status: 'completed', blobUrl: downloadUrl });
          resolve(downloadUrl);
        };

        renderVideo.currentTime = 0;
        await renderVideo.play();
        recorder.start(100);

        onProgress({ progress: 5, status: 'rendering' });

        const renderFrame = () => {
          if (renderVideo.paused || renderVideo.ended) {
            if (renderVideo.ended) {
              recorder.stop();
            }
            return;
          }

          // Draw video frame
          ctx.drawImage(renderVideo, 0, 0, width, height);

          // Draw subtitles
          drawCaptionOnCanvas(ctx, width, height, captions, renderVideo.currentTime, style);

          // Update progress
          const currentProgress = Math.min(99, Math.floor((renderVideo.currentTime / duration) * 100));
          onProgress({ progress: currentProgress, status: 'rendering' });

          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
      };

      renderVideo.onerror = (e) => {
        const errorMsg = 'Failed to load video stream for burning in subtitles';
        onProgress({ progress: 0, status: 'error', errorMessage: errorMsg });
        reject(new Error(errorMsg));
      };
    } catch (err: any) {
      onProgress({ progress: 0, status: 'error', errorMessage: err.message });
      reject(err);
    }
  });
}
