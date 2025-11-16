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

// utils/dom-utils.ts (reemplaza/añade estas funciones)

export function getLineAndOffset(root: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  const divs = Array.from(root.querySelectorAll('div'));
  const startDiv = getClosestDiv(range.startContainer, root);
  const endDiv = getClosestDiv(range.endContainer, root);
  if (!startDiv || !endDiv) return null;

  // calcula índice de carácter relativo al inicio de la div
  function charOffsetInDiv(div: HTMLElement, container: Node, containerOffset: number) {
    let index = 0;
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node === container) {
        // el range.startOffset en un textNode es offset en ese textNode
        return index + containerOffset;
      }
      index += node.textContent?.length ?? 0;
    }

    // si el container no es un text node (p.ej. el propio div), tratamos de mapearlo:
    // sumar longitud de todos los text nodes previos y usar containerOffset como child index
    // (fallback: devolver total acumulado)
    return index;
  }

  const startChar = charOffsetInDiv(startDiv, range.startContainer, range.startOffset);
  const endChar = charOffsetInDiv(endDiv, range.endContainer, range.endOffset);

  return {
    divs,
    startLine: divs.indexOf(startDiv),
    endLine: divs.indexOf(endDiv),
    startChar,
    endChar,
    // guardamos los textos originales para poder calcular ajustes al restaurar
    startLineText: startDiv.textContent ?? '',
    endLineText: endDiv.textContent ?? '',
    isCollapsed: sel.isCollapsed
  };
}

export function restoreSelection(root: HTMLElement, info: any) {
  if (!info) return;
  const sel = window.getSelection();
  if (!sel) return;

  const range = document.createRange();
  const startDiv = info.divs[info.startLine];
  const endDiv = info.divs[info.endLine];
  if (!startDiv || !endDiv) return;

  // textos actuales
  const newStartText = startDiv.textContent ?? '';
  const newEndText = endDiv.textContent ?? '';

  // diferencias en longitud (p. ej. +1 si añadimos un '\t' al inicio)
  const startDiff = newStartText.length - (info.startLineText?.length ?? 0);
  const endDiff = newEndText.length - (info.endLineText?.length ?? 0);

  // nuevos índices de carácter (clamp entre 0..length)
  const newStartChar = Math.max(0, Math.min(newStartText.length, info.startChar + startDiff));
  const newEndChar = Math.max(0, Math.min(newEndText.length, info.endChar + endDiff));

  // encuentra el text node y offset dentro de la div para un índice de carácter dado
  function nodeAtCharIndex(div: HTMLElement, charIndex: number) {
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
    let node: Text | null;
    let acc = 0;
    while ((node = walker.nextNode() as Text | null)) {
      const len = node.textContent?.length ?? 0;
      if (acc + len >= charIndex) {
        return { node, offset: Math.max(0, charIndex - acc) };
      }
      acc += len;
    }
    // si llegamos al final, intenta devolver el último text node
    const last = Array.from(div.childNodes).reverse().find(n => n.nodeType === Node.TEXT_NODE) as Text | undefined;
    if (last) return { node: last, offset: last.textContent?.length ?? 0 };
    // fallback: devolver el elemento div y offset 0 (range.setStart aceptará elemento+childIndex)
    return { node: div, offset: 0 };
  }

  const startTarget = nodeAtCharIndex(startDiv, newStartChar);
  const endTarget = nodeAtCharIndex(endDiv, newEndChar);

  try {
    range.setStart(startTarget.node as Node, startTarget.offset);
    range.setEnd(endTarget.node as Node, endTarget.offset);
  } catch (e) {
    // fallback robusto si algo raro sucede
    range.selectNodeContents(startDiv);
    range.collapse(false);
  }

  sel.removeAllRanges();
  sel.addRange(range);
}
