/**
 * Converts a File or Blob to a base64 string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export interface AudioChunk {
  base64: string;
  mimeType: string;
  startOffset: number; // in seconds
  duration: number;    // in seconds
}

/**
 * Resamples an AudioBuffer slice to 16,000 Hz Mono (standard speech recognition format).
 * This ensures lightweight payloads (< 5MB per chunk) preventing HTTP 413 Payload Too Large errors.
 */
async function resampleSliceTo16kMono(
  sourceBuffer: AudioBuffer,
  startSample: number,
  endSample: number
): Promise<AudioBuffer> {
  const targetSampleRate = 16000;
  const numSourceSamples = endSample - startSample;
  const durationSeconds = numSourceSamples / sourceBuffer.sampleRate;
  const targetLength = Math.max(1, Math.ceil(durationSeconds * targetSampleRate));

  // Extract source mono channel slice
  const sourceChannel = sourceBuffer.getChannelData(0);
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: sourceBuffer.sampleRate,
  });

  const sliceBuffer = tempCtx.createBuffer(1, numSourceSamples, sourceBuffer.sampleRate);
  const sliceData = sliceBuffer.getChannelData(0);

  // If stereo or multi-channel, average the channels to mono
  if (sourceBuffer.numberOfChannels > 1) {
    const channel1 = sourceBuffer.getChannelData(0);
    const channel2 = sourceBuffer.getChannelData(1);
    for (let i = 0; i < numSourceSamples; i++) {
      sliceData[i] = (channel1[startSample + i] + channel2[startSample + i]) * 0.5;
    }
  } else {
    for (let i = 0; i < numSourceSamples; i++) {
      sliceData[i] = sourceChannel[startSample + i];
    }
  }
  await tempCtx.close();

  // Fast offline resampling to 16,000 Hz
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    1,
    targetLength,
    targetSampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = sliceBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Extracts and partitions audio from a video or audio file into lightweight chunks (<= 2.5 minutes each).
 * Prevents HTTP 413 Payload Too Large errors on long files (up to 30+ minutes).
 */
export async function extractAudioChunks(
  mediaFile: File | Blob,
  onProgress?: (msg: string) => void
): Promise<AudioChunk[]> {
  const getFileMimeType = (file: File | Blob): string => {
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }
    const name = (file as File).name || '';
    if (/\.(mp3)$/i.test(name)) return 'audio/mp3';
    if (/\.(wav)$/i.test(name)) return 'audio/wav';
    if (/\.(m4a)$/i.test(name)) return 'audio/m4a';
    if (/\.(aac)$/i.test(name)) return 'audio/aac';
    if (/\.(ogg)$/i.test(name)) return 'audio/ogg';
    if (/\.(flac)$/i.test(name)) return 'audio/flac';
    if (/\.(webm)$/i.test(name)) return 'video/webm';
    return 'video/mp4';
  };

  try {
    onProgress?.('Decoding media audio track...');
    const arrayBuffer = await mediaFile.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } finally {
      await audioContext.close();
    }

    const totalDuration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    
    // Adaptive chunk duration:
    // If total duration <= 5 minutes (300s), process as 1 single chunk to preserve free tier quota.
    // For longer audio (up to 30 mins), use 4-minute (240s) segments.
    // 240s of 16kHz mono WAV is ~7.68 MB raw (~10.2 MB Base64), safe well under server and API inline limits.
    const CHUNK_DURATION_SEC = totalDuration <= 300 ? Math.max(1, Math.ceil(totalDuration)) : 240;
    const totalChunks = Math.max(1, Math.ceil(totalDuration / CHUNK_DURATION_SEC));
    const chunks: AudioChunk[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const startSec = i * CHUNK_DURATION_SEC;
      const endSec = Math.min(totalDuration, (i + 1) * CHUNK_DURATION_SEC);
      const startSample = Math.floor(startSec * sampleRate);
      const endSample = Math.min(audioBuffer.length, Math.floor(endSec * sampleRate));

      onProgress?.(`Optimizing audio segment ${i + 1} of ${totalChunks}...`);

      const resampledSlice = await resampleSliceTo16kMono(audioBuffer, startSample, endSample);
      const wavBlob = audioBufferToWavBlob(resampledSlice);
      const base64 = await fileToBase64(wavBlob);

      chunks.push({
        base64,
        mimeType: 'audio/wav',
        startOffset: startSec,
        duration: endSec - startSec,
      });
    }

    return chunks;
  } catch (err) {
    console.warn('Web Audio decoding fallback triggered:', err);
    // If decoding fails, check file size
    if (mediaFile.size < 8 * 1024 * 1024) {
      const fullBase64 = await fileToBase64(mediaFile);
      return [
        {
          base64: fullBase64,
          mimeType: getFileMimeType(mediaFile),
          startOffset: 0,
          duration: 0,
        },
      ];
    }
    throw new Error('Audio track could not be decoded. Please upload a standard MP4, WebM, MP3, WAV, or M4A file.');
  }
}

/**
 * Backward-compatible single-track extractor
 */
export async function extractAudioFromVideo(
  videoFile: File | Blob
): Promise<{ base64: string; mimeType: string }> {
  const chunks = await extractAudioChunks(videoFile);
  if (chunks.length === 0) {
    throw new Error('No audio found in file');
  }
  return { base64: chunks[0].base64, mimeType: chunks[0].mimeType };
}

/**
 * Helper to encode AudioBuffer to WAV Blob (16-bit PCM)
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1; // Resampled is strictly mono
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numSamples = buffer.length;
  const dataSize = numSamples * numChannels * (bitDepth / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  let offset = 44;
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
