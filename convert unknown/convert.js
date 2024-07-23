const convertAnkiFile = (fileContent) => {
    const lines = fileContent.split('\n');
    const convertedLines = [];
    const seenWords = new Set();

    for (let line of lines) {
        if (line.trim() === '') continue;

        const [words, rest] = line.split('\t');
        if (!words || !rest) continue;

        const [readings, ...translations] = rest.split('<br>');
        if (!readings) continue;

        const wordList = words.split(',').map(word => word.trim());
        const readingList = readings.split(',').map(read => read.trim());

        for (let i = 0; i < wordList.length; i++) {
            const word = wordList[i];
            if (seenWords.has(word)) continue;

            const read = readingList[i] ? readingList[i].replace(/【.*?】/g, '').trim() : '';
            
            let wordTranslations = [];
            for (let j = i; j < translations.length; j++) {
                const trans = translations[j].replace(/^\d+\.\s*/, '').trim();
                if (trans && !wordTranslations.includes(trans)) {
                    wordTranslations.push(trans);
                } else {
                    break;
                }
            }

            const cleanedTranslations = wordTranslations.join(', ');

            if (word && read && cleanedTranslations) {
                const formattedLine = `${word} (${read}) = ${cleanedTranslations}`;
                convertedLines.push(formattedLine);
                seenWords.add(word);
            }
        }
    }

    return convertedLines.join('\n');
};

document.getElementById('convert-button').addEventListener('click', () => {
    const fileInput = document.getElementById('anki-upload');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const convertedContent = convertAnkiFile(content);
            document.getElementById('converted-text').textContent = convertedContent;
            document.getElementById('download-button').style.display = 'inline-block';
        };
        reader.readAsText(file);
    }
});

document.getElementById('download-button').addEventListener('click', () => {
    const convertedText = document.getElementById('converted-text').textContent;
    const blob = new Blob([convertedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_unknown_words.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});