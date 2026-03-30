const input = document.getElementById('userText') as HTMLInputElement | null;
const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement | null;
const button = document.getElementById('readButton') as HTMLButtonElement | null;
const refreshVoicesButton = document.getElementById('refreshVoicesButton') as HTMLButtonElement | null;
const initVoicesButton = document.getElementById('initVoicesButton') as HTMLButtonElement | null;
const clearVoicesButton = document.getElementById('clearVoicesButton') as HTMLButtonElement | null;
const output = document.getElementById('outputText') as HTMLElement | null;
let voices: SpeechSynthesisVoice[] = [];
const selectedVoiceStorageKey = 'simplaPageSelectedVoiceURI';

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
  if (voiceSelect && voices.length) {
    const selectedIndex = Number(voiceSelect.value);
    const selectedVoice = voices[selectedIndex];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      logAction(`Speaking with voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      logAction('Speaking with default voice because selected voice was unavailable');
    }
  } else {
    logAction('Speaking with default voice because no voice is selected');
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    logError(`Failed to speak text: ${(error as Error).message}`);
  }
}

function init(): void {
  if (!input || !voiceSelect || !button || !refreshVoicesButton || !clearVoicesButton || !output) {
    return;
  }

  populateVoices();

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  voiceSelect?.addEventListener('change', () => {
    if (!voiceSelect) {
      return;
    }

    const selectedIndex = Number(voiceSelect.value);
    const selectedVoice = voices[selectedIndex];
    if (selectedVoice) {
      saveVoiceURI(selectedVoice.voiceURI);
      logAction(`Saved selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    }
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
}

init();
