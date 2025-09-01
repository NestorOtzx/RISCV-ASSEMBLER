import { getClosestDiv, getCaretOffsetInDiv } from './dom-utils';

// realiza la lógica de crear nueva línea con indent heredado.
// callbacks emitCb & highlightCb son funciones del componente para actualizar estado.
export function handleNewLineIndent(
  editorEl: HTMLDivElement,
  emitCb: () => void,
  highlightCb: () => void
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const currentDiv = getClosestDiv(range.startContainer, editorEl);
  if (!currentDiv) return;

  const fullText = (currentDiv.textContent ?? '');
  const caretOffset = getCaretOffsetInDiv(currentDiv);

  const beforeText = fullText.slice(0, caretOffset);
  const afterText = fullText.slice(caretOffset);

  const indentMatch = fullText.match(/^\t+/);
  let baseIndent = indentMatch ? indentMatch[0] : '';

  const trimmed = fullText.trim();
  const isLabelLine = trimmed.endsWith(':') && /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);
  if (isLabelLine) baseIndent += '\t';

  // Ajustamos la línea actual
  if (beforeText === '') {
    currentDiv.innerHTML = '<br>';
  } else {
    currentDiv.textContent = beforeText;
  }

  // Creamos la nueva línea
  const newDiv = document.createElement('div');
  const newContent = baseIndent + afterText;
  if (newContent === '') newDiv.innerHTML = '<br>';
  else newDiv.textContent = newContent;

  // Insertamos y posicionamos caret
  currentDiv.parentNode!.insertBefore(newDiv, currentDiv.nextSibling);

  const newRange = document.createRange();
  const firstChild = newDiv.firstChild;
  if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
    newRange.setStart(firstChild, baseIndent.length);
  } else {
    newRange.setStart(newDiv, 0);
  }
  newRange.collapse(true);

  sel.removeAllRanges();
  sel.addRange(newRange);

  try { newDiv.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch {}

  emitCb();
  highlightCb();
}
