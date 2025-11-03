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
  console.log("Selection: "+selection+ "range count: "+selection?.rangeCount);
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  let startDiv = getClosestDiv(range.startContainer, editorEl);
  console.log("Selection start div: ", startDiv);
  let endDiv = getClosestDiv(range.endContainer, editorEl);
  console.log("Selection end div: ", endDiv);

  if (!startDiv) {
    startDiv = document.createElement('div');
    startDiv.innerHTML = '<br>';
    editorEl.appendChild(startDiv);
  }
  if (!endDiv) endDiv = startDiv;

  const beforeText = getTextBeforeRange(startDiv, range);
  const afterText = getTextAfterRange(endDiv, range);

  console.log("Selection range: "+range+ "end offset: "+ range.endOffset + " start offset: "+ range.startOffset + " TEXT "+afterText + " : "+beforeText);

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

function getTextBeforeRange(div: HTMLDivElement, range: Range): string {
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
  let result = '';
  let node: Node | null = walker.nextNode();

  while (node) {
    const text = node.textContent || '';
    if (node === range.startContainer) {
      result += text.slice(0, range.startOffset);
      break;
    } else {
      result += text;
    }
    node = walker.nextNode();
  }

  return result;
}

function getTextAfterRange(div: HTMLDivElement, range: Range): string {
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
  let result = '';
  let foundStart = false;
  let node: Node | null = walker.nextNode();

  while (node) {
    const text = node.textContent || '';
    if (node === range.endContainer) {
      result += text.slice(range.endOffset);
      foundStart = true;
    } else if (foundStart) {
      result += text;
    }
    node = walker.nextNode();
  }

  return result;
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

