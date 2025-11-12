/**
 * Audio feedback system for barcode scanning
 * Provides auditory confirmation for successful scans and duplicate rejections
 */

// In-memory audio instances (created on demand)
let successAudio: HTMLAudioElement | null = null;
let rejectAudio: HTMLAudioElement | null = null;

/**
 * Initialize audio elements
 * Uses Data URIs for simple beep sounds to avoid external file dependencies
 */
function initializeAudio() {
  if (typeof window === 'undefined') return; // SSR safety
  
  // Success sound: Higher pitch, pleasant ding (440Hz for 150ms)
  if (!successAudio) {
    successAudio = new Audio();
    // You can replace this with a real audio file path like '/sounds/success.mp3'
    // For now, using AudioContext to generate a simple beep
    createBeepSound(successAudio, 800, 0.15); // 800Hz, 150ms
  }
  
  // Reject sound: Lower pitch, warning beep (220Hz for 300ms)
  if (!rejectAudio) {
    rejectAudio = new Audio();
    createBeepSound(rejectAudio, 300, 0.3); // 300Hz, 300ms
  }
}

/**
 * Generate a simple beep sound using Web Audio API
 * @param audioElement - The HTMLAudioElement to attach the sound to
 * @param frequency - Frequency in Hz
 * @param duration - Duration in seconds
 */
function createBeepSound(audioElement: HTMLAudioElement, frequency: number, duration: number) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
    
    // Store the play function
    (audioElement as any).__playBeep = () => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = frequency;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    };
  } catch (err) {
    console.warn('Web Audio API not available:', err);
  }
}

/**
 * Play success sound (scan accepted)
 */
export function playSuccess() {
  try {
    initializeAudio();
    if (successAudio && (successAudio as any).__playBeep) {
      (successAudio as any).__playBeep();
    }
  } catch (err) {
    console.warn('Could not play success sound:', err);
  }
}

/**
 * Play reject sound (duplicate scan or error)
 */
export function playReject() {
  try {
    initializeAudio();
    if (rejectAudio && (rejectAudio as any).__playBeep) {
      (rejectAudio as any).__playBeep();
    }
  } catch (err) {
    console.warn('Could not play reject sound:', err);
  }
}

/**
 * Alternative: Use actual audio files if you add them to /public/sounds/
 * 
 * Usage:
 * 1. Add success.mp3 and reject.mp3 to /public/sounds/
 * 2. Replace the audio initialization with:
 * 
 * successAudio = new Audio('/sounds/success.mp3');
 * rejectAudio = new Audio('/sounds/reject.mp3');
 * 
 * 3. Call playSuccess() or playReject() as needed
 */
