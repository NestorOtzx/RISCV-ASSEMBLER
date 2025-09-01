import { ensureFirstLineWrapped, getClosestDiv, placeCaretAtEnd, fixEmptyDivs } from './dom-utils';
import { extractContentAndLabels } from './content-utils';
import { HistoryManager } from './history-manager';

export async function copy(editorEl: HTMLDivElement) {
  if (!editorEl) return;

  const lines: string[] = [];
  editorEl.querySelectorAll('div').forEach(div => {
    if (div.textContent === '' || div.innerHTML === '<br>') {
      lines.push('');
    } else {
      lines.push(div.textContent || '');
    }
  });

  const plainText = lines.join('\n');

  if (plainText.trim() !== '' || lines.length > 0) {
    await navigator.clipboard.writeText(plainText);
  }
}

export function handlePaste(
  editorEl: HTMLDivElement,
  text: string,
  history: HistoryManager,
  emitContent: (text: string, labels: { name: string; line: number }[]) => void,
  highlightActiveLine: () => void
) {
  const prevHTML = editorEl.innerHTML;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  let startDiv = getClosestDiv(range.startContainer, editorEl);
  let endDiv = getClosestDiv(range.endContainer, editorEl);

  if (!startDiv) {
    startDiv = document.createElement('div');
    startDiv.innerHTML = '<br>';
    editorEl.appendChild(startDiv);
  }
  if (!endDiv) endDiv = startDiv;

  const afterText = endDiv.textContent?.slice(range.endOffset) || '';
  const beforeText = startDiv.textContent?.slice(0, range.startOffset) || '';

  const divs = Array.from(editorEl.querySelectorAll('div'));
  const startIndex = divs.indexOf(startDiv);
  const endIndex = divs.indexOf(endDiv);

  for (let i = startIndex; i <= endIndex; i++) {
    editorEl.removeChild(divs[i]);
  }

  let currentDiv = document.createElement('div');
  editorEl.insertBefore(currentDiv, divs[endIndex + 1] || null);

  const pasteLines = text.split(/\r?\n/);
  const firstLine = beforeText + (pasteLines[0] ?? '');
  currentDiv.textContent = firstLine === '' ? '' : firstLine;

  let lastInserted = currentDiv;

  for (let i = 1; i < pasteLines.length; i++) {
    const newDiv = document.createElement('div');
    newDiv.textContent = pasteLines[i] ?? '';
    editorEl.insertBefore(newDiv, lastInserted.nextSibling);
    lastInserted = newDiv;
  }

  if (afterText) {
    lastInserted.textContent = (lastInserted.textContent || '') + afterText;
  }

  const newRange = document.createRange();
  const firstChild = lastInserted.firstChild;
  if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
    newRange.setStart(firstChild, (firstChild as Text).length);
  } else {
    newRange.setStart(lastInserted, lastInserted.childNodes.length);
  }
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);

  fixEmptyDivs(editorEl);
  ensureFirstLineWrapped(editorEl);

  if (editorEl.innerHTML !== prevHTML) {
    const { text: cleaned, labels } = extractContentAndLabels(editorEl);
    emitContent(cleaned, labels);
    history.push(editorEl.innerHTML);
    highlightActiveLine();
  }
}

export function deleteAll(
  editorEl: HTMLDivElement,
  history: HistoryManager,
  emitContent: (text: string, labels: { name: string; line: number }[]) => void,
  highlightActiveLine: () => void
) {
  editorEl.innerHTML = '<div><br></div>';
  const { text, labels } = extractContentAndLabels(editorEl);
  emitContent(text, labels);
  history.push(editorEl.innerHTML);
  placeCaretAtEnd(editorEl);
  highlightActiveLine();
}

export function undo(history: HistoryManager, restoreContent: (html: string) => void) {
  const prev = history.undo();
  if (prev !== undefined) restoreContent(prev);
}

export function redo(history: HistoryManager, restoreContent: (html: string) => void) {
  const next = history.redo();
  if (next !== undefined) restoreContent(next);
}
