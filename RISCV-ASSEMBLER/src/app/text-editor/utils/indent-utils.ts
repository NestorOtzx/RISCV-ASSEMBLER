import { getClosestDiv, getCaretOffsetInDiv } from './dom-utils';

export function handleNewLineIndent(
  editorEl: HTMLDivElement,
  emitCb: () => void,
  highlightCb: () => void
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  let range = sel.getRangeAt(0);

  if (!sel.isCollapsed) {
    const tmp = range.cloneRange();
    tmp.collapse(false);
    range = tmp;
  }

  const currentDiv = getClosestDiv(range.startContainer, editorEl);
  if (!currentDiv) return;

  const fullText = currentDiv.textContent ?? '';

  const leadingMatch = fullText.match(/^[\t ]*/);
  const leading = leadingMatch ? leadingMatch[0] : '';

  const trimmed = fullText.trim();
  const isLabelLine =
    trimmed.endsWith(':') && /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);

  const extraIndent = isLabelLine ? '\t' : '';

  const desiredPrefix = leading + extraIndent;

  const tailRange = document.createRange();
  try {
    tailRange.setStart(range.startContainer, range.startOffset);
    const last = currentDiv.lastChild;
    if (last) tailRange.setEndAfter(last);
  } catch {
    try {
      tailRange.selectNodeContents(currentDiv);
      tailRange.setStart(range.startContainer, range.startOffset);
    } catch {
      return;
    }
  }

  const extracted = tailRange.extractContents();
  const extractedText = extracted.textContent ?? '';

  const ensureLineHasBR = (div: HTMLDivElement) => {
    if (!div.firstChild) {
      div.appendChild(document.createElement('br'));
      return;
    }
    if (div.textContent === '') {
      div.innerHTML = '';
      div.appendChild(document.createElement('br'));
      return;
    }
    if (
      div.childNodes.length === 1 &&
      div.firstChild.nodeType === Node.TEXT_NODE &&
      div.firstChild.textContent === ''
    ) {
      div.innerHTML = '';
      div.appendChild(document.createElement('br'));
      return;
    }
  };
  ensureLineHasBR(currentDiv);

  const extractedLeadingMatch = extractedText.match(/^[\t ]*/);
  const extractedLeading = extractedLeadingMatch ? extractedLeadingMatch[0] : '';

  let presentLen = 0;
  while (
    presentLen < desiredPrefix.length &&
    presentLen < extractedLeading.length &&
    desiredPrefix[presentLen] === extractedLeading[presentLen]
  ) {
    presentLen++;
  }

  const toAdd = desiredPrefix.slice(presentLen);

  const newDiv = document.createElement('div');

  if (toAdd.length > 0) {
    const firstNode = extracted.firstChild;
    if (firstNode && firstNode.nodeType === Node.TEXT_NODE) {
      (firstNode as Text).textContent = toAdd + (firstNode.textContent ?? '');
      newDiv.appendChild(extracted);
    } else {
      newDiv.appendChild(document.createTextNode(toAdd));
      newDiv.appendChild(extracted);
    }
  } else {
    newDiv.appendChild(extracted);
  }

  if (!newDiv.lastChild || newDiv.lastChild.nodeName !== 'BR') {
    newDiv.appendChild(document.createElement('br'));
  }

  currentDiv.parentNode!.insertBefore(newDiv, currentDiv.nextSibling);

  const divsNow = Array.from(editorEl.querySelectorAll('div'));
  const targetLineIndex = divsNow.indexOf(newDiv);
  const targetCharOffset = desiredPrefix.length;

  emitCb();
  highlightCb();

  try {
    const divsAfter = Array.from(editorEl.querySelectorAll('div'));
    if (targetLineIndex < 0 || targetLineIndex >= divsAfter.length) return;
    const targetDiv = divsAfter[targetLineIndex] as HTMLDivElement;

    function findNodeForCharIndex(root: Node, charIndex: number) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      let acc = 0;
      while ((node = walker.nextNode())) {
        const len = node.textContent?.length ?? 0;
        if (acc + len >= charIndex) {
          return { node, offset: Math.max(0, charIndex - acc) };
        }
        acc += len;
      }
      const walker2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      const all: Node[] = [];
      let n2: Node | null;
      while ((n2 = walker2.nextNode())) all.push(n2);
      if (all.length > 0) {
        const last = all[all.length - 1];
        return { node: last, offset: (last.textContent ?? '').length };
      }
      return { node: root, offset: root.childNodes.length };
    }

    const { node, offset } = findNodeForCharIndex(targetDiv, targetCharOffset);

    const newRange = document.createRange();
    const nodeTextLen = (node.textContent ?? '').length;
    const clamped = Math.max(0, Math.min(offset, nodeTextLen));
    newRange.setStart(node as Node, clamped);
    newRange.collapse(true);

    const sel2 = window.getSelection();
    if (sel2) {
      sel2.removeAllRanges();
      sel2.addRange(newRange);
      try { editorEl.focus(); } catch {}
    }
  } catch {
  }
}
