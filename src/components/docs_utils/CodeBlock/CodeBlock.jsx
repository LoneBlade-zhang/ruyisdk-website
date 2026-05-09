import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import Header from './Header';
import {
    parseInputLines,
    pickCodeByLang,
    extractDisplayCodeAndHighlightLines,
    getDisplayLanguage,
    cleanShellPrompt,
    resolveBooleanFlag,
    resolveHeaderTitle,
    createLinePropsGetter,
    cleanLineForCopy,
} from './utils';

const CodeBlock = ({ 
    code = '', 
    lang = 'bash', 
    langs = [],
    title = '',
    copiable,
    input = '',
    hasInput = false,
    showTitleCopyButton,
    highlightStyle,
    preStyle,
    wrapperClassName = '',
    bodyClassName = '',
    lineCopyable,
    enableMetaHighlight = false,
}) => {
    const [currentLang, setCurrentLang] = useState(lang);
    const codeBlockRef = useRef(null);

    const inputLines = useMemo(
        () => parseInputLines(input, hasInput),
        [input, hasInput],
    );

    const currentCode = useMemo(
        () => pickCodeByLang(code, langs, currentLang),
        [code, langs, currentLang],
    );

    const { displayCode, highlightLines } = useMemo(
        () => extractDisplayCodeAndHighlightLines(currentCode),
        [currentCode],
    );

    const displayLang = getDisplayLanguage(currentLang);
    const isInputOutputBlock = hasInput;

    const copyableCode = useMemo(() => 
        isInputOutputBlock ? cleanShellPrompt(displayCode) : displayCode,
    [displayCode, isInputOutputBlock]);

    const shouldShowHeaderCopy = useMemo(
        () => resolveBooleanFlag(
            showTitleCopyButton,
            resolveBooleanFlag(copiable, !isInputOutputBlock),
        ),
        [showTitleCopyButton, copiable, isInputOutputBlock],
    );

    const headerTitle = useMemo(
        () => resolveHeaderTitle(title, isInputOutputBlock, currentLang, displayLang),
        [title, isInputOutputBlock, currentLang, displayLang],
    );

    const shouldEnableLineCopy = useMemo(
        () => resolveBooleanFlag(lineCopyable, isInputOutputBlock),
        [lineCopyable, isInputOutputBlock],
    );

    const lineProps = useMemo(
        () => createLinePropsGetter({
            highlightLines,
            inputLines,
            isInputOutputBlock,
            enableMetaHighlight,
            highlightStyle,
        }),
        [highlightLines, inputLines, isInputOutputBlock, enableMetaHighlight, highlightStyle],
    );

    const mergedPreStyle = useMemo(
        () => ({
            margin: 0,
            padding: '20px',
            fontSize: '0.875rem',
            lineHeight: 'var(--ifm-pre-line-height)',
            fontWeight: 400,
            backgroundColor: 'transparent',
            ...preStyle,
        }),
        [preStyle],
    );

    const defaultWrapperClass = 'rounded-xl font-mono my-6 overflow-hidden text-sm bg-neutral-50 border border-neutral-200 shadow-sm dark:bg-neutral-900 dark:border-neutral-800 dark:shadow-black/30';
    const defaultBodyClass = 'bg-white dark:bg-neutral-900 overflow-x-auto';

    useEffect(() => {
        if (!shouldEnableLineCopy || !codeBlockRef.current) return;
        const codeNode = codeBlockRef.current.querySelector('pre code');
        if (!codeNode) return;

        const lines = Array.from(codeNode.children);
        const cleanupFns = [];

        const copyLine = async (text) => {
            try {
                await navigator.clipboard.writeText(text);
            } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
        };

        lines.forEach((line, index) => {
            const shouldHighlight = isInputOutputBlock
                ? inputLines.has(index)
                : (enableMetaHighlight && highlightLines.has(index));
            if (!shouldHighlight) return;

            const existing = line.querySelector('.ruyi-line-copy-btn');
            if (existing) existing.remove();

            line.style.position = 'relative';
            line.style.paddingLeft = '2rem';
            line.style.paddingRight = '';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ruyi-line-copy-btn';
            btn.setAttribute('aria-label', 'Copy line');
            const defaultIcon = '<img src="/icons/copy.svg" alt="" aria-hidden="true" style="width: 14px; height: 14px; opacity: 0.72;" />';
            const successIcon = '<img src="/icons/复制成功.svg" alt="" aria-hidden="true" style="width: 14px; height: 14px; opacity: 0.9;" />';
            btn.innerHTML = defaultIcon;
            btn.style.cssText = `
                position: absolute;
                left: 0.35rem;
                top: 50%;
                transform: translateY(-50%);
                border: none;
                background: transparent;
                padding: 2px;
                margin: 0;
                border-radius: 4px;
                cursor: pointer;
                opacity: 0.66;
                transition: opacity 0.15s ease, background-color 0.15s ease;
                line-height: 0;
            `;

            const onEnter = () => {
                btn.style.opacity = '1';
                btn.style.backgroundColor = 'rgba(148, 163, 184, 0.16)';
            };
            const onLeave = () => {
                btn.style.opacity = '0.66';
                btn.style.backgroundColor = 'transparent';
            };
            const onClick = async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const text = cleanLineForCopy(line.textContent || '', isInputOutputBlock);
                if (!text) return;
                await copyLine(text);
                btn.style.opacity = '1';
                btn.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                btn.innerHTML = successIcon;
                setTimeout(() => {
                    btn.innerHTML = defaultIcon;
                    onLeave();
                }, 900);
            };

            btn.addEventListener('mouseenter', onEnter);
            btn.addEventListener('mouseleave', onLeave);
            btn.addEventListener('click', onClick);
            line.appendChild(btn);

            cleanupFns.push(() => {
                btn.removeEventListener('mouseenter', onEnter);
                btn.removeEventListener('mouseleave', onLeave);
                btn.removeEventListener('click', onClick);
            });
        });

        return () => {
            cleanupFns.forEach((fn) => fn());
            if (!codeBlockRef.current) return;
            const staleButtons = codeBlockRef.current.querySelectorAll('.ruyi-line-copy-btn');
            staleButtons.forEach((node) => node.remove());
        };
    }, [shouldEnableLineCopy, displayCode, highlightLines, inputLines, isInputOutputBlock, enableMetaHighlight]);

    return (
        <div
            ref={codeBlockRef}
            className={`${defaultWrapperClass} ${wrapperClassName}`.trim()}
        >
            <Header 
                title={headerTitle}
                code={copyableCode}
                copiable={shouldShowHeaderCopy}
                langs={langs}
                currentLang={currentLang}
                onLangChange={setCurrentLang}
                isTerminal={isInputOutputBlock}
            />
            
            <div className={`${defaultBodyClass} ${bodyClassName}`.trim()}>
                <SyntaxHighlighter 
                    language={displayLang} 
                    customStyle={mergedPreStyle}
                    wrapLines={true} 
                    wrapLongLines={false}
                    lineProps={lineProps}
                >
                    {displayCode}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export default CodeBlock;
