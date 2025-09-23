// utilities DOM reutilizables
export function getClosestDiv(node: Node | null, editorEl: HTMLElement): HTMLDivElement | null {
  while (node && node !== editorEl) {
    if ((node as HTMLElement).nodeName === 'DIV') return node as HTMLDivElement;
    node = node.parentNode as Node | null;
  }
  return null;
}

export function ensureFirstLineWrapped(editorEl: HTMLElement) {
  if (editorEl.childNodes.length === 0) {
    const div = document.createElement('div');
    div.classList.add('unactive-line');
    div.innerHTML = '<br>';
    editorEl.appendChild(div);
    return;
  }
  const first = editorEl.firstChild!;
  if (first.nodeName !== 'DIV') {
    const div = document.createElement('div');
    const text = first.textContent || '';
    if (text === '') div.innerHTML = '<br>';
    else div.textContent = text;
    editorEl.insertBefore(div, first);
    editorEl.removeChild(first);
  }
}

export function placeCaretAtEnd(el: HTMLElement) {
  el.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;

  let last = el.lastChild;
  if (!last) {
    range.setStart(el, 0);
  } else if (last.nodeType === Node.TEXT_NODE) {
    range.setStart(last, (last as Text).length);
  } else {
    if (last.lastChild && last.lastChild.nodeType === Node.TEXT_NODE) {
      range.setStart(last.lastChild, (last.lastChild as Text).length);
    } else {
      range.setStart(last, last.childNodes.length);
    }
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function getCaretOffsetInDiv(div: HTMLDivElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(div);
  try {
    preRange.setEnd(range.endContainer, range.endOffset);
  } catch {
    // en casos extremos la setEnd puede fallar; devolvemos 0
    return 0;
  }
  return preRange.toString().length;
}

export function fixEmptyDivs(editorEl: HTMLElement) {
  editorEl.querySelectorAll('div').forEach((d) => {
    if ((d as HTMLElement).innerHTML.trim() === '') (d as HTMLElement).innerHTML = '<br>';
  });
}
