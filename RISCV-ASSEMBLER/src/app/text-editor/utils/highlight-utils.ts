import { 
  rInstructions, 
  iInstructions, 
  sInstructions, 
  bInstructions, 
  jInstructions, 
  uInstructions, 
  specialIInstructions 
} from "../../assembler/instruction-tables";

const allInstructions: Record<string, string> = {};

function loadInstructions() {
  Object.keys(rInstructions).forEach(k => allInstructions[k] = "r");
  Object.keys(iInstructions).forEach(k => allInstructions[k] = "i");
  Object.keys(sInstructions).forEach(k => allInstructions[k] = "s");
  Object.keys(bInstructions).forEach(k => allInstructions[k] = "b");
  Object.keys(jInstructions).forEach(k => allInstructions[k] = "j");
  Object.keys(uInstructions).forEach(k => allInstructions[k] = "u");
  Object.keys(specialIInstructions).forEach(k => allInstructions[k] = "special");
}

loadInstructions();


export interface Label {
  name: string;
  line: number;
}

export function highlightRiscV(editorEl: HTMLElement, labels: Label[]) {
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

  editorEl.querySelectorAll("div").forEach(div => {
    div.classList.remove("has-label");
  });

  labels.forEach(label => {
    const div = editorEl.querySelectorAll("div")[label.line - 1];
    if (!div) return;
    const raw = div.textContent ?? "";
    if (raw.trim().startsWith(label.name + ":")) {
      div.classList.add("has-label");
    }
  });

  Array.from(editorEl.querySelectorAll("div")).forEach(div => {
    applyHighlightToDiv(div);
  });

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
    } catch {}
  }
}

function applyHighlightToDiv(div: HTMLDivElement) {
  const fullText = div.textContent ?? "";

  const leadingMatch = fullText.match(/^\s*/)?.[0] ?? "";
  const trimmed = fullText.slice(leadingMatch.length);

  if (trimmed.length === 0) {
    const span = div.querySelector("span");
    if (span) span.remove();
    return;
  }

  const tokens = trimmed.split(/\s+/);
  const instr = tokens[0];
  const instrType = allInstructions[instr];

  const nodes = Array.from(div.childNodes);

  let textNode = nodes.find(n => n.nodeType === Node.TEXT_NODE) as Text | null;
  if (!textNode) {
    textNode = document.createTextNode(fullText);
    div.insertBefore(textNode, div.firstChild);
  }

  let rest = trimmed.slice(instr.length);

  if (!instrType) {
    const span = div.querySelector("span");
    if (span) span.remove();
    textNode.textContent = fullText; 
    return;
  }

  textNode.textContent = leadingMatch;

  let span = div.querySelector("span");
  if (!span) {
    span = document.createElement("span");
    textNode.after(span);
  }

  span.className = `instr-${instrType}`;
  span.textContent = instr;

  let restNode = span.nextSibling;
  if (!restNode || restNode.nodeType !== Node.TEXT_NODE) {
    restNode = document.createTextNode(rest);
    span.after(restNode);
  } else {
    restNode.textContent = rest;
  }
}


export function highlightText(editorEl: HTMLElement, labels: Label[], textFormat: 'riscv' | 'binary' | 'hexadecimal' | 'text') {
  if (textFormat == "text"){
    
  }else if (textFormat == "binary"){

  }else if (textFormat == "hexadecimal")
  {
  }
  else{
    highlightRiscV(editorEl, labels)
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
