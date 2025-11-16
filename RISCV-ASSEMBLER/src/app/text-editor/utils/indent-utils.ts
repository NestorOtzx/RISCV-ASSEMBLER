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

  let range = sel.getRangeAt(0);

  // Si hay selección (no collapsed), colocamos el caret al final de la selección
  // porque Enter suele actuar sobre la posición final.
  if (!sel.isCollapsed) {
    const tmp = range.cloneRange();
    tmp.collapse(false);
    range = tmp;
  }

  const currentDiv = getClosestDiv(range.startContainer, editorEl);
  if (!currentDiv) return;

  // calcular indent existente (acepta tabs o grupos de 4 espacios)
  const fullText = currentDiv.textContent ?? '';
  // detectar indent al inicio (sequence of tabs or groups of 4 spaces)
  const leadingMatch = fullText.match(/^((\t+)|(( \t)+))/);
  const leading = leadingMatch ? leadingMatch[0] : '';

  // si la línea es label (termina en ':') añadimos indent extra en la nueva línea
  const trimmed = fullText.trim();
  const isLabelLine =
    trimmed.endsWith(':') && /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);

  const extraIndent = isLabelLine ? (leading.startsWith('\t') ? '\t' : '\t') : '';

  // ----------------------------
  // Crear rango que extraiga TODO lo que queda a la derecha del caret dentro del div
  // ----------------------------
  const tailRange = document.createRange();
  try {
    tailRange.setStart(range.startContainer, range.startOffset);
    // setEnd after last child of currentDiv
    const last = currentDiv.lastChild;
    if (last) {
      tailRange.setEndAfter(last);
    } else {
      tailRange.setEnd(currentDiv, currentDiv.childNodes.length);
    }
  } catch (e) {
    // Fallback: si algo raro ocurre, usamos selectNodeContents y ajustar
    try {
      tailRange.selectNodeContents(currentDiv);
      tailRange.setStart(range.startContainer, range.startOffset);
    } catch {
      // no podemos continuar
      return;
    }
  }

  // Extraer el fragmento (esto REMUEVE los nodos extraídos del currentDiv)
  const extracted = tailRange.extractContents();

  // ----------------------------
  // Ajustar currentDiv si quedó vacío: asegurar <br>
  // ----------------------------
  if (!currentDiv.firstChild) {
    currentDiv.appendChild(document.createElement('br'));
  } else {
    // si el primer hijo ahora es <br> y hay más nada, ok. No tocar spans.
  }

  // ----------------------------
  // Crear nueva línea y colocar el fragmento
  // ----------------------------
  const newDiv = document.createElement('div');

  // Si necesitamos indent heredado, lo insertamos como textNode al inicio del fragmento.
  if (leading || extraIndent) {
    // si el fragmento comienza con un text node, prefijamos el indent ahí para evitar nodos separados
    const firstNode = extracted.firstChild;
    if (firstNode && firstNode.nodeType === Node.TEXT_NODE) {
      // modificar el content del primer text node del fragmento
      firstNode.textContent = (leading + extraIndent) + (firstNode.textContent ?? '');
      newDiv.appendChild(extracted);
    } else {
      // insertar un text node con indent y luego el fragmento
      newDiv.appendChild(document.createTextNode((leading + extraIndent)));
      newDiv.appendChild(extracted);
    }
  } else {
    newDiv.appendChild(extracted);
  }

  // asegurar que la nueva línea tenga <br> final (para mantener la misma estructura)
  if (!newDiv.lastChild || (newDiv.lastChild.nodeName !== 'BR')) {
    newDiv.appendChild(document.createElement('br'));
  }

  // Insertar la nueva div en el DOM
  currentDiv.parentNode!.insertBefore(newDiv, currentDiv.nextSibling);

  // ----------------------------
  // Posicionar caret: al inicio del contenido de newDiv después del indent
  // ----------------------------
  const selNew = window.getSelection();
  if (!selNew) return;
  selNew.removeAllRanges();

  // encontrar el primer text node y calcular offset igual a indent length
  function firstTextNodeOf(node: Node): Text | null {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    const t = walker.nextNode() as Text | null;
    return t;
  }

  const indentLen = (leading + extraIndent).length;
  const firstText = firstTextNodeOf(newDiv);

  const newRange = document.createRange();
  if (firstText) {
    // clamp offset
    const off = Math.min(indentLen, firstText.textContent?.length ?? 0);
    newRange.setStart(firstText, off);
  } else {
    // no hay text node, fallback a newDiv, child index 0
    newRange.setStart(newDiv, 0);
  }
  newRange.collapse(true);
  selNew.addRange(newRange);

  try { newDiv.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch {}

  // callbacks
  emitCb();
  highlightCb();
}
