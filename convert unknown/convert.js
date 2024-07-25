const convertToHiragana = (reading) => {
    // Função de conversão de leitura para hiragana (pode ser expandida se necessário)
    return reading;
};

const isVerb = (word, reading, translation) => {
    // Lista de terminações verbais comuns em inglês
    const verbEndings = ['ate', 'ify', 'ise', 'ize', 'ed', 'ing', 's'];

    // Lista de palavras-chave comuns para identificação rápida
    const commonVerbs = [
        'be', 'have', 'do', 'say', 'get', 'make', 'go', 'know', 'take', 'see',
        'come', 'think', 'look', 'want', 'give', 'use', 'find', 'tell', 'ask',
        'work', 'seem', 'feel', 'try', 'leave', 'call'
    ];

    // Verifica se a palavra termina com uma das terminações verbais comuns
    const isCommonVerb = commonVerbs.includes(word.toLowerCase());
    const hasVerbEnding = verbEndings.some(ending => word.toLowerCase().endsWith(ending));

    // Verifica se a palavra está no contexto de uma tradução verbal
    const translationWords = translation.split(' ');
    const containsVerbTranslation = translationWords.some(transWord => commonVerbs.includes(transWord.toLowerCase()) || hasVerbEnding);

    return isCommonVerb || hasVerbEnding || containsVerbTranslation;
};

const generateVerbForms = (word, reading, translation) => {
    let verbRoot, readingRoot, verbForms;

    if (word.slice(-1) === 'る' && (reading.slice(-1) === 'る' || reading.slice(-1) === 'ル')) {
        // 一段動詞 (Ichidan verbs)
        verbRoot = word.slice(0, -1);
        readingRoot = convertToHiragana(reading.slice(0, -1));
        verbForms = [
            { form: "dictionary form", verb: word, reading: reading },
            { form: "present/future", verb: verbRoot + "ます", reading: readingRoot + "ます" },
            { form: "past", verb: verbRoot + "ました", reading: readingRoot + "ました" },
            { form: "negative", verb: verbRoot + "ません", reading: readingRoot + "ません" },
            { form: "past negative", verb: verbRoot + "ませんでした", reading: readingRoot + "ませんでした" },
            { form: "te form", verb: verbRoot + "て", reading: readingRoot + "て" },
            { form: "ta form", verb: verbRoot + "た", reading: readingRoot + "た" },
            { form: "volitional", verb: verbRoot + "よう", reading: readingRoot + "よう" },
            { form: "conditional", verb: verbRoot + "れば", reading: readingRoot + "れば" },
            { form: "potential", verb: verbRoot + "られる", reading: readingRoot + "られる" },
            { form: "imperative", verb: verbRoot + "ろ", reading: readingRoot + "ろ" },
            { form: "negative imperative", verb: verbRoot + "るな", reading: readingRoot + "るな" },
            { form: "causative", verb: verbRoot + "させる", reading: readingRoot + "させる" },
            { form: "passive", verb: verbRoot + "られる", reading: readingRoot + "られる" },
            { form: "negative", verb: verbRoot + "ない", reading: readingRoot + "ない" },
            { form: "past negative", verb: verbRoot + "なかった", reading: readingRoot + "なかった" }
        ];
    } else {
        // 五段動詞 (Godan verbs)
        verbRoot = word.slice(0, -1);
        readingRoot = convertToHiragana(reading.slice(0, -1));
        verbForms = [
            { form: "dictionary form", verb: word, reading: reading },
            { form: "present/future", verb: verbRoot + "します", reading: readingRoot + "します" },
            { form: "past", verb: verbRoot + "しました", reading: readingRoot + "しました" },
            { form: "negative", verb: verbRoot + "しません", reading: readingRoot + "しません" },
            { form: "past negative", verb: verbRoot + "しませんでした", reading: readingRoot + "しませんでした" },
            { form: "te form", verb: verbRoot + "して", reading: readingRoot + "して" },
            { form: "ta form", verb: verbRoot + "した", reading: readingRoot + "した" },
            { form: "volitional", verb: verbRoot + "そう", reading: readingRoot + "そう" },
            { form: "conditional", verb: verbRoot + "せば", reading: readingRoot + "せば" },
            { form: "potential", verb: verbRoot + "せる", reading: readingRoot + "せる" },
            { form: "imperative", verb: verbRoot + "せ", reading: readingRoot + "せ" },
            { form: "negative imperative", verb: verbRoot + "すな", reading: readingRoot + "すな" },
            { form: "causative", verb: verbRoot + "させる", reading: readingRoot + "させる" },
            { form: "passive", verb: verbRoot + "される", reading: readingRoot + "される" },
            { form: "negative", verb: verbRoot + "さない", reading: readingRoot + "さない" },
            { form: "past negative", verb: verbRoot + "さなかった", reading: readingRoot + "さなかった" }
        ];
    }

    return verbForms.map(form => `${form.verb} (${form.reading}) = (${translation} - ${form.form})`);
};

const convertAnkiFile = (fileContent) => {
    const lines = fileContent.split('\n');
    const convertedLines = [];
    const seenForms = new Set();
    const seenWords = new Set(); // Adicionado para verificar palavras não verbais duplicadas

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
            const read = readingList[i] ? convertToHiragana(readingList[i].replace(/【.*?】/g, '').trim()) : '';

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
                if (isVerb(word, read, cleanedTranslations)) {
                    // Gera formas verbais e adiciona ao resultado
                    const verbForms = generateVerbForms(word, read, cleanedTranslations);
                    verbForms.forEach(form => {
                        if (!seenForms.has(form)) {
                            convertedLines.push(form);
                            seenForms.add(form);
                        }
                    });
                } else {
                    const formattedLine = `${word} (${read}) = ${cleanedTranslations}`;
                    if (!seenWords.has(formattedLine)) {
                        convertedLines.push(formattedLine);
                        seenWords.add(formattedLine);
                    }
                }
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
