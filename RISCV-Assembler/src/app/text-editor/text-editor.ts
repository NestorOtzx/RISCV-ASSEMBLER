import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';
import { ensureFirstLineWrapped, getClosestDiv, placeCaretAtEnd, fixEmptyDivs } from './utils/dom-utils';
import { extractContentAndLabels } from './utils/content-utils';
import { handleNewLineIndent } from './utils/indent-utils';
import { HistoryManager } from './utils/history-manager';
import { TooltipManager } from './utils/tooltip-manager';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.css']
})
export class TextEditor implements AfterViewInit {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;
  @Output() contentChange = new EventEmitter<string>();
  @Output() labelsChange = new EventEmitter<{ name: string, line: number }[]>();
  @Input() lines: string[] = ['1'];

  private history = new HistoryManager(200);
  private tooltip!: TooltipManager;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    const editorEl = this.editor.nativeElement;
    ensureFirstLineWrapped(editorEl);
    this.history.init(editorEl.innerHTML);

    this.tooltip = new TooltipManager();

    editorEl.addEventListener('paste', (event: ClipboardEvent) => {
      event.preventDefault();
      const plainText = event.clipboardData?.getData('text/plain') || '';
      this.handlePaste(plainText);
    });


    // mousemove/leave para tooltip
    editorEl.addEventListener('mousemove', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && target.classList.contains('wrong-line') && target.dataset['error']) {
        this.tooltip.show(target.dataset['error']!, e.clientX + 12, e.clientY + 12);
      } else {
        this.tooltip.hide();
      }
    });
    editorEl.addEventListener('mouseleave', () => this.tooltip.hide());

    // input
    editorEl.addEventListener('input', () => {
      ensureFirstLineWrapped(editorEl);
      fixEmptyDivs(editorEl);
      const { text, labels } = extractContentAndLabels(editorEl);
      this.contentChange.emit(text);
      this.labelsChange.emit(labels);
      this.highlightActiveLine();
      this.history.push(editorEl.innerHTML);
    });

    // paste: puedes reutilizar tu lógica original (omitida aquí por brevedad),
    // al final haz emit + highlight + history.push(...).
    // Keydown: tab, enter, undo/redo
    editorEl.addEventListener('keydown', (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? event.metaKey : event.ctrlKey;

      if (mod && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        const prev = this.history.undo();
        if (prev !== undefined) this.restoreContent(prev);
        return;
      }
      if ((mod && event.key.toLowerCase() === 'y') || (mod && event.shiftKey && event.key.toLowerCase() === 'z')) {
        event.preventDefault();
        const next = this.history.redo();
        if (next !== undefined) this.restoreContent(next);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        this.insertTextAtCursor('\t');
        this.history.push(this.editor.nativeElement.innerHTML);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleNewLineIndent(this.editor.nativeElement, () => {
          const { text, labels } = extractContentAndLabels(this.editor.nativeElement);
          this.contentChange.emit(text);
          this.labelsChange.emit(labels);
        }, () => this.highlightActiveLine());
        this.history.push(this.editor.nativeElement.innerHTML);
        return;
      }
    });

    // mouse/keyboard selection updates
    editorEl.addEventListener('keyup', () => this.highlightActiveLine());
    editorEl.addEventListener('mouseup', () => this.highlightActiveLine());
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (sel && editorEl.contains(sel.anchorNode)) this.highlightActiveLine();
    });
  }

  private handlePaste(text: string) {
  const editorEl = this.editor.nativeElement;
  const prevHTML = editorEl.innerHTML;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  // 🔹 Asegurar que se elimina la selección completa (divs enteros incluidos)
  let startDiv = getClosestDiv(range.startContainer, editorEl);
  let endDiv = getClosestDiv(range.endContainer, editorEl);

  if (!startDiv) {
    startDiv = document.createElement('div');
    startDiv.innerHTML = '<br>';
    editorEl.appendChild(startDiv);
  }

  if (!endDiv) endDiv = startDiv;

  const afterText = endDiv.textContent?.slice(range.endOffset) || '';
  const beforeText = startDiv.textContent?.slice(0, range.startOffset) || '';

  // 🔹 Eliminar todos los divs que están completamente seleccionados
  const divs = Array.from(editorEl.querySelectorAll('div'));
  const startIndex = divs.indexOf(startDiv);
  const endIndex = divs.indexOf(endDiv);

  for (let i = startIndex; i <= endIndex; i++) {
    editorEl.removeChild(divs[i]);
  }

  // 🔹 Crear un nuevo div "limpio" donde insertar el pegado
  let currentDiv = document.createElement('div');
  editorEl.insertBefore(currentDiv, divs[endIndex + 1] || null);

  const pasteLines = text.split(/\r?\n/);

  // Primera línea = beforeText + primera línea pegada
  const firstLine = beforeText + (pasteLines[0] ?? '');
  currentDiv.textContent = firstLine === '' ? '' : firstLine;

  let lastInserted = currentDiv;

  // Insertar las siguientes líneas
  for (let i = 1; i < pasteLines.length; i++) {
    const newDiv = document.createElement('div');
    newDiv.textContent = pasteLines[i] ?? '';
    editorEl.insertBefore(newDiv, lastInserted.nextSibling);
    lastInserted = newDiv;
  }

  // Agregar el afterText al último div
  if (afterText) {
    lastInserted.textContent = (lastInserted.textContent || '') + afterText;
  }

  // Restaurar caret al final de lo pegado
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

  // 🔹 Emitir solo si cambió realmente
  if (editorEl.innerHTML !== prevHTML) {
    const { text: cleaned, labels } = extractContentAndLabels(editorEl);
    this.contentChange.emit(cleaned);
    this.labelsChange.emit(labels);
    this.history.push(editorEl.innerHTML);
    this.highlightActiveLine();
  }
}




  // botón paste()
  async paste() {
    const text = await navigator.clipboard.readText();
    if (text) this.handlePaste(text);
  }


  private restoreContent(html: string) {
    this.editor.nativeElement.innerHTML = html;
    ensureFirstLineWrapped(this.editor.nativeElement);
    fixEmptyDivs(this.editor.nativeElement);
    const { text, labels } = extractContentAndLabels(this.editor.nativeElement);
    this.contentChange.emit(text);
    this.labelsChange.emit(labels);
    placeCaretAtEnd(this.editor.nativeElement);
    this.highlightActiveLine();
  }

  async copy() {
    const editorEl = this.editor.nativeElement;

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


  private insertTextAtCursor(text: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  delete() {
    const editorEl = this.editor.nativeElement;

    // 🔹 dejamos solo un <div><br></div> para que nunca esté vacío del todo
    editorEl.innerHTML = '<div><br></div>';

    const { text, labels } = extractContentAndLabels(editorEl);
    this.contentChange.emit(text);
    this.labelsChange.emit(labels);

    this.history.push(editorEl.innerHTML);
    placeCaretAtEnd(editorEl);
    this.highlightActiveLine();
  }

  redo() {
    const next = this.history.redo();
    if (next !== undefined) this.restoreContent(next);
  }

  undo() {
    const prev = this.history.undo();
    if (prev !== undefined) this.restoreContent(prev);
  }

  // aplica clases active/unactive
  private highlightActiveLine() {
    const selection = window.getSelection();
    if (!selection) return;
    const targetNode = selection.isCollapsed ? selection.anchorNode : selection.focusNode;
    if (!targetNode) return;
    const lineDiv = getClosestDiv(targetNode, this.editor.nativeElement);
    if (!lineDiv) return;
    const editorEl = this.editor.nativeElement;
    editorEl.querySelectorAll('div').forEach(div => {
      div.classList.remove('active-line', 'unactive-line');
      if (div === lineDiv) div.classList.add('active-line');
      else div.classList.add('unactive-line');
    });
  }

  markLineAsWrong(lineNumber: number, errorMessage?: string) {
    const editorEl = this.editor.nativeElement;
    const divs = editorEl.querySelectorAll('div');
    if (lineNumber < 1 || lineNumber > divs.length) return;
    const targetDiv = divs[lineNumber - 1] as HTMLDivElement;
    targetDiv.classList.add('wrong-line');
    if (errorMessage) targetDiv.dataset['error'] = errorMessage;
  }

  clearWrongMark(lineNumber: number) {
    const editorEl = this.editor.nativeElement;
    const divs = editorEl.querySelectorAll('div');
    if (lineNumber < 1 || lineNumber > divs.length) return;
    const targetDiv = divs[lineNumber - 1] as HTMLDivElement;
    targetDiv.classList.remove('wrong-line');
    delete targetDiv.dataset['error'];
  }

  setContent(text: string) {
    const editorEl = this.editor.nativeElement;
    editorEl.innerHTML = '';
    text.split(/\r?\n/).forEach(line => {
      const div = document.createElement('div');
      if (line === '') div.innerHTML = '<br>';
      else div.textContent = line;
      editorEl.appendChild(div);
    });
    const { text: cleaned, labels } = extractContentAndLabels(editorEl);
    this.contentChange.emit(cleaned);
    this.labelsChange.emit(labels);
    this.history.push(editorEl.innerHTML);
    placeCaretAtEnd(editorEl);
    this.highlightActiveLine();
  }
}
