import { getClosestDiv, getCaretOffsetInDiv } from './dom-utils';

// realiza la lógica de crear nueva línea con indent heredado y sin duplicar tabs/spans.
// restaura el caret DESPUÉS de emitCb/highlightCb aunque reescriban el DOM.
export function handleNewLineIndent(
  editorEl: HTMLDivElement,
  emitCb: () => void,
  highlightCb: () => void
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  let range = sel.getRangeAt(0);

  // Si hay selección (no collapsed), colocamos el caret al final de la selección
  if (!sel.isCollapsed) {
    const tmp = range.cloneRange();
    tmp.collapse(false);
    range = tmp;
  }

  const currentDiv = getClosestDiv(range.startContainer, editorEl);
  if (!currentDiv) return;

  // ------------------------------------
  // CALCULAR INDENTACIÓN
  // ------------------------------------
  const fullText = currentDiv.textContent ?? '';

  // detectar indent real (tabs o espacios)
  // mantenemos cualquier combinación de tabs o espacios al inicio
  const leadingMatch = fullText.match(/^[\t ]*/);
  const leading = leadingMatch ? leadingMatch[0] : '';

  const trimmed = fullText.trim();
  const isLabelLine =
    trimmed.endsWith(':') && /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);

  const extraIndent = isLabelLine ? '\t' : '';

  // desiredPrefix es lo que queremos que inicie la nueva línea
  const desiredPrefix = leading + extraIndent;

  // ------------------------------------
  // EXTRAER TAIL A LA DERECHA DEL CARET
  // ------------------------------------
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

  // ------------------------------------
  // NORMALIZAR currentDiv si quedó sin contenido textual
  // (esto evita <div></div> que generan bugs)
  // ------------------------------------
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

  // ------------------------------------
  // DETERMINAR qué parte de desiredPrefix YA VIENE en extracted
  // (comparamos sólo prefijo de whitespace del fragmento extraído,
  // y no confundimos letras con whitespace)
  // ------------------------------------
  const extractedLeadingMatch = extractedText.match(/^[\t ]*/);
  const extractedLeading = extractedLeadingMatch ? extractedLeadingMatch[0] : '';

  // calcular el prefijo común (carácter a carácter) entre desiredPrefix y extractedLeading
  let presentLen = 0;
  while (
    presentLen < desiredPrefix.length &&
    presentLen < extractedLeading.length &&
    desiredPrefix[presentLen] === extractedLeading[presentLen]
  ) {
    presentLen++;
  }

  // toAdd es la porción de desiredPrefix que NO está presente al inicio del fragmento extraído
  const toAdd = desiredPrefix.slice(presentLen);

  // ------------------------------------
  // CREAR LA NUEVA LÍNEA: anteponer sólo 'toAdd' si hace falta
  // ------------------------------------
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
    // el fragmento ya incluye el prefijo deseado (o no necesita prefijo)
    newDiv.appendChild(extracted);
  }

  // asegurar <br> final en nueva línea
  if (!newDiv.lastChild || newDiv.lastChild.nodeName !== 'BR') {
    newDiv.appendChild(document.createElement('br'));
  }

  // Insertar después de currentDiv
  currentDiv.parentNode!.insertBefore(newDiv, currentDiv.nextSibling);

  // ------------------------------------
  // OBJETIVO DE CARET: caracter dentro de la nueva línea
  // queremos el caret justo después de desiredPrefix (longitud completa),
  // porque aunque parte del prefijo venga dentro del fragmento, el
  // usuario espera el caret después del indent completo.
  // ------------------------------------
  const divsNow = Array.from(editorEl.querySelectorAll('div'));
  const targetLineIndex = divsNow.indexOf(newDiv);
  const targetCharOffset = desiredPrefix.length;

  // --- llamar al resaltador que puede reescribir DOM ---
  emitCb();
  highlightCb();

  // ------------------------------------
  // RESTAURAR CARET buscando por índice de carácter dentro del DIV resultante
  // ------------------------------------
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
      // fallback: si no hay text nodes, o index fuera del total -> usar último text node o root
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
    // no romper si falla la restauración
  }
}
