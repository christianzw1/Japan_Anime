const video = document.getElementById('video');
const subtitleList = document.getElementById('subtitle-list');
const subtitlePlaceholder = document.getElementById('subtitle-placeholder');
const videoUpload = document.getElementById('video-upload');
const subtitleUpload = document.getElementById('subtitle-upload');
const toggleRetimeButtons = document.getElementById('toggle-retime-buttons');
const centralizeButton = document.querySelector('.centralize-button');
const copiedMessage = document.getElementById('copied-message');
const videoUploadLabel = document.querySelector('label[for="video-upload"]');

let subtitles = [];
let retimeButtonsVisible = false;

videoUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    videoUpload.classList.add('hidden');
    videoUploadLabel.classList.add('hidden');
});

subtitleUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        if (file.name.endsWith('.srt')) {
            subtitles = parseSRTSubtitles(content);
        } else if (file.name.endsWith('.ass')) {
            subtitles = parseASSSubtitles(content);
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
    }
});

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

function displaySubtitles(subtitles) {
    subtitleList.innerHTML = '';
    subtitles.forEach((sub, index) => {
        const subItem = document.createElement('div');
        subItem.className = 'subtitle-item';
        subItem.innerHTML = `
            <span class="subtitle-time">${formatTime(sub.start)} - ${formatTime(sub.end)}</span>
            <span class="subtitle-text">${sub.text}</span>
            <button class="small-button" onclick="repeatSubtitle(${index})">Repeat</button>
            <button class="retime-button" onclick="retimeSubtitles(${index})" style="display: none;">Retime to current</button>
        `;
        subItem.onclick = () => {
            video.currentTime = sub.start;
        };
        subtitleList.appendChild(subItem);
    });
}

function formatTime(seconds) {
    const date = new Date(seconds * 1000);
    return date.toISOString().substr(11, 8);
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
        subtitleOverlay.style.color = 'white';
        subtitleOverlay.style.textShadow = '2px 2px 2px black';
        subtitleOverlay.style.fontSize = '24px';
        subtitleOverlay.style.textAlign = 'center';
        subtitleOverlay.style.width = '80%';
        video.parentNode.insertBefore(subtitleOverlay, video.nextSibling);
    }
    subtitleOverlay.textContent = text;
}

function retimeSubtitles(index) {
    const currentTime = video.currentTime;
    const sub = subtitles[index];
    const timeDifference = currentTime - sub.start;
    
    subtitles.forEach((subtitle) => {
        subtitle.start += timeDifference;
        subtitle.end += timeDifference;
    });
    
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
    } else {
        showSubtitleOnVideo('');
    }
});

// Shrink button when sticky
window.addEventListener('scroll', () => {
    const centralizeButton = document.querySelector('.centralize-button button');
    if (window.scrollY > 0) {
        centralizeButton.classList.add('sticky');
    } else {
        centralizeButton.classList.remove('sticky');
    }
});

function captureFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
            showCopiedMessage();
        }).catch(err => {
            console.error('Failed to copy image:', err);
        });
    });
}

function showCopiedMessage() {
    copiedMessage.style.display = 'block';
    setTimeout(() => {
        copiedMessage.style.display = 'none';
    }, 2000);
}
