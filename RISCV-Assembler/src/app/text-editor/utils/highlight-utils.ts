export interface Label {
  name: string;
  line: number;
}

export function highlightLabels(editorEl: HTMLElement, labels: Label[]) {
  console.log("tokens: highlight labels");
  // --- guardar posición del cursor ---
  const selection = window.getSelection();
  let caretInfo: { divIndex: number; offset: number } | null = null;
  try {
    if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const caretDiv = getClosestDivInEditor(range.endContainer, editorEl);
      if (caretDiv) {
        const divs = Array.from(editorEl.querySelectorAll("div"));
        const idx = divs.indexOf(caretDiv);
        if (idx >= 0) {
          const preRange = range.cloneRange();
          preRange.selectNodeContents(caretDiv);
          preRange.setEnd(range.endContainer, range.endOffset);
          caretInfo = { divIndex: idx, offset: preRange.toString().length };
        }
      }
    }
  } catch {
    caretInfo = null;
  }

  // --- limpiar labels previos ---
  editorEl.querySelectorAll("div").forEach(div => {
    div.classList.remove("has-label");
  });

  // --- aplicar labels ---
  labels.forEach(label => {
    const div = editorEl.querySelectorAll("div")[label.line - 1];
    if (!div) return;
    const raw = div.textContent ?? "";
    if (raw.trim().startsWith(label.name + ":")) {
      div.classList.add("has-label");
    }
  });

  // --- procesar cada línea ---
  Array.from(editorEl.querySelectorAll("div")).forEach(div => {
    const text = div.textContent ?? "";
    const leadingWsMatch = text.match(/^\s*/); // espacios/tabs al inicio
    const leading = leadingWsMatch ? leadingWsMatch[0] : "";
    const trimmed = text.slice(leading.length);

    const tokens = trimmed.split(/\s+/);
    console.log("tokens:",tokens);

    if (tokens.length >= 2 && tokens[0]) {
      const instr = tokens[0];
      const rest = trimmed.slice(instr.length);

      // si ya está resaltada, no volver a hacerlo
      const span = div.querySelector("span");
      if (span && span.textContent === instr) return;

      const instrSpan = document.createElement("span");
      instrSpan.className = "instr";
      instrSpan.textContent = instr;

      div.innerHTML = "";
      div.append(document.createTextNode(leading));
      div.append(instrSpan);
      div.append(document.createTextNode(rest));
    } else {
      // limpiar cualquier span y dejar la línea tal cual
      if (div.querySelector("span")) {
        div.textContent = text;
      }
    }
  });

  // --- restaurar cursor ---
  if (caretInfo) {
    try {
      const newDiv = editorEl.querySelectorAll("div")[caretInfo.divIndex] as HTMLDivElement | undefined;
      if (newDiv) {
        const { node, offset } = findNodeForOffset(newDiv, caretInfo.offset);
        const newRange = document.createRange();
        newRange.setStart(node, Math.min(offset, (node.textContent ?? "").length));
        newRange.collapse(true);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    } catch {
      /* ignore */
    }
  }
}

// --- helpers ---
function getClosestDivInEditor(node: Node, editorEl: HTMLElement): HTMLDivElement | null {
  let n: Node | null = node;
  while (n && n !== editorEl) {
    if (n instanceof HTMLDivElement) return n;
    n = n.parentNode;
  }
  return null;
}

function findNodeForOffset(root: Node, offset: number): { node: Node; offset: number } {
  let currentOffset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let textNode: Node | null;
  while ((textNode = walker.nextNode())) {
    const len = textNode.textContent?.length ?? 0;
    if (currentOffset + len >= offset) {
      return { node: textNode, offset: offset - currentOffset };
    }
    currentOffset += len;
  }
  return { node: root, offset: root.textContent?.length ?? 0 };
}
