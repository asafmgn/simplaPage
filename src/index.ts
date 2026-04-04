const input = document.getElementById('userText') as HTMLInputElement | null;
const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement | null;
const button = document.getElementById('readButton') as HTMLButtonElement | null;
const refreshVoicesButton = document.getElementById('refreshVoicesButton') as HTMLButtonElement | null;
const initVoicesButton = document.getElementById('initVoicesButton') as HTMLButtonElement | null;
const clearVoicesButton = document.getElementById('clearVoicesButton') as HTMLButtonElement | null;
const saveBrowserVoiceButton = document.getElementById('saveBrowserVoiceButton') as HTMLButtonElement | null;
const saveFallbackVoiceButton = document.getElementById('saveFallbackVoiceButton') as HTMLButtonElement | null;
const saveManualLanguageButton = document.getElementById('saveManualLanguageButton') as HTMLButtonElement | null;
const fallbackVoiceSelect = document.getElementById('fallbackVoiceSelect') as HTMLSelectElement | null;
const fallbackLanguageInput = document.getElementById('fallbackLanguageInput') as HTMLInputElement | null;
const output = document.getElementById('outputText') as HTMLElement | null;
const playButton = document.getElementById('playButton') as HTMLButtonElement | null;
const pauseButton = document.getElementById('pauseButton') as HTMLButtonElement | null;
const stopButton = document.getElementById('stopButton') as HTMLButtonElement | null;
const fixedVoicesUrl = new URL('../src/fixedVoices.json', import.meta.url).href;
let fixedVoices: SpeechSynthesisVoice[] = [];
let voices: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;
const selectedVoiceStorageKey = 'simplaPageSelectedVoiceURI';
const selectedFallbackVoiceStorageKey = 'simplaPageSelectedFallbackVoice';
const selectedFallbackLanguageStorageKey = 'simplaPageSelectedFallbackLanguage';
const selectedVoiceModeStorageKey = 'simplaPageSelectedVoiceMode';
const selectedManualLanguageMode = 'manual';

async function loadFixedVoices(): Promise<void> {
  try {
    const response = await fetch(fixedVoicesUrl);
    if (!response.ok) {
      throw new Error(`Failed to load fixed voices: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as SpeechSynthesisVoice[];
    fixedVoices = data;
    logAction(`Loaded ${fixedVoices.length} fixed voice(s) from JSON`);
  } catch (error) {
    logError(`Error loading fixed voices: ${(error as Error).message}`);
  }
}

function getSavedVoiceURI(): string | null {
  return window.localStorage.getItem(selectedVoiceStorageKey);
}

function saveVoiceURI(voiceURI: string): void {
  window.localStorage.setItem(selectedVoiceStorageKey, voiceURI);
}

function setSelectedVoiceByURI(voiceURI: string): void {
  if (!voiceSelect) {
    return;
  }

  const index = voices.findIndex((voice) => voice.voiceURI === voiceURI);
  if (index >= 0) {
    voiceSelect.selectedIndex = index;
  }
}

function getSavedFallbackVoice(): string | null {
  return window.localStorage.getItem(selectedFallbackVoiceStorageKey);
}

function saveFallbackVoice(lang: string): void {
  window.localStorage.setItem(selectedFallbackVoiceStorageKey, lang);
}

function restoreFallbackVoice(): void {
  if (!fallbackVoiceSelect) {
    return;
  }

  const saved = getSavedFallbackVoice();
  if (saved !== null) {
    const option = Array.from(fallbackVoiceSelect.options).find((item) => item.value === saved);
    if (option) {
      fallbackVoiceSelect.value = saved;
    }
  }
}

function getSavedFallbackLanguage(): string | null {
  return window.localStorage.getItem(selectedFallbackLanguageStorageKey);
}

function saveFallbackLanguage(lang: string): void {
  window.localStorage.setItem(selectedFallbackLanguageStorageKey, lang);
}

function restoreFallbackLanguage(): void {
  if (!fallbackLanguageInput) {
    return;
  }

  const saved = getSavedFallbackLanguage();
  if (saved !== null) {
    fallbackLanguageInput.value = saved;
  }
}

function getSavedVoiceMode(): string | null {
  return window.localStorage.getItem(selectedVoiceModeStorageKey);
}

function saveVoiceMode(mode: string): void {
  window.localStorage.setItem(selectedVoiceModeStorageKey, mode);
}

function logAction(message: string): void {
  console.log(`Action: ${message}`);
  if (output) {
    output.textContent = output.textContent
      ? `${output.textContent}\nAction: ${message}`
      : `Action: ${message}`;
  }
}

function logError(message: string): void {
  console.error(`Error: ${message}`);
  if (output) {
    output.textContent = output.textContent
      ? `${output.textContent}\nError: ${message}`
      : `Error: ${message}`;
  }
}

function setOutput(text: string): void {
  if (output) {
    output.textContent = text;
  }
}

function updateOutput(text: string, status: string): void {
  if (output) {
    output.textContent = `${text}\n\nStatus: ${status}`;
  }
}

function initializeVoices(): void {
  if (!window.speechSynthesis) {
    logError('Speech synthesis is not supported in this browser.');
    return;
  }

  populateVoices();

  if (!voices.length) {
    const testUtterance = new SpeechSynthesisUtterance('Loading voices');
    testUtterance.volume = 0;
    testUtterance.rate = 1;
    testUtterance.pitch = 1;
    testUtterance.onend = () => {
      setTimeout(populateVoices, 300);
    };

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(testUtterance);
      logAction('Sent a silent initialization utterance to try and unlock voices');
    } catch (error) {
      logError(`Voice initialization failed: ${(error as Error).message}`);
    }
  }
}

function populateVoices(): void {
  logAction('Populating available voices');

  if (!window.speechSynthesis || !voiceSelect) {
    logError('Speech synthesis not supported or voice select missing');
    return;
  }

  voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';

  if (!voices.length) {
    const option = document.createElement('option');
    option.textContent = 'No voices available';
    voiceSelect.appendChild(option);
    voiceSelect.disabled = true;
    logAction('No voices available after population');
    return;
  }

  voices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — default' : ''}`;
    voiceSelect.appendChild(option);
  });

  const savedVoiceURI = getSavedVoiceURI();
  if (savedVoiceURI) {
    setSelectedVoiceByURI(savedVoiceURI);
  }

  if (voiceSelect.selectedIndex < 0) {
    voiceSelect.selectedIndex = 0;
  }

  voiceSelect.disabled = false;
  logAction(`Loaded ${voices.length} voice(s)`);
}

function speakText(text: string): void {
  if (!window.speechSynthesis) {
    logError('Speech synthesis is not supported in this browser.');
    window.alert('Speech synthesis is not supported in this browser.');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const manualLang = fallbackLanguageInput?.value.trim();

  const savedMode = getSavedVoiceMode();

  if (savedMode === 'browser') {
    const savedVoiceURI = getSavedVoiceURI();
    if (savedVoiceURI && voices.length) {
      const savedIndex = voices.findIndex((voice) => voice.voiceURI === savedVoiceURI);
      const savedVoice = voices[savedIndex];
      if (savedVoice) {
        utterance.voice = savedVoice;
        logAction(`Speaking with saved browser voice: ${savedVoice.name} (${savedVoice.lang})`);
      } else {
        logError('Saved browser voice was not found in the current voice list');
      }
    } else {
      logError('No saved browser voice URI or voices available');
    }
  } else if (savedMode === 'fallback') {
    if (fallbackVoiceSelect?.value) {
      utterance.lang = fallbackVoiceSelect.value;
      logAction(`Speaking with saved fallback language: ${fallbackVoiceSelect.value}`);
    } else {
      logError('Saved fallback mode selected but no fallback language value exists');
    }
  } else {
    if (manualLang) {
      utterance.lang = manualLang;
      logAction(`Speaking with manual language code: ${manualLang}`);
    } else {
      logAction('Speaking with default voice because no saved voice mode is active');
    }
  }

  try {
    window.speechSynthesis.cancel();
    currentUtterance = utterance;
    utterance.onend = () => {
      currentUtterance = null;
    };
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    logError(`Failed to speak text: ${(error as Error).message}`);
  }
}

function init(): void {
  if (!input || !voiceSelect || !button || !refreshVoicesButton || !clearVoicesButton || !output || !fallbackVoiceSelect || !fallbackLanguageInput || !saveManualLanguageButton || !playButton || !pauseButton || !stopButton) {
    return;
  }

  populateVoices();
  restoreFallbackVoice();
  restoreFallbackLanguage();
  loadFixedVoices();

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  saveBrowserVoiceButton?.addEventListener('click', () => {
    if (!voiceSelect) {
      return;
    }

    const selectedIndex = Number(voiceSelect.value);
    const selectedVoice = voices[selectedIndex];
    if (!selectedVoice) {
      logError('No browser voice selected to save');
      return;
    }

    saveVoiceURI(selectedVoice.voiceURI);
    saveVoiceMode('browser');
    logAction(`Saved browser voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    updateOutput(`Saved browser voice: ${selectedVoice.name}`, 'Browser voice will be used when speaking.');
  });

  saveFallbackVoiceButton?.addEventListener('click', () => {
    if (!fallbackVoiceSelect) {
      return;
    }

    saveFallbackVoice(fallbackVoiceSelect.value);
    saveVoiceMode('fallback');
    logAction(`Saved fallback voice language: ${fallbackVoiceSelect.value}`);
    updateOutput(`Saved fallback voice language: ${fallbackVoiceSelect.value}`, 'Fallback voice will be used when speaking if browser voice is not selected.');
  });

  saveManualLanguageButton?.addEventListener('click', () => {
    if (!fallbackLanguageInput) {
      return;
    }

    const manualLang = fallbackLanguageInput.value.trim();
    if (!manualLang) {
      logError('Manual language code is empty, please enter a language code before saving.');
      return;
    }

    saveFallbackLanguage(manualLang);
    saveVoiceMode(selectedManualLanguageMode);
    logAction(`Saved manual language code: ${manualLang}`);
    updateOutput(`Saved manual language code: ${manualLang}`, 'Manual language will be used when speaking.');
  });

  fallbackLanguageInput.addEventListener('change', () => {
    if (!fallbackLanguageInput) {
      return;
    }
    saveFallbackLanguage(fallbackLanguageInput.value.trim());
    logAction(`Saved manual fallback language: ${fallbackLanguageInput.value.trim()}`);
  });

  button.addEventListener('click', () => {
    const text = input.value.trim();
    const displayed = text || 'No text entered yet. Please type something above.';
    const status = text ? 'Reading entered text aloud.' : 'No text entered to read.';
    updateOutput(displayed, status);

    if (text) {
      if (!voices.length) {
        logAction('No voices loaded yet; trying to initialize voices on click');
        initializeVoices();
      }
      speakText(text);
    }
  });

  refreshVoicesButton.addEventListener('click', () => {
    populateVoices();
    logAction('Voice list refreshed manually');
  });

  initVoicesButton?.addEventListener('click', () => {
    initializeVoices();
    logAction('Voice initialization requested manually');
  });

  clearVoicesButton.addEventListener('click', () => {
    voices = [];

    voiceSelect.innerHTML = '';
    const option = document.createElement('option');
    option.textContent = 'No voices available';
    voiceSelect.appendChild(option);
    voiceSelect.selectedIndex = 0;
    voiceSelect.disabled = true;

    updateOutput('No voices available', 'All voices cleared. Repopulate to reload available voices.');
    logAction('Voice list cleared manually');
  });

  playButton.addEventListener('click', () => {
    if (currentUtterance) {
      window.speechSynthesis.resume();
      logAction('Resumed speaking');
    } else {
      const text = input?.value.trim();
      if (text) {
        if (!voices.length) {
          logAction('No voices loaded yet; trying to initialize voices on click');
          initializeVoices();
        }
        speakText(text);
        logAction('Started speaking');
      } else {
        logError('No text to speak');
      }
    }
  });

  pauseButton.addEventListener('click', () => {
    if (currentUtterance) {
      window.speechSynthesis.pause();
      logAction('Paused speaking');
    }
  });

  stopButton.addEventListener('click', () => {
    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
      logAction('Stopped speaking');
    }
  });
}

init();
