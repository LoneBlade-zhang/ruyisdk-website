const DEFAULT_HIGHLIGHT_STYLE = {
    display: 'block',
    backgroundColor: 'var(--ifm-color-warning-contrast-background, #fffbeb)',
    borderRadius: '2px',
};

function stripShellPrompt(line) {
    if (typeof line !== 'string') return '';

    return line
        .replace(/^\s*«[^»]*»\s*(?:[$#])\s?/, '')
        .replace(/^\s*\[[^\]]+\][^\s]*\s*(?:[$#])\s?/, '')
        .replace(/^\s*(?:[$#])\s?/, '')
        .trim();
}

export function cleanLineForCopy(line, isInputOutputBlock) {
    if (typeof line !== 'string') return '';
    if (isInputOutputBlock) return stripShellPrompt(line);
    return line.trimEnd();
}

export function cleanShellPrompt(code) {
    if (typeof code !== 'string') return '';
    
    const lines = code.split('\n');
    
    const cleanedLines = lines.map(stripShellPrompt);
    
    return cleanedLines.join('\n');
}

export function normalizeCode(code) {
    if (typeof code !== 'string') return '';
    
    const normalized = code.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    
    if (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
    }

    if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    
    return lines.join('\n');
}

export function parseInputLines(input, hasInput) {
    const lines = new Set();
    if (!hasInput || !input) return lines;

    const normalizedInput = String(input).replace(/^['"]|['"]$/g, '');
    const parts = normalizedInput.split(',');

    parts.forEach((part) => {
        const token = part.trim();
        if (!token) return;

        if (token.includes('-')) {
            const [start, end] = token.split('-').map((n) => parseInt(n.trim(), 10));
            if (Number.isNaN(start) || Number.isNaN(end)) return;
            for (let i = start; i <= end; i += 1) {
                lines.add(i - 1);
            }
            return;
        }

        const lineNum = parseInt(token, 10);
        if (!Number.isNaN(lineNum)) {
            lines.add(lineNum - 1);
        }
    });

    return lines;
}

export function pickCodeByLang(code, langs, currentLang) {
    if (!Array.isArray(langs) || langs.length === 0) return code;
    const langOption = langs.find((item) => item.lang === currentLang);
    return langOption ? langOption.code : code;
}

export function getDisplayLanguage(currentLang) {
    return currentLang === 'no' ? 'text' : currentLang;
}

export function extractDisplayCodeAndHighlightLines(code) {
    const source = typeof code === 'string' ? code : String(code || '');
    const lines = source.split('\n');
    const highlightLines = new Set();
    let isHighlighting = false;
    const filteredLines = [];

    lines.forEach((line) => {
        const trimmedLine = line.trim();

        if (trimmedLine.includes('highlight-start')) {
            isHighlighting = true;
            return;
        }

        if (trimmedLine.includes('highlight-end')) {
            isHighlighting = false;
            return;
        }

        if (trimmedLine.includes('highlight-next-line')) {
            highlightLines.add(filteredLines.length);
            return;
        }

        filteredLines.push(line);
        if (isHighlighting) {
            highlightLines.add(filteredLines.length - 1);
        }
    });

    return {
        displayCode: normalizeCode(filteredLines.join('\n')),
        highlightLines,
    };
}

export function resolveHeaderTitle(title, isInputOutputBlock, currentLang, displayLang) {
    if (title && title.trim() !== '') return title;
    if (isInputOutputBlock) return displayLang;
    if (currentLang === 'text' || currentLang === '') return 'text';
    return displayLang;
}

export function resolveBooleanFlag(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return fallback;
}

export function createLinePropsGetter({
    highlightLines,
    inputLines,
    isInputOutputBlock,
    enableMetaHighlight = false,
    highlightStyle = DEFAULT_HIGHLIGHT_STYLE,
}) {
    return (lineNumber) => {
        const index = lineNumber - 1;
        const shouldHighlight = isInputOutputBlock
            ? inputLines.has(index)
            : (enableMetaHighlight && highlightLines.has(index));
        if (!shouldHighlight) {
            return { style: { display: 'block' } };
        }
        return { style: { display: 'block', ...highlightStyle } };
    };
}
