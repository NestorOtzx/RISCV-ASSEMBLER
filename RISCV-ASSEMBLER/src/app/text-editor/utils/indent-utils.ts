import { getClosestDiv, getCaretOffsetInDiv } from './dom-utils';

// realiza la lógica de crear nueva línea con indent heredado y sin duplicar spans.
// garantiza restauración del caret DESPUÉS de emitCb/highlightCb aunque reescriban el DOM.
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
  const leadingMatch = fullText.match(/^\s+/);
  const leading = leadingMatch ? leadingMatch[0] : '';

  const trimmed = fullText.trim();
  const isLabelLine =
    trimmed.endsWith(':') && /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);

  const extraIndent = isLabelLine ? '\t' : '';

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

  // ------------------------------------
  // FIX: Asegurar que la línea actual nunca quede vacía
  // Versión robusta: si textContent EXACTAMENTE es '', normalizamos a <br>.
  // ------------------------------------
  const ensureLineHasBR = (div: HTMLDivElement) => {
    // Si no hay hijos, insertar <br>
    if (!div.firstChild) {
      div.appendChild(document.createElement('br'));
      return;
    }

    // Si tras extraer el contenido la línea NO tiene contenido textual real,
    // es decir textContent es exactamente la cadena vacía, la normalizamos a <br>.
    // Esto captura spans vacíos, text nodes vacíos, comentarios, etc.
    if (div.textContent === '') {
      div.innerHTML = '';
      div.appendChild(document.createElement('br'));
      return;
    }

    // Si el primer child es un textNode vacío (caso puntual), reemplazarlo por <br>
    if (
      div.childNodes.length === 1 &&
      div.firstChild.nodeType === Node.TEXT_NODE &&
      div.firstChild.textContent === ''
    ) {
      div.innerHTML = '';
      div.appendChild(document.createElement('br'));
      return;
    }

    // Dejar el resto intacto (línea con contenido real — texto o spans con texto)
  };

  ensureLineHasBR(currentDiv);

  // ------------------------------------
  // CREAR LA NUEVA LÍNEA
  // ------------------------------------
  const newDiv = document.createElement('div');

  const indentText = leading + extraIndent;
  const firstExtractedNode = extracted.firstChild;

  if (indentText.length > 0) {
    if (firstExtractedNode && firstExtractedNode.nodeType === Node.TEXT_NODE) {
      firstExtractedNode.textContent = indentText + (firstExtractedNode.textContent ?? '');
      newDiv.appendChild(extracted);
    } else {
      newDiv.appendChild(document.createTextNode(indentText));
      newDiv.appendChild(extracted);
    }
  } else {
    newDiv.appendChild(extracted);
  }

  // FIX: garantizar <br> en la nueva línea
  if (!newDiv.lastChild || newDiv.lastChild.nodeName !== 'BR') {
    newDiv.appendChild(document.createElement('br'));
  }

  // Insertar en el DOM
  currentDiv.parentNode!.insertBefore(newDiv, currentDiv.nextSibling);

  // -------------------------
  // CALCULAR OBJETIVO DE CARET (antes de llamar al resaltador)
  // -------------------------
  const divsNow = Array.from(editorEl.querySelectorAll('div'));
  const targetLineIndex = divsNow.indexOf(newDiv);
  const targetCharOffset = indentText.length; // queremos el caret justo después del indent

  // --- llamar al resaltador que puede reescribir DOM ---
  emitCb();
  highlightCb();

  // -------------------------
  // RESTAURAR CARET buscando por índice de carácter dentro del DIV resultante
  // -------------------------
  try {
    const divsAfter = Array.from(editorEl.querySelectorAll('div'));
    if (targetLineIndex < 0 || targetLineIndex >= divsAfter.length) return;
    const targetDiv = divsAfter[targetLineIndex] as HTMLDivElement;

    // función que encuentra el textNode y offset para un índice de caracteres
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
      // asegurar foco en el editor para que el caret sea visible
      try { editorEl.focus(); } catch {}
    }
  } catch {
    // si falla, no rompemos nada
  }
}
