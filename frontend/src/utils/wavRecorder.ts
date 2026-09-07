/**
 * High-performance 16-bit PCM WAV Audio Recorder (16kHz Mono)
 * Encodes microphone input directly to standard WAV format compatible with
 * Python's SpeechRecognition (sr.AudioFile) and deep-learning ASR pipelines.
 */

export interface WavRecorderSession {
  stop: () => Promise<Blob | null>;
  cancel: () => void;
}

/**
 * Resamples audio buffer from source sample rate to target sample rate (16kHz).
 */
function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, targetSampleRate = 16000): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return buffer;
  }
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Encodes 16kHz mono Float32 audio samples into a standard 16-bit PCM WAV Blob.
 */
function encodeWAV(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // 1. "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // 3. "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write the 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Starts recording from the microphone, returning controls to stop and produce a WAV Blob.
 */
export async function startWavRecording(options?: {
  onLevel?: (level: number) => void;
}): Promise<WavRecorderSession> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('AudioContext not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioCtx = new AudioCtx();
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  const audioChunks: Float32Array[] = [];
  let isStopped = false;

  processor.onaudioprocess = (e) => {
    if (isStopped) return;
    const inputData = e.inputBuffer.getChannelData(0);
    const chunk = new Float32Array(inputData.length);
    chunk.set(inputData);
    audioChunks.push(chunk);

    // Compute live audio level for VU meter
    if (options?.onLevel) {
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const level = Math.min(100, Math.round(rms * 400));
      options.onLevel(level);
    }
  };

  source.connect(processor);
  processor.connect(audioCtx.destination);

  const cleanup = () => {
    isStopped = true;
    try { processor.disconnect(); } catch {}
    try { source.disconnect(); } catch {}
    try {
      stream.getTracks().forEach((track) => track.stop());
    } catch {}
    try {
      if (audioCtx.state !== 'closed') audioCtx.close();
    } catch {}
    if (options?.onLevel) options.onLevel(0);
  };

  return {
    stop: async (): Promise<Blob | null> => {
      cleanup();

      if (audioChunks.length === 0) return null;

      // Concatenate all captured buffers
      const totalLen = audioChunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Float32Array(totalLen);
      let offset = 0;
      for (const chunk of audioChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Resample to 16,000 Hz mono
      const downsampled = downsampleBuffer(merged, audioCtx.sampleRate, 16000);

      // Check if there is actual audio content
      if (downsampled.length < 1600) {
        // Less than 0.1s of audio
        return null;
      }

      return encodeWAV(downsampled, 16000);
    },
    cancel: () => {
      cleanup();
    },
  };
}
