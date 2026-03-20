/**
 * Audio feedback system for barcode scanning
 * Provides auditory confirmation for successful scans and duplicate rejections
 */

// In-memory audio instances (created on demand)
let successAudio: HTMLAudioElement | null = null;
let rejectAudio: HTMLAudioElement | null = null;

type ScanPromptSettings = {
  successMessage: string;
  errorMessage: string;
  volume: number;
  rate: number;
  pitch: number;
  enableSuccess: boolean;
  enableError: boolean;
};

const defaultPrompts: ScanPromptSettings = {
  successMessage: 'Scan successful',
  errorMessage: 'Nope, try again',
  volume: 0.8,
  rate: 1.1,
  pitch: 1.2,
  enableSuccess: true,
  enableError: true,
};

function getScanPrompts(): ScanPromptSettings {
  if (typeof window === 'undefined') return defaultPrompts;
  try {
    const saved = localStorage.getItem('scanPromptSettings');
    if (saved) return { ...defaultPrompts, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultPrompts;
}

/**
 * Pick a natural-sounding voice for speech synthesis
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v =>
    v.name.toLowerCase().includes('zira') ||
    v.name.toLowerCase().includes('samantha') ||
    v.name.toLowerCase().includes('victoria') ||
    v.name.toLowerCase().includes('female')
  ) || null;
}

/**
 * Initialize audio elements with actual sound files
 */
function initializeAudio() {
  if (typeof window === 'undefined') return; // SSR safety
  const prompts = getScanPrompts();
  
  // Success sound: Use success.mp3
  if (!successAudio) {
    successAudio = new Audio('/success.mp3');
  }
  successAudio.volume = prompts.volume;
  
  // Reject sound: Use fail.mp3
  if (!rejectAudio) {
    rejectAudio = new Audio('/fail.mp3');
  }
  rejectAudio.volume = prompts.volume;
}

/**
 * Play success sound (scan accepted)
 */
export function playSuccess(theme: 'ding' | 'voice' = 'ding') {
  const prompts = getScanPrompts();
  if (!prompts.enableSuccess) return;

  try {
    if (theme === 'voice') {
      const msg = new SpeechSynthesisUtterance(prompts.successMessage);
      const voice = pickVoice();
      if (voice) msg.voice = voice;
      msg.rate = prompts.rate;
      msg.pitch = prompts.pitch;
      msg.volume = prompts.volume;
      window.speechSynthesis.speak(msg);
    } else {
      initializeAudio();
      if (successAudio) {
        successAudio.currentTime = 0;
        successAudio.play().catch(err => console.warn('Could not play success sound:', err));
      }
    }
  } catch (err) {
    console.warn('Could not play success sound:', err);
  }
}

/**
 * Play reject sound (duplicate scan or error)
 */
export function playReject(theme: 'ding' | 'voice' = 'ding') {
  const prompts = getScanPrompts();
  if (!prompts.enableError) return;

  try {
    if (theme === 'voice') {
      const msg = new SpeechSynthesisUtterance(prompts.errorMessage);
      const voice = pickVoice();
      if (voice) msg.voice = voice;
      msg.rate = prompts.rate;
      msg.pitch = prompts.pitch * 0.8; // slightly lower pitch for errors
      msg.volume = prompts.volume;
      window.speechSynthesis.speak(msg);
    } else {
      initializeAudio();
      if (rejectAudio) {
        rejectAudio.currentTime = 0;
        rejectAudio.play().catch(err => console.warn('Could not play reject sound:', err));
      }
    }
  } catch (err) {
    console.warn('Could not play reject sound:', err);
  }
}
