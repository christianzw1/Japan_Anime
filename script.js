const video = document.getElementById('video');
const subtitleList = document.getElementById('subtitle-list');
const subtitlePlaceholder = document.getElementById('subtitle-placeholder');
const videoUpload = document.getElementById('video-upload');
const subtitleUpload = document.getElementById('subtitle-upload');
const toggleRetimeButtons = document.getElementById('toggle-retime-buttons');
const centralizeButton = document.querySelector('.centralize-button');
const copiedMessage = document.getElementById('copied-message');
const videoUploadLabel = document.querySelector('label[for="video-upload"]');
const unknownWordsOverlay = document.getElementById('unknown-words-overlay');
const editWordsModal = document.getElementById('edit-words-modal');
const unknownWordsInput = document.getElementById('unknown-words-input');
const saveUnknownWordsModal = document.getElementById('save-unknown-words-modal');
const closeModal = document.getElementById('close-modal');
const saveUnknownWordsButton = document.getElementById('save-unknown-words');
const loadUnknownWordsButton = document.getElementById('load-unknown-words');
const menuButton = document.getElementById('menu-button');
const menuOptions = document.getElementById('menu-options');
const viewFullSubtitlesButton = document.getElementById('view-full-subtitles');
const fullSubtitlesModal = document.getElementById('full-subtitles-modal');
const fullSubtitlesText = document.getElementById('full-subtitles-text');
const closeFullSubtitlesButton = document.getElementById('close-full-subtitles');
const exportSubtitlesButton = document.getElementById('export-subtitles');
const toggleSubtitlePanelButton = document.getElementById('toggle-subtitle-panel');
const showSubtitlePanelButton = document.getElementById('show-subtitle-panel');
const subtitlePanel = document.getElementById('subtitle-panel');
const videoContainer = document.querySelector('.video-container');
const enablePauseButton = document.getElementById('enable-pause');
const disablePauseButton = document.getElementById('disable-pause');
const condenseAudioButton = document.getElementById("condense-audio");

// === DICIONÁRIO ===
const DICT_BASE  = window.DICT_BASE || './dict/';
const TAGS_DIR   = DICT_BASE + 'tags/';
const TERMS_DIR  = DICT_BASE + 'terms/';
const yomiPopup  = document.getElementById('yomi-popup');

let yomiPinned = false;
let hoveringPopup = false;
let TAGS = new Map();
let TERMS = [];
let BY_SURFACE = new Map();
let BY_READING = new Map();
let BY_TERMID  = new Map();
let dictReady = false;
let isFullScreen = false;
let subtitles = [];
let unknownWords = {};
let retimeButtonsVisible = false;
let currentSubtitleIndex = 0;
let isPauseEnabled = false;      // função antiga de pausa por unknown words
let lastPausedSubtitleIndex = -1;
let subtitleFormat = 'srt';
let uploadedFile = null;

// NOVO: controle de pausa automática pelo popup/hover
let autoPausedByPopup = false;

// ===== Helpers =====
const jpBlock = /[\u3000-\u303F\u3040-\u30FF\u31F0-\u31FF\u4E00-\u9FFF\uFF66-\uFF9D]+/g;
const kanjiCount = s => (s.match(/[\u4E00-\u9FFF]/g)||[]).length;
const hasKanji  = s => kanjiCount(s) > 0;
const isKanaOnly = s => /^[\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC\u30FD-\u30FF]+$/.test(s);

const isOverSubtitleWord = (el) => !!(el && (el.closest?.('.subtitle-word') || el.classList?.contains('subtitle-word')));
const hidePopupAndResume = () => {
  yomiPopup.style.display = 'none';
  if (autoPausedByPopup){
    // pequeno atraso pra garantir que não é um "salto" pra outra palavra
    setTimeout(()=>{ 
      if (yomiPopup.style.display==='none') { 
        video.play(); 
        autoPausedByPopup = false; 
      } 
    }, 120);
  }
};

// NFKC + Katakana→Hiragana + ー→vogal anterior (aprox.)
function toHiragana(str){
  if (!str) return '';
  let s = str.normalize('NFKC');
  let out = '';
  const HIRA_A = 0x3041, KATA_A = 0x30A1, OFFSET = HIRA_A - KATA_A;
  const vowelOf = ch => {
    if (/[あかがさざただなはばぱまやらわぁ]/.test(ch)) return 'あ';
    if (/[いきぎしじちぢにひびぴみりぃ]/.test(ch)) return 'い';
    if (/[うくぐすずつづぬふぶぷむゆるぅヴ]/.test(ch)) return 'う';
    if (/[えけげせぜてでねへべぺめれぇヶ]/.test(ch)) return 'え';
    if (/[おこごそぞとどのほぼぽもよろをぉ]/.test(ch)) return 'お';
    return '';
  };
  for (let i=0;i<s.length;i++){
    const cp = s.codePointAt(i);
    if (cp >= 0x30A1 && cp <= 0x30F6) out += String.fromCodePoint(cp + OFFSET);
    else if (cp === 0x30FC) out += vowelOf(out.slice(-1)) || 'ー';
    else out += s[i];
  }
  return out;
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    if (videoContainer.requestFullscreen) videoContainer.requestFullscreen();
    else if (videoContainer.mozRequestFullScreen) videoContainer.mozRequestFullScreen();
    else if (videoContainer.webkitRequestFullscreen) videoContainer.webkitRequestFullscreen();
    else if (videoContainer.msRequestFullscreen) videoContainer.msRequestFullscreen();
    isFullScreen = true;
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
    isFullScreen = false;
  }
}

// ===== UI =====
toggleSubtitlePanelButton.addEventListener('click', () => {
  subtitlePanel.classList.toggle('hidden');
  showSubtitlePanelButton.classList.toggle('hidden');
  const videoPlayer = document.querySelector('.video-player');
  const videoContainer = document.querySelector('.video-container');

  if (subtitlePanel.classList.contains('hidden')) {
    videoPlayer.classList.add('cinema-mode');
    videoContainer.classList.add('cinema-mode');
    toggleSubtitlePanelButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
    toggleSubtitlePanelButton.style.display = 'none';
    showSubtitlePanelButton.style.display = 'block';
  } else {
    videoPlayer.classList.remove('cinema-mode');
    videoContainer.classList.remove('cinema-mode');
    toggleSubtitlePanelButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
    toggleSubtitlePanelButton.style.display = 'block';
    showSubtitlePanelButton.style.display = 'none';
  }
});

showSubtitlePanelButton.addEventListener('click', () => {
  subtitlePanel.classList.remove('hidden');
  showSubtitlePanelButton.classList.add('hidden');
  const videoPlayer = document.querySelector('.video-player');
  const videoContainer = document.querySelector('.video-container');

  videoPlayer.classList.remove('cinema-mode');
  videoContainer.classList.remove('cinema-mode');
  toggleSubtitlePanelButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
  toggleSubtitlePanelButton.style.display = 'block';
  showSubtitlePanelButton.style.display = 'none';
});

videoUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const videoURL = URL.createObjectURL(file);
  uploadedFile = file;
  video.src = videoURL;
  videoUpload.classList.add('hidden');
  videoUploadLabel.classList.add('hidden');
  video.volume = 1.0;
});

subtitleUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    if (file.name.endsWith('.srt')) {
      subtitles = parseSRTSubtitles(content);
      subtitleFormat = 'srt';
    } else if (file.name.endsWith('.ass')) {
      subtitles = parseASSSubtitles(content);
      subtitleFormat = 'ass';
    }
    if (subtitles.length > 0) {
      displaySubtitles(subtitles);
      subtitlePlaceholder.style.display = 'none';
      alert(`Successfully loaded ${subtitles.length} subtitles!`);
    } else {
      subtitlePlaceholder.textContent = "No valid subtitles found in the file. Please try another file.";
      subtitlePlaceholder.style.display = 'block';
    }
  };
  reader.readAsText(file);
});

toggleRetimeButtons.addEventListener('click', () => {
  retimeButtonsVisible = !retimeButtonsVisible;
  document.querySelectorAll('.retime-button').forEach(button => {
    button.style.display = retimeButtonsVisible ? 'inline-block' : 'none';
  });
  toggleRetimeButtons.textContent = retimeButtonsVisible ? 'Hide Retiming Buttons' : 'Show Retiming Buttons';
});

document.addEventListener('keydown', (event) => {
  if (event.key === 's' || event.key === 'S') captureFrame();
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') navigateSubtitle(-1);
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') navigateSubtitle(1);
});

function navigateSubtitle(direction) {
  currentSubtitleIndex = Math.max(0, Math.min(subtitles.length - 1, currentSubtitleIndex + direction));
  const sub = subtitles[currentSubtitleIndex];
  if (sub) {
    video.currentTime = sub.start;
    updateActiveSubtitle();
  }
}

function updateActiveSubtitle() {
  document.querySelectorAll('.subtitle-item').forEach(item => item.classList.remove('active'));
  const currentSubtitleElement = subtitleList.children[currentSubtitleIndex];
  if (currentSubtitleElement) {
    currentSubtitleElement.classList.add('active');
    currentSubtitleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function parseSRTSubtitles(content) {
  const lines = content.split('\n');
  const subtitles = [];
  let currentSubtitle = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^\d+$/.test(line)) {
      if (currentSubtitle) {
        subtitles.push(currentSubtitle);
        currentSubtitle = null;
      }
      continue;
    }

    const timeMatch = line.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (timeMatch) {
      if (currentSubtitle) subtitles.push(currentSubtitle);
      currentSubtitle = {
        start: timeToSeconds(timeMatch[1]),
        end: timeToSeconds(timeMatch[2]),
        text: ''
      };
    } else if (line === '') {
      if (currentSubtitle) {
        subtitles.push(currentSubtitle);
        currentSubtitle = null;
      }
    } else if (currentSubtitle) {
      currentSubtitle.text += (currentSubtitle.text ? '\n' : '') + line;
    }
  }

  if (currentSubtitle) subtitles.push(currentSubtitle);
  return subtitles;
}

document.getElementById('fullscreen-button').addEventListener('click', toggleFullScreen);

function parseASSSubtitles(content) {
  const lines = content.split('\n');
  const subtitles = [];
  let inEventsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('[Events]')) { inEventsSection = true; continue; }
    if (inEventsSection && line.startsWith('Dialogue:')) {
      const parts = line.split(',');
      const start = parts[1].trim();
      const end = parts[2].trim();
      const text = parts.slice(9).join(',').trim();
      subtitles.push({
        start: timeToSeconds(start),
        end: timeToSeconds(end),
        text: text.replace(/\\N/g, '\n')
      });
    }
  }
  return subtitles;
}

function timeToSeconds(timeString) {
  const [hours, minutes, seconds] = timeString.split(':');
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds.replace(',', '.'));
}

menuButton.addEventListener('click', () => {
  menuOptions.style.display = menuOptions.style.display === 'none' ? 'block' : 'none';
});

viewFullSubtitlesButton.addEventListener('click', showFullSubtitles);

function showFullSubtitles() {
  const fullSubtitlesDiv = document.getElementById('full-subtitles-text');
  fullSubtitlesDiv.innerHTML = '';
  subtitles.forEach(sub => {
    const subDiv = document.createElement('div');
    subDiv.className = 'full-subtitle-item';
    subDiv.innerHTML = `
      <span class="subtitle-time">${formatTime(sub.start)} - ${formatTime(sub.end)}</span>
      <span class="subtitle-text">${renderInteractiveSubtitle(sub.text)}</span>
    `;
    fullSubtitlesDiv.appendChild(subDiv);
  });
  fullSubtitlesModal.style.display = 'block';
}

closeFullSubtitlesButton.addEventListener('click', () => { fullSubtitlesModal.style.display = 'none'; });

document.addEventListener('click', (event) => {
  if (!menuButton.contains(event.target) && !menuOptions.contains(event.target)) {
    menuOptions.style.display = 'none';
  }
});

// === SUBTITLE LIST RENDER ===
function displaySubtitles(subtitlesArr) {
  subtitleList.innerHTML = '';
  subtitlesArr.forEach((sub, index) => {
    const subItem = document.createElement('div');
    subItem.className = 'subtitle-item';
    let cleanedText = sub.text.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '');
    subItem.innerHTML = `
      <span class="subtitle-time">${formatTime(sub.start)} - ${formatTime(sub.end)}</span>
      <span class="subtitle-text">${renderInteractiveSubtitle(cleanedText)}</span>
      <button class="small-button" onclick="repeatSubtitle(${index})">Repeat</button>
      <button class="retime-button" onclick="retimeSubtitles(${index})" style="display: none;">Retime to current</button>
      <button class="edit-unknown-words" onclick="editUnknownWords(${index})">Edit Unknown Words</button>
    `;
    subItem.addEventListener('click', (e) => {
      const onWord = e.target.closest('.subtitle-word');
      if (onWord) return;
      video.currentTime = sub.start;
      currentSubtitleIndex = index;
      updateActiveSubtitle();
    });
    subtitleList.appendChild(subItem);
  });

  // HOVER no painel lateral
  if (!subtitleList.dataset.listeners) {
    subtitleList.addEventListener('mouseover', (e) => {
      const el = e.target.closest('.subtitle-word');
      if (!el || !dictReady) return;
      openPopupForSpan(el);
    }, { passive: true });

    // mouseleave é mais confiável pra saber que o cursor saiu do painel
    subtitleList.addEventListener('mouseleave', () => {
      if (!yomiPinned) hidePopupAndResume();
    }, { passive: true });

    // fallback pra casos em que o mouse sai e entra muito rápido
    subtitleList.addEventListener('mouseout', (e) => {
      const toEl = e.relatedTarget;
      const goingToPopup = yomiPopup && toEl && yomiPopup.contains(toEl);
      const goingToAnotherWord = isOverSubtitleWord(toEl);
      if (!goingToPopup && !goingToAnotherWord && !yomiPinned) {
        hidePopupAndResume();
      }
    }, { passive: true });

    subtitleList.addEventListener('click', (e) => {
      const el = e.target.closest('.subtitle-word');
      if (!el || !dictReady) return;
      yomiPinned = true;
      openPopupForSpan(el);
      e.stopPropagation();
    });

    subtitleList.dataset.listeners = '1';
  }
}

function editUnknownWords(index) {
  const sub = subtitles[index];
  const wordsText = unknownWords[index] ? unknownWords[index].map(word => `${word.japanese} (${word.reading}) = ${word.translation}`).join('\n') : '';
  unknownWordsInput.value = wordsText;
  editWordsModal.style.display = 'block';
  
  saveUnknownWordsModal.onclick = () => {
    const lines = unknownWordsInput.value.split('\n');
    unknownWords[index] = lines.map(line => {
      const [wordPart, translation] = line.split('=').map(part => part.trim());
      const [japanese, reading] = wordPart.split('(').map(part => part.trim().replace(')', ''));
      return { japanese, reading, translation };
    }).filter(word => word.japanese && word.translation);
    editWordsModal.style.display = 'none';
  };
}

saveUnknownWordsButton.addEventListener('click', () => {
  const data = Object.entries(unknownWords).map(([index, words]) => {
    return words.map(word => `${word.japanese} (${word.reading}) = ${word.translation}`).join('\n');
  }).join('\n\n');
  const blob = new Blob([data], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unknown_words.txt';
  a.click();
});

loadUnknownWordsButton.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (file.name.endsWith('.json')) {
          unknownWords = JSON.parse(e.target.result);
        } else if (file.name.endsWith('.txt')) {
          const content = e.target.result;
          const wordList = content.split('\n').filter(line => line.trim() !== '');
          unknownWords = {};
          wordList.forEach(line => {
            const [wordPart, translation] = line.split('=').map(part => part.trim());
            const [japanese, reading] = wordPart.split('(').map(part => part.trim().replace(')', ''));
            if (japanese && translation) {
              subtitles.forEach((sub, index) => {
                if (sub.text.includes(japanese)) {
                  if (!unknownWords[index]) unknownWords[index] = [];
                  unknownWords[index].push({ japanese, reading, translation });
                }
              });
            }
          });
        }
        alert('Unknown words loaded successfully!');
      } catch (error) {
        alert('Error loading unknown words: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

video.addEventListener('timeupdate', () => {
  const currentTime = video.currentTime;
  const currentSubtitle = subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
  
  document.querySelectorAll('.subtitle-item').forEach(item => item.classList.remove('active'));
  
  if (currentSubtitle) {
    const index = subtitles.indexOf(currentSubtitle);
    const currentSubtitleElement = subtitleList.children[index];
    if (currentSubtitleElement) {
      currentSubtitleElement.classList.add('active');
      currentSubtitleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showSubtitleOnVideo(currentSubtitle.text);
    showUnknownWords(index);
    currentSubtitleIndex = index;

    if (isPauseEnabled && unknownWords[index] && unknownWords[index].length > 0 && lastPausedSubtitleIndex !== index) {
      lastPausedSubtitleIndex = index;
      video.pause();
      setTimeout(() => { video.play(); }, 3000);
    }
  } else {
    showSubtitleOnVideo('');
    unknownWordsOverlay.style.display = 'none';
  }
});

enablePauseButton.addEventListener('click', () => { isPauseEnabled = true; alert('Pause enabled'); });
disablePauseButton.addEventListener('click', () => { isPauseEnabled = false; alert('Pause disabled'); });

saveUnknownWordsButton.addEventListener('click', () => {
  const data = JSON.stringify(unknownWords);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'unknown_words.json';
  a.click();
});

loadUnknownWordsButton.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        unknownWords = JSON.parse(e.target.result);
        alert('Unknown words loaded successfully!');
      } catch (error) {
        alert('Error loading unknown words: ' + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

function formatTime(seconds) {
  const date = new Date(seconds * 1000);
  return date.toISOString().substr(11, 8);
}

function secondsToSRTTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
  const millis = String(Math.floor((seconds - Math.floor(seconds)) * 1000)).padStart(3, '0');
  return `${hrs}:${mins}:${secs},${millis}`;
}

function generateSRT(subs) {
  return subs.map((sub, idx) => {
    const cleanedText = sub.text.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '');
    return `${idx + 1}\n${secondsToSRTTime(sub.start)} --> ${secondsToSRTTime(sub.end)}\n${cleanedText}\n`;
  }).join('\n');
}

// ===== DICIONÁRIO =====
async function loadDict() {
  try {
    await fetch(DICT_BASE + 'index.json').then(r => r.json());
    const manifest = await fetch(DICT_BASE + 'manifest.json').then(r => r.json());

    for (const f of (manifest.tags || [])) {
      const rows = await fetch(TAGS_DIR + f).then(r => r.json());
      for (const [code, category, order, desc, strength] of rows) {
        TAGS.set(code, { category, order, desc, strength });
      }
    }

    for (const f of (manifest.terms || [])) {
      const rows = await fetch(TERMS_DIR + f).then(r => r.json());
      for (const [surface, reading, tagsStr, posGroup, score, senses, termId, extraTagsStr] of rows) {
        const entry = {
          surface,
          reading,
          tags: (tagsStr || '').split(' ').filter(Boolean),
          posGroup,
          score: Number(score) || 0,
          senses,
          termId,
          extra: (extraTagsStr || '').split(' ').filter(Boolean)
        };

        TERMS.push(entry);

        if (surface) {
          const a = BY_SURFACE.get(surface) || [];
          a.push(entry);
          BY_SURFACE.set(surface, a);
        }
        if (reading) {
          const a = BY_READING.get(reading) || [];
          a.push(entry);
          BY_READING.set(reading, a);
        }

        const byId = BY_TERMID.get(termId) || [];
        byId.push(entry);
        BY_TERMID.set(termId, byId);
      }
    }

    dictReady = true;
    console.log('[dict] pronto:', TERMS.length, 'entradas');
  } catch (e) {
    console.error('Falha ao carregar dicionário:', e);
  }
}
loadDict();

function showSubtitleOnVideo(text) {
  let subtitleOverlay = document.getElementById('subtitle-overlay');
  if (!subtitleOverlay) {
    subtitleOverlay = document.createElement('div');
    subtitleOverlay.id = 'subtitle-overlay';
    subtitleOverlay.style.position = 'absolute';
    subtitleOverlay.style.bottom = '10%';
    subtitleOverlay.style.left = '50%';
    subtitleOverlay.style.transform = 'translateX(-50%)';
    subtitleOverlay.style.color = 'yellow';
    subtitleOverlay.style.textShadow = '2px 2px 2px black';
    subtitleOverlay.style.fontSize = '35px';
    subtitleOverlay.style.textAlign = 'center';
    subtitleOverlay.style.width = '80%';
    subtitleOverlay.style.zIndex = '9999';
    videoContainer.appendChild(subtitleOverlay);
  }

  if (!subtitleOverlay.dataset.listeners) {
    subtitleOverlay.addEventListener('mouseover', (e) => {
      if (yomiPinned) return;
      onHoverWord(e);
    }, { passive: true });

    // mouseleave garante retomada quando o cursor sai do overlay
    subtitleOverlay.addEventListener('mouseleave', () => {
      if (!yomiPinned) hidePopupAndResume();
    }, { passive: true });

    // fallback pra cobrir “saltos” de target
    subtitleOverlay.addEventListener('mouseout', (e) => {
      const toEl = e.relatedTarget;
      const goingToPopup = yomiPopup && toEl && yomiPopup.contains(toEl);
      const goingToAnotherWord = isOverSubtitleWord(toEl);
      if (!goingToPopup && !goingToAnotherWord && !yomiPinned) {
        hidePopupAndResume();
      }
    }, { passive: true });

    subtitleOverlay.addEventListener('click', (e) => {
      const el = e.target.closest('.subtitle-word');
      if (!el || !dictReady) return;
      yomiPinned = true;
      openPopupForSpan(el);
      e.stopPropagation();
    });

    subtitleOverlay.dataset.listeners = '1';
  }

  const cleanedText = (text||'').replace(/^\d+\s*/, '').replace(/\s*\d+$/, '');
  subtitleOverlay.innerHTML = renderInteractiveSubtitle(cleanedText);
  subtitleOverlay.style.fontSize = isFullScreen ? '40px' : '25px';
}

// ===== Conteúdo → spans =====
function renderInteractiveSubtitle(s) {
  s = String(s || '');
  let out = '';
  let last = 0, m;
  while ((m = jpBlock.exec(s)) !== null) {
    if (m.index > last) out += escapeHtml(s.slice(last, m.index));
    const chunk = m[0];
    out += [...chunk].map((ch, i)=>`<span class="subtitle-word" data-i="${i}" data-len="${chunk.length}" data-chunk="${escapeHtml(chunk)}">${escapeHtml(ch)}</span>`).join('');
    last = m.index + chunk.length;
  }
  if (last < s.length) out += escapeHtml(s.slice(last));
  return out || '';
}

function escapeHtml(x){
  return x.replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

// ===== Lookup / deinflect =====
function gatherFatEntries(surface){
  const hits = [];
  const seen = new Set();
  const push = e => {
    if (!e) return;
    const k = e.surface+'|'+(e.reading||'')+'|'+e.termId;
    if (!seen.has(k)) { seen.add(k); hits.push(e); }
  };

  const surfList = BY_SURFACE.get(surface) || [];
  surfList.forEach(push);
  for (const e of surfList) (BY_TERMID.get(e.termId)||[]).forEach(push);

  const hir = toHiragana(surface);
  if (hir) {
    const readList = BY_READING.get(hir) || [];
    readList.forEach(push);
    for (const e of readList) (BY_TERMID.get(e.termId)||[]).forEach(push);
  }

  if (!hits.length) for (const e of TERMS) if (e.surface === surface) push(e);
  return hits;
}

function deinflectCandidates(s){
  const out = new Set([s]);
  const tryPush = arr => (arr||[]).forEach(x => x && out.add(x));
  const hira = toHiragana(s);

  const mapTe = (stem, type) => {
    switch(type){
      case 'tte': case 'tta': return [stem+'う', stem+'つ', stem+'る'];
      case 'nde': case 'nda': return [stem+'ぶ', stem+'む', stem+'ぬ'];
      case 'ite': case 'ita': return [stem+'く'];
      case 'ide': case 'ida': return [stem+'ぐ'];
      case 'shite':            return [stem+'す'];
      default: return [];
    }
  };

  let m;
  if (m = hira.match(/^(.*?)(って)(?:い?ます|いる|る)?$/u))  tryPush(mapTe(m[1],'tte'));
  if (m = hira.match(/^(.*?)(んで)(?:い?ます|いる|る)?$/u))  tryPush(mapTe(m[1],'nde'));
  if (m = hira.match(/^(.*?)(いて)(?:い?ます|いる|る)?$/u))  tryPush(mapTe(m[1],'ite'));
  if (m = hira.match(/^(.*?)(いで)(?:い?ます|いる|る)?$/u))  tryPush(mapTe(m[1],'ide'));
  if (m = hira.match(/^(.*?)(して)(?:い?ます|いる|る)?$/u))  tryPush(mapTe(m[1],'shite'));

  if (m = hira.match(/^(.*?)(った)$/u)) tryPush(mapTe(m[1],'tta'));
  if (m = hira.match(/^(.*?)(んだ)$/u)) tryPush(mapTe(m[1],'nda'));
  if (m = hira.match(/^(.*?)(いた)$/u)) tryPush(mapTe(m[1],'ita'));
  if (m = hira.match(/^(.*?)(いだ)$/u)) tryPush(mapTe(m[1],'ida'));

  if (m = hira.match(/^(.*?)(って)る$/u)) tryPush(mapTe(m[1],'tte'));
  if (m = hira.match(/^(.*?)(んで)る$/u)) tryPush(mapTe(m[1],'nde'));
  if (m = hira.match(/^(.*?)(いて)る$/u)) tryPush(mapTe(m[1],'ite'));
  if (m = hira.match(/^(.*?)(いで)る$/u)) tryPush(mapTe(m[1],'ide'));
  if (m = hira.match(/^(.*?)(して)る$/u)) tryPush(mapTe(m[1],'shite'));

  if (m = hira.match(/^(.*?)(て|た)$/u)) out.add(m[1] + 'る');
  if (m = hira.match(/^(.*?)(します|しました|しません|しませんでした)$/u)) out.add(m[1]+'する');
  if (m = hira.match(/^(.*?)(ます|ました|ません|ませんでした)$/u))        out.add(m[1]+'る');

  if (m = hira.match(/^(.*?)(ない|なかった)$/u)) {
    out.add(m[1]+'る');
    const ryMap = { 'わ':'う','か':'く','が':'ぐ','さ':'す','た':'つ','な':'ぬ','ま':'む','ら':'る','ば':'ぶ' };
    const pre = m[1].slice(-1); if (ryMap[pre]) out.add(m[1].slice(0,-1) + ryMap[pre]);
  }

  if (m = hira.match(/^(.*?)(られる|れる)$/u)) out.add(m[1]+'る');
  if (m = hira.match(/^(.*?)(させる)$/u)) out.add(m[1]+'る');
  if (m = hira.match(/^(.*?)(よう)$/u)) out.add(m[1]+'る');
  if (m = hira.match(/^(.*?)(たい)$/u)) out.add(m[1]+'る');
  if (m = hira.match(/^(.*?)(すぎる)$/u)) out.add(m[1]+'る');

  const ryMap2 = { 'い':'う', 'ち':'つ', 'り':'る', 'び':'ぶ', 'み':'む', 'に':'ぬ', 'き':'く', 'ぎ':'ぐ', 'し':'す' };
  const last = hira.slice(-1);
  if (ryMap2[last]) out.add(hira.slice(0, -1) + ryMap2[last]);

  out.add(hira);
  out.add(s);

  return [...out];
}

function lookupSmart(surface){
  const pool = new Set(deinflectCandidates(surface));
  const hits = [];
  const seen = new Set();
  const push = e => {
    const k = e.surface+'|'+(e.reading||'')+'|'+e.termId;
    if (!seen.has(k)) { seen.add(k); hits.push(e); }
  };

  for (const cand of pool){
    (BY_SURFACE.get(cand) || []).forEach(push);
    const r = toHiragana(cand);
    if (r) (BY_READING.get(r)||[]).forEach(push);
    for (const e of (BY_SURFACE.get(cand)||[])) (BY_TERMID.get(e.termId)||[]).forEach(push);
    for (const e of (BY_READING.get(r)||[]))     (BY_TERMID.get(e.termId)||[]).forEach(push);
  }

  return hits.sort((a,b)=> (b.score||0) - (a.score||0));
}

// ===== Hover / Close =====
function onHoverWord(e){
  const el = e.target.closest('.subtitle-word');
  if (!el || !dictReady) return;
  openPopupForSpan(el);
}

function onLeaveWord(e){
  const goingTo = e.relatedTarget;
  const leavingOverlay = !e.currentTarget.contains(goingTo);
  const goingToPopup = yomiPopup && yomiPopup.contains(goingTo);
  const goingToAnotherWord = isOverSubtitleWord(goingTo);
  if (leavingOverlay && !goingToPopup && !yomiPinned && !goingToAnotherWord) {
    hidePopupAndResume();
  }
}

function openPopupForSpan(el){
  const chunk = el.getAttribute('data-chunk');
  const i     = Number(el.getAttribute('data-i'));
  const len   = Number(el.getAttribute('data-len'));
  const MAX   = Math.min(24, len);

  for (let L = MAX; L >= 1; L--){
    const sMin = Math.max(0, i - L + 1);
    const sMax = Math.min(i, len - L);
    for (let s = sMin; s <= sMax; s++){
      const substr = chunk.slice(s, s+L);

      let entries = gatherFatEntries(substr);
      if (!entries.length) {
        const r = toHiragana(substr);
        if (r) {
          const viaRead = BY_READING.get(r) || [];
          const seen = new Set();
          entries = [];
          for (const e of viaRead) {
            const k = e.surface+'|'+(e.reading||'')+'|'+e.termId;
            if (!seen.has(k)) { seen.add(k); entries.push(e); }
            (BY_TERMID.get(e.termId)||[]).forEach(v=>{
              const kk = v.surface+'|'+(v.reading||'')+'|'+v.termId;
              if (!seen.has(kk)) { seen.add(kk); entries.push(v); }
            });
          }
        }
      }
      if (!entries.length) entries = lookupSmart(substr);

      if (entries.length){
        renderPopup(substr, entries, el);
        return;
      }
    }
  }
  yomiPopup.style.display = 'none';
}

function formatTags(arr){
  if (!arr || !arr.length) return '';
  return arr.map(t => TAGS.get(t)?.desc || t).join('・');
}

function splitSenses(str) {
  const out = [];
  let buf = '', depth = 0;
  for (const ch of String(str)) {
    if (ch === '(' || ch === '（') depth++;
    if ((ch === ')' || ch === '）') && depth > 0) depth--;
    const isSep = (ch === ',' || ch === '，' || ch === '、' || ch === ';' || ch === '；' || ch === '・');
    if (isSep && depth === 0) {
      const t = buf.trim().replace(/^"(.*)"$/, '$1');
      if (t) out.push(t);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = buf.trim().replace(/^"(.*)"$/, '$1');
  if (last) out.push(last);
  return out;
}
function dedupList(list) {
  const seen = new Set();
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const out = [];
  for (const item of list) {
    const key = norm(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}
function extractGlosses(raw){
  if (raw == null) return [];
  if (typeof raw === 'string') return splitSenses(raw);
  if (Array.isArray(raw)) return raw.flatMap(extractGlosses);
  if (typeof raw === 'object'){
    if (Array.isArray(raw.glossary)) return dedupList(raw.glossary.flatMap(splitSenses));
    if (Array.isArray(raw.gloss))    return dedupList(raw.gloss.flatMap(splitSenses));
    if (Array.isArray(raw.meanings)) return dedupList(raw.meanings.flatMap(splitSenses));
    if (Array.isArray(raw.senses))   return extractGlosses(raw.senses);
    if (typeof raw.text === 'string') return splitSenses(raw.text);
    try { return splitSenses(JSON.stringify(raw)); } catch { return []; }
  }
  return [];
}

function renderPopup(surface, entries, anchorEl){
  if (yomiPopup && yomiPopup.parentNode !== videoContainer) videoContainer.appendChild(yomiPopup);

  const buckets = new Map();
  for (const e of entries){
    const key = `${e.termId}|${e.posGroup||''}`;
    if (!buckets.has(key)){
      buckets.set(key, { termId: e.termId, posGroup: e.posGroup||'', variants: [], tags: new Set(), senses: [] });
    }
    const g = buckets.get(key);
    g.variants.push(e);
    (e.senses||[]).forEach(s => g.senses.push(s));
    [...(e.tags||[]), ...(e.extra||[])].filter(Boolean).forEach(t => g.tags.add(t));
  }

  const posOrder = (p) => {
    const table = ['prt','n','pn','adj-i','adj-na','adj-no','v1','v5','vk','vs','adv','exp','prefix','suffix','ctr','aux','int'];
    const idx = table.indexOf((p||'').toLowerCase());
    return idx >= 0 ? idx : 999;
  };

  const groups = [...buckets.values()].map(g=>{
    const kc = s => (s.match(/[\u4E00-\u9FFF]/g)||[]).length;
    const bestVar = [...g.variants].sort((a,b)=>{
      if ((b.surface===surface)-(a.surface===surface)) return (b.surface===surface)-(a.surface===surface);
      if (kc(b.surface)!==kc(a.surface)) return kc(b.surface)-kc(a.surface);
      return (Number(b.score)||0)-(Number(a.score)||0);
    })[0] || g.variants[0];

    const allGloss = [];
    for (const s of g.senses) allGloss.push(...extractGlosses(s));
    const finalGloss = dedupList(allGloss.map(s => s.replace(/\s+/g, ' ').trim()));

    return {
      termId: g.termId,
      posGroup: g.posGroup,
      titleSurface: bestVar.surface,
      titleReading: bestVar.reading,
      tags: [...g.tags],
      senses: finalGloss,
      maxScore: Math.max(...g.variants.map(v=>Number(v.score)||0), 0),
      exact: g.variants.some(v=>v.surface===surface),
      kanjiCount: kc(bestVar.surface)
    };
  }).sort((a,b)=>{
    if ((b.exact - a.exact)) return (b.exact - a.exact);
    if (posOrder(a.posGroup) !== posOrder(b.posGroup)) return posOrder(a.posGroup) - posOrder(b.posGroup);
    if (b.kanjiCount !== a.kanjiCount) return b.kanjiCount - a.kanjiCount;
    return b.maxScore - a.maxScore;
  });

  const itemsHtml = groups.map(g=>{
    const title = g.titleReading
      ? `<ruby>${g.titleSurface}<rt>${g.titleReading}</rt></ruby>`
      : g.titleSurface;
    const sensesHtml = g.senses.length
      ? `<ul class="senses">` + g.senses.map(s=>`<li>${escapeHtml(String(s))}</li>`).join('') + `</ul>`
      : `<div class="senses empty"><em>sem definição</em></div>`;
    const tagsHtml = g.tags.length
      ? `<div class="tags">` + g.tags.map(t => `<span class="tag">${escapeHtml(TAGS.get(t)?.desc || t)}</span>`).join('') + `</div>`
      : '';
    return `<div class="item">
      <div class="title">${title}${g.posGroup ? ` <span class="reading">(${escapeHtml(g.posGroup)})</span>` : ''}</div>
      ${sensesHtml}
      ${tagsHtml}
    </div>`;
  }).join('');

  yomiPopup.innerHTML = `
    <div class="head">
      <span>${escapeHtml(surface)} — ${groups.length} resultado(s)</span>
      <div class="controls"><button class="yomi-close">×</button></div>
    </div>
    <div class="yomi-scroll">${itemsHtml}</div>
  `;
  yomiPopup.style.display = 'block';

  // PAUSA ao abrir (só se estava tocando)
  if (!video.paused) {
    video.pause();
    autoPausedByPopup = true;
  } else {
    autoPausedByPopup = false;
  }

  // posicionamento
  const parentRect = videoContainer.getBoundingClientRect();
  let left, top;
  if (videoContainer.contains(anchorEl)) {
    const rect = anchorEl.getBoundingClientRect();
    const popWPre = yomiPopup.offsetWidth;
    const popHPre = yomiPopup.offsetHeight;
    left = rect.left - parentRect.left - 8;
    left = Math.min(Math.max(left, 8), parentRect.width - popWPre - 8);
    top  = rect.top  - parentRect.top - popHPre - 12;
    top  = Math.max(top, 8);
  } else {
    const popWPre = yomiPopup.offsetWidth;
    left = Math.max(8, (parentRect.width - popWPre)/2);
    top  = Math.max(8, parentRect.height * 0.12);
  }
  yomiPopup.style.left = left + 'px';
  yomiPopup.style.top  = top  + 'px';

  yomiPopup.onmouseenter = () => { hoveringPopup = true; };
  yomiPopup.onmouseleave = () => {
    hoveringPopup = false;
    if (!yomiPinned) hidePopupAndResume();
  };
  const btnClose = yomiPopup.querySelector('.yomi-close');
  if (btnClose) btnClose.onclick = (ev) => {
    ev.stopPropagation();
    yomiPinned = false;
    hidePopupAndResume();
  };
}

// Fallback global: se não estiver em palavra nem no popup, retoma
let _lastHoverCheck = 0;
document.addEventListener('mousemove', (e) => {
  const now = performance.now();
  if (now - _lastHoverCheck < 60) return; // leve throttle
  _lastHoverCheck = now;

  if (yomiPinned) return;
  const target = e.target;
  const overWord = isOverSubtitleWord(target);
  const overPopup = yomiPopup && yomiPopup.contains(target);
  if (!overWord && !overPopup) {
    hidePopupAndResume();
  }
}, { passive: true });

video.addEventListener('dblclick', toggleFullScreen);
document.addEventListener('fullscreenchange', () => {
  isFullScreen = !!document.fullscreenElement;
  const currentTime = video.currentTime;
  const currentSubtitle = subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
  if (currentSubtitle) showSubtitleOnVideo(currentSubtitle.text);
});

function retimeSubtitles(index) {
  const currentTime = video.currentTime;
  const sub = subtitles[index];
  const timeDifference = currentTime - sub.start;
  for (let i = index; i < subtitles.length; i++) {
    subtitles[i].start += timeDifference;
    subtitles[i].end += timeDifference;
  }
  displaySubtitles(subtitles);
}

function repeatSubtitle(index) {
  const sub = subtitles[index];
  video.currentTime = sub.start;
  video.play();
  setTimeout(() => { video.pause(); }, (sub.end - sub.start) * 1000);
}

function showUnknownWords(index) {
  const words = unknownWords[index];
  if (words && words.length > 0) {
    const wordList = words.map(word => `<span class="unknown-word">${word.japanese} (${word.reading}): ${word.translation}</span>`).join('');
    unknownWordsOverlay.innerHTML = wordList;
    unknownWordsOverlay.style.display = 'block';
  } else {
    unknownWordsOverlay.style.display = 'none';
  }
}

function captureFrame() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    const item = new ClipboardItem({ 'image/png': blob });
    navigator.clipboard.write([item]).then(() => {
      copiedMessage.style.display = 'block';
      setTimeout(() => { copiedMessage.style.display = 'none'; }, 2000);
    }).catch(err => { console.error('Error copying image to clipboard:', err); });
  });
}

async function condenseAudio() {
  try {
    if (!uploadedFile)  return alert("Primeiro envie o vídeo/áudio 😉");
    if (!subtitles.length) return alert("Carregue as legendas antes 📑");

    const buf      = await uploadedFile.arrayBuffer();
    const ctx      = new (window.AudioContext || webkitAudioContext)();
    const srcBuf   = await ctx.decodeAudioData(buf);
    const rate     = srcBuf.sampleRate;
    const srcData  = srcBuf.getChannelData(0);

    const chunks = [];
    subtitles.forEach(({ start, end }) => {
      let a = Math.floor(start * rate);
      let b = Math.ceil (end   * rate);
      a = Math.max(0, Math.min(a, srcData.length));
      b = Math.max(0, Math.min(b, srcData.length));
      if (b > a) chunks.push(srcData.subarray(a, b));
    });
    if (!chunks.length) return alert("Nenhum trecho de áudio dentro do arquivo!");

    let total = 0;
    chunks.forEach(c => total += c.length);
    const merged = new Float32Array(total + 8);

    let offset = 0;
    chunks.forEach(c => {
      const room = merged.length - offset;
      merged.set(room >= c.length ? c : c.subarray(0, room), offset);
      offset += c.length;
    });

    const outBuf = ctx.createBuffer(1, offset, rate);
    outBuf.copyToChannel(merged.subarray(0, offset), 0);

    const mp3Blob = encodeMp3(outBuf);
    const a       = document.createElement("a");
    a.href        = URL.createObjectURL(mp3Blob);
    a.download    = `${uploadedFile.name.replace(/\.[^.]+$/, "")}_condensed.mp3`;
    a.click();
    URL.revokeObjectURL(a.href);
    ctx.close();
  } catch (err) {
    console.error(err);
    alert("Falhou ao condensar áudio – veja o console.");
  }
}

function encodeMp3(buffer) {
  const float32 = buffer.getChannelData(0);
  const pcm16   = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const x = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = x < 0 ? x * 0x8000 : x * 0x7FFF;
  }

  const encoder = new lamejs.Mp3Encoder(1, buffer.sampleRate, 128);
  const BLK     = 1152;
  const chunks  = [];
  for (let i = 0; i < pcm16.length; i += BLK) {
    const mp3buf = encoder.encodeBuffer(pcm16.subarray(i, i + BLK));
    if (mp3buf.length) chunks.push(mp3buf);
  }
  chunks.push(encoder.flush());
  return new Blob(chunks, { type: "audio/mp3" });
}

exportSubtitlesButton.addEventListener('click', () => {
  const data = generateSRT(subtitles);
  const blob = new Blob([data], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'retimed_subtitles.srt';
  a.click();
});
condenseAudioButton.addEventListener("click", condenseAudio);

menuButton.addEventListener('click', (event) => {
  event.stopPropagation();
  menuOptions.classList.toggle('show');
});

document.addEventListener('click', (event) => {
  if (!menuButton.contains(event.target) && !menuOptions.contains(event.target)) {
    menuOptions.classList.remove('show');
  }
  // fecha popup fixado e retoma se foi pausa automática
  if (yomiPinned) {
    const clickedInPopup = yomiPopup && yomiPopup.contains(event.target);
    const onSubtitleWord = event.target.closest && event.target.closest('.subtitle-word');
    if (!clickedInPopup && !onSubtitleWord) {
      yomiPinned = false;
      if (yomiPopup) yomiPopup.style.display = 'none';
      if (autoPausedByPopup){
        setTimeout(()=>{ if (yomiPopup.style.display==='none') { video.play(); autoPausedByPopup=false; } }, 0);
      }
    }
  }
});

menuOptions.addEventListener('click', (event) => { event.stopPropagation(); });
