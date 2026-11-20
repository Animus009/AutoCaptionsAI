import { TranscriptionResponse, CaptionSegment } from '../types';
import { AudioChunk } from './audioExtractor';

export async function generateCaptionsFromMedia(
  mediaBase64: string,
  mimeType: string,
  targetLanguage: string = 'auto',
  translateMode: boolean = false
): Promise<TranscriptionResponse> {
  try {
    const response = await fetch('/api/generate-captions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaBase64,
        mimeType,
        targetLanguage,
        translateMode,
      }),
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('Payload too large for a single request. Audio chunking is automatically optimizing the media.');
      }
      const errorData = await response.json().catch(() => ({}));
      let errMsg = errorData.error || `Server returned error status ${response.status}`;
      
      // Clean JSON error if nested
      if (typeof errMsg === 'string' && (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota'))) {
        errMsg = 'Gemini API free-tier quota limit reached. Please wait ~30 seconds before retrying.';
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data as TranscriptionResponse;
  } catch (err: any) {
    console.error('Failed to generate captions via API:', err);
    let message = err.message || 'Failed to connect to caption service';
    if (typeof message === 'string' && (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota'))) {
      message = 'Gemini API free-tier quota limit reached. Please wait ~30 seconds before retrying.';
    }
    return {
      success: false,
      detectedLanguage: 'Unknown',
      languageConfidence: 0,
      summary: '',
      captions: [],
      error: message,
    };
  }
}

/**
 * Robust multi-chunk transcription runner for files up to 30+ minutes.
 * Automatically splits audio to avoid 413 Payload Too Large, handles rate limits, and updates progress in real-time.
 */
export async function generateCaptionsFromChunks(
  chunks: AudioChunk[],
  targetLanguage: string = 'auto',
  translateMode: boolean = false,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<TranscriptionResponse> {
  if (!chunks || chunks.length === 0) {
    return {
      success: false,
      detectedLanguage: 'Unknown',
      languageConfidence: 0,
      summary: '',
      captions: [],
      error: 'No audio data extracted from file.',
    };
  }

  let allCaptions: CaptionSegment[] = [];
  let detectedLanguage = 'Unknown';
  let languageConfidence = 0.95;
  const summaries: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progressLabel = chunks.length > 1
      ? `Analyzing audio segment ${i + 1} of ${chunks.length}...`
      : 'Analyzing audio speech with Gemini AI...';
    
    onProgress?.(i + 1, chunks.length, progressLabel);

    let res: TranscriptionResponse | null = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      res = await generateCaptionsFromMedia(
        chunk.base64,
        chunk.mimeType,
        targetLanguage,
        translateMode
      );

      if (res.success && !res.error) {
        break;
      }

      // If rate limited or service busy, wait briefly and retry once
      const isRetryable =
        res.error?.includes('quota') ||
        res.error?.includes('429') ||
        res.error?.includes('RESOURCE_EXHAUSTED') ||
        res.error?.includes('busy') ||
        res.error?.includes('503');

      if (isRetryable && attempts < maxAttempts) {
        onProgress?.(i + 1, chunks.length, `Rate limit reached. Waiting 12s before retrying segment ${i + 1}...`);
        await new Promise((resolve) => setTimeout(resolve, 12000));
        continue;
      }

      break;
    }

    if (!res || !res.success || res.error) {
      if (chunks.length === 1 || allCaptions.length === 0) {
        return res || {
          success: false,
          detectedLanguage: 'Unknown',
          languageConfidence: 0,
          summary: '',
          captions: [],
          error: 'Failed to transcribe audio segment',
        };
      }
      console.warn(`Warning on segment ${i + 1}:`, res?.error);
    }

    if (res && res.detectedLanguage && res.detectedLanguage !== 'Unknown') {
      detectedLanguage = res.detectedLanguage;
    }
    if (res && res.summary) {
      summaries.push(res.summary);
    }

    if (res && Array.isArray(res.captions) && res.captions.length > 0) {
      const offsetCaptions = res.captions.map((c) => ({
        ...c,
        start: parseFloat((c.start + chunk.startOffset).toFixed(2)),
        end: parseFloat((c.end + chunk.startOffset).toFixed(2)),
      }));
      allCaptions.push(...offsetCaptions);
    }

    // Brief cooldown between chunks to avoid bursting the API rate limiter
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  // Sort and re-index all cues sequentially
  allCaptions.sort((a, b) => a.start - b.start);
  allCaptions = allCaptions.map((cap, idx) => ({
    ...cap,
    id: `cap-${idx + 1}`,
  }));

  if (allCaptions.length === 0) {
    return {
      success: false,
      detectedLanguage,
      languageConfidence: 0,
      summary: '',
      captions: [],
      error: 'No spoken dialogue detected in the provided audio file.',
    };
  }

  return {
    success: true,
    detectedLanguage,
    languageConfidence,
    summary: summaries.join(' '),
    captions: allCaptions,
  };
}

export async function convertCaptionScript(
  captions: any[],
  targetScript: string
): Promise<{ success: boolean; captions?: any[]; error?: string }> {
  try {
    const response = await fetch('/api/convert-script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        captions,
        targetScript,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed script conversion status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, captions: data.captions };
  } catch (err: any) {
    console.error('Script conversion error:', err);
    return { success: false, error: err.message || 'Failed to convert caption script' };
  }
}
