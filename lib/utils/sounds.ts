/**
 * Audio feedback system for barcode scanning
 * Provides auditory confirmation for successful scans and duplicate rejections
 */

// In-memory audio instances (created on demand)
let successAudio: HTMLAudioElement | null = null;
let rejectAudio: HTMLAudioElement | null = null;

/**
 * Initialize audio elements with actual sound files
 */
function initializeAudio() {
  if (typeof window === 'undefined') return; // SSR safety
  
  // Success sound: Use success.mp3
  if (!successAudio) {
    successAudio = new Audio('/success.mp3');
    successAudio.volume = 0.6;
  }
  
  // Reject sound: Use fail.mp3
  if (!rejectAudio) {
    rejectAudio = new Audio('/fail.mp3');
    rejectAudio.volume = 0.6;
  }
}

/**
 * Play success sound (scan accepted)
 */
export function playSuccess(theme: 'ding' | 'voice' = 'ding') {
  try {
    if (theme === 'voice') {
      const msg = new SpeechSynthesisUtterance('Scanned');
      msg.rate = 1.2;
      msg.pitch = 1.1;
      msg.volume = 0.8;
      window.speechSynthesis.speak(msg);
    } else {
      initializeAudio();
      if (successAudio) {
        successAudio.currentTime = 0; // Reset to start
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
  try {
    if (theme === 'voice') {
      const msg = new SpeechSynthesisUtterance('Duplicate');
      msg.rate = 1.2;
      msg.pitch = 0.9;
      msg.volume = 0.8;
      window.speechSynthesis.speak(msg);
    } else {
      initializeAudio();
      if (rejectAudio) {
        rejectAudio.currentTime = 0; // Reset to start
        rejectAudio.play().catch(err => console.warn('Could not play reject sound:', err));
      }
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
