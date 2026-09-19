import { apiPost } from "@/services/api";

const TARGET_SAMPLE_RATE = 16000;
const SPEECH_LEVEL = 0.02;
const END_SILENCE_MS = 1400;
const NO_SPEECH_TIMEOUT_MS = 7000;
const MAX_RECORDING_MS = 15000;

export type Recorder = {
  stop: () => void;
  // Ghi âm WAV (base64), hoặc null nếu không nghe thấy tiếng nói.
  result: Promise<string | null>;
};

function downsample(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate <= TARGET_SAMPLE_RATE) return input;
  const ratio = fromRate / TARGET_SAMPLE_RATE;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    output[i] = sum / Math.max(1, end - start);
  }
  return output;
}

function encodeWavBase64(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(binary);
}

// Thu âm tới khi người dùng im lặng (hoặc bấm dừng). Ghi thẳng PCM rồi tự
// đóng gói WAV vì MediaRecorder trên iOS trả mp4/aac, Gemini không đọc chắc.
// Phải gọi trong lúc xử lý cú chạm của người dùng (iOS chặn AudioContext).
export async function startRecording(): Promise<Recorder> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("unsupported");
  }
  const AudioContextClass: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) throw new Error("unsupported");

  const ctx = new AudioContextClass();
  // Kích hoạt ngay trong cú chạm, trước khi chờ người dùng cấp quyền micro.
  void ctx.resume();

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (err) {
    void ctx.close();
    throw err;
  }
  await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const startedAt = Date.now();
  let heardSpeech = false;
  let silentSince = 0;
  let finished = false;
  let resolveResult: (value: string | null) => void = () => {};
  const result = new Promise<string | null>((resolve) => {
    resolveResult = resolve;
  });

  const finish = () => {
    if (finished) return;
    finished = true;
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void ctx.close();

    if (!heardSpeech) return resolveResult(null);

    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const samples = downsample(merged, ctx.sampleRate);
    const rate = Math.min(ctx.sampleRate, TARGET_SAMPLE_RATE);
    resolveResult(encodeWavBase64(samples, rate));
  };

  processor.onaudioprocess = (event) => {
    if (finished) return;
    const data = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const level = Math.sqrt(sum / data.length);
    const now = Date.now();

    if (level > SPEECH_LEVEL) {
      heardSpeech = true;
      silentSince = 0;
    } else if (heardSpeech) {
      if (!silentSince) silentSince = now;
      else if (now - silentSince > END_SILENCE_MS) finish();
    }

    if (!heardSpeech && now - startedAt > NO_SPEECH_TIMEOUT_MS) finish();
    if (now - startedAt > MAX_RECORDING_MS) finish();
  };

  source.connect(processor);
  // Cần nối vào đích để iOS chạy onaudioprocess (đầu ra là im lặng).
  processor.connect(ctx.destination);

  return { stop: finish, result };
}

export async function transcribeAudio(audio: string): Promise<string> {
  const { text } = await apiPost<{ text: string }>("/assistant/transcribe", {
    audio,
  });
  return text.trim();
}

const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

// iOS chỉ cho phát tiếng sau khi có cú chạm của người dùng: gọi hàm này trong
// cú chạm đầu tiên (vd. bấm mic) để các lần nói sau được phép.
export function unlockSpeech() {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  } catch {
    // bỏ qua
  }
}

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const clean = text.replace(EMOJI_PATTERN, "").trim();
  if (!clean) return;

  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "vi-VN";
    const voice = synth.getVoices().find((v) => v.lang.startsWith("vi"));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  } catch {
    // bỏ qua
  }
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
