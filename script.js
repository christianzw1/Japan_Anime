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

let isFullScreen = false;
let subtitles = [];
let unknownWords = {};
let retimeButtonsVisible = false;
let currentSubtitleIndex = 0;
let isPauseEnabled = false;
let lastPausedSubtitleIndex = -1;
let subtitleFormat = 'srt';
let uploadedFile = null;

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.mozRequestFullScreen) { // Firefox
            videoContainer.mozRequestFullScreen();
        } else if (videoContainer.webkitRequestFullscreen) { // Chrome, Safari e Opera
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) { // Internet Explorer/Edge
            videoContainer.msRequestFullscreen();
        }
        isFullScreen = true;
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        isFullScreen = false;
    }
}

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
    video.volume = 1.0; // Garante que o volume esteja no máximo ao carregar o vídeo
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
    if (event.key === 's' || event.key === 'S') {
        captureFrame();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        navigateSubtitle(-1);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        navigateSubtitle(1);
    }
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
    document.querySelectorAll('.subtitle-item').forEach(item => {
        item.classList.remove('active');
    });
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
        if (line === '') continue;

        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
        if (timeMatch) {
            if (currentSubtitle) {
                subtitles.push(currentSubtitle);
            }
            currentSubtitle = {
                start: timeToSeconds(timeMatch[1]),
                end: timeToSeconds(timeMatch[2]),
                text: ''
            };
        } else if (currentSubtitle) {
            currentSubtitle.text += (currentSubtitle.text ? '\n' : '') + line;
        }
    }

    if (currentSubtitle) {
        subtitles.push(currentSubtitle);
    }

    return subtitles;
}

document.getElementById('fullscreen-button').addEventListener('click', toggleFullScreen);

function parseASSSubtitles(content) {
    const lines = content.split('\n');
    const subtitles = [];
    let inEventsSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('[Events]')) {
            inEventsSection = true;
            continue;
        }

        if (inEventsSection && line.startsWith('Dialogue:')) {
            const parts = line.split(',');
            const start = parts[1].trim();
            const end = parts[2].trim();
            const text = parts.slice(9).join(',').trim();

            subtitles.push({
                start: timeToSeconds(start),
                end: timeToSeconds(end),
                text: text.replace(/\\N/g, '\n')  // Replaces ASS newline with actual newline
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
    fullSubtitlesDiv.innerHTML = ''; // Clear previous content
    
    subtitles.forEach(sub => {
        const subDiv = document.createElement('div');
        subDiv.className = 'full-subtitle-item';
        subDiv.innerHTML = `
            <span class="subtitle-time">${formatTime(sub.start)} - ${formatTime(sub.end)}</span>
            <span class="subtitle-text">${sub.text}</span>
        `;
        fullSubtitlesDiv.appendChild(subDiv);
    });
    
    fullSubtitlesModal.style.display = 'block';
}

closeFullSubtitlesButton.addEventListener('click', () => {
    fullSubtitlesModal.style.display = 'none';
});

// Fechar o menu quando clicar fora dele
document.addEventListener('click', (event) => {
    if (!menuButton.contains(event.target) && !menuOptions.contains(event.target)) {
        menuOptions.style.display = 'none';
    }
});

// Atualizar a função displaySubtitles para incluir o botão de menu
function displaySubtitles(subtitles) {
    subtitleList.innerHTML = '';
    subtitles.forEach((sub, index) => {
        const subItem = document.createElement('div');
        subItem.className = 'subtitle-item';

        // Remove enumeração do início e do fim do texto da legenda, se houver
        let cleanedText = sub.text.replace(/^\d+\s*/, '');
        cleanedText = cleanedText.replace(/\s*\d+$/, '');

        subItem.innerHTML = `
            <span class="subtitle-time">${formatTime(sub.start)} - ${formatTime(sub.end)}</span>
            <span class="subtitle-text">${cleanedText}</span>
            <button class="small-button" onclick="repeatSubtitle(${index})">Repeat</button>
            <button class="retime-button" onclick="retimeSubtitles(${index})" style="display: none;">Retime to current</button>
            <button class="edit-unknown-words" onclick="editUnknownWords(${index})">Edit Unknown Words</button>
        `;
        subItem.onclick = () => {
            video.currentTime = sub.start;
            currentSubtitleIndex = index;
            updateActiveSubtitle();
        };
        subtitleList.appendChild(subItem);
    });
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
                                    if (!unknownWords[index]) {
                                        unknownWords[index] = [];
                                    }
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
    
    document.querySelectorAll('.subtitle-item').forEach(item => {
        item.classList.remove('active');
    });
    
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

        // Pausa o vídeo se a opção estiver habilitada, uma palavra desconhecida for exibida e não foi pausado anteriormente nesta legenda
        if (isPauseEnabled && unknownWords[index] && unknownWords[index].length > 0 && lastPausedSubtitleIndex !== index) {
            lastPausedSubtitleIndex = index;
            video.pause();
            setTimeout(() => {
                video.play();
            }, 3000); // Pausa por 3 segundos
        }
    } else {
        showSubtitleOnVideo('');
        unknownWordsOverlay.style.display = 'none';
    }
});

enablePauseButton.addEventListener('click', () => {
    isPauseEnabled = true;
    alert('Pause enabled');
});

disablePauseButton.addEventListener('click', () => {
    isPauseEnabled = false;
    alert('Pause disabled');
});

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
    return subs.map((sub, idx) => `${idx + 1}\n${secondsToSRTTime(sub.start)} --> ${secondsToSRTTime(sub.end)}\n${sub.text}\n`).join('\n');
}

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
        subtitleOverlay.style.zIndex = '9999'; // Garante que as legendas fiquem sobre o vídeo
        videoContainer.appendChild(subtitleOverlay);
    }

    // Remove enumeração do início e do fim do texto da legenda, se houver
    let cleanedText = text.replace(/^\d+\s*/, '');
    cleanedText = cleanedText.replace(/\s*\d+$/, '');

    subtitleOverlay.textContent = cleanedText;
    
    // Ajusta o tamanho da fonte baseado no modo de tela cheia
    if (isFullScreen) {
        subtitleOverlay.style.fontSize = '40px'; // Aumenta o tamanho da fonte em tela cheia
    } else {
        subtitleOverlay.style.fontSize = '25px'; // Tamanho padrão fora da tela cheia
    }
}

video.addEventListener('dblclick', toggleFullScreen);

document.addEventListener('fullscreenchange', () => {
    isFullScreen = !!document.fullscreenElement;
    // Atualiza a legenda atual quando o modo de tela cheia muda
    const currentTime = video.currentTime;
    const currentSubtitle = subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
    if (currentSubtitle) {
        showSubtitleOnVideo(currentSubtitle.text);
    }
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
    setTimeout(() => {
        video.pause();
    }, (sub.end - sub.start) * 1000);
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
            setTimeout(() => {
                copiedMessage.style.display = 'none';
            }, 2000);
        }).catch(err => {
            console.error('Error copying image to clipboard:', err);
        });
    });
}
async function condenseAudio() {
  try {
    if (!uploadedFile)  return alert("Primeiro envie o vídeo/áudio 😉");
    if (!subtitles.length) return alert("Carregue as legendas antes 📑");

    /* 1. decodifica */
    const buf      = await uploadedFile.arrayBuffer();
    const ctx      = new (window.AudioContext || webkitAudioContext)();
    const srcBuf   = await ctx.decodeAudioData(buf);
    const rate     = srcBuf.sampleRate;
    const srcData  = srcBuf.getChannelData(0);

    /* 2. fatia todos os trechos válidos */
    const chunks = [];
    subtitles.forEach(({ start, end }) => {
      let a = Math.floor(start * rate);
      let b = Math.ceil (end   * rate);
      a = Math.max(0, Math.min(a, srcData.length));
      b = Math.max(0, Math.min(b, srcData.length));
      if (b > a) chunks.push(srcData.subarray(a, b));
    });
    if (!chunks.length) return alert("Nenhum trecho de áudio dentro do arquivo!");

    /* 3. calcula total com segurança */
    let total = 0;
    chunks.forEach(c => total += c.length);
    const merged = new Float32Array(total + 8); // +8 p/ garantir “folga”

    /* 4. copia, verificando limites */
    let offset = 0;
    chunks.forEach(c => {
      const room = merged.length - offset;
      merged.set(room >= c.length ? c : c.subarray(0, room), offset);
      offset += c.length;
    });

    /* 5. joga no AudioBuffer p/ MP3 */
    const outBuf = ctx.createBuffer(1, offset, rate);
    outBuf.copyToChannel(merged.subarray(0, offset), 0);

    /* 6. MP3 ↓ */
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

// Close the menu when clicking outside
document.addEventListener('click', (event) => {
    if (!menuButton.contains(event.target) && !menuOptions.contains(event.target)) {
        menuOptions.classList.remove('show');
    }
});

// Prevent closing when clicking inside the menu
menuOptions.addEventListener('click', (event) => {
    event.stopPropagation();
});
