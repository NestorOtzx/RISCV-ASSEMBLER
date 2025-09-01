import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';
import { ensureFirstLineWrapped, getClosestDiv, placeCaretAtEnd, fixEmptyDivs } from './utils/dom-utils';
import { extractContentAndLabels } from './utils/content-utils';
import { handleNewLineIndent } from './utils/indent-utils';
import { HistoryManager } from './utils/history-manager';
import { TooltipManager } from './utils/tooltip-manager';
import { copy, handlePaste, deleteAll, undo, redo } from './utils/editor-actions';



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

    editorEl.addEventListener('paste', async (event: ClipboardEvent) => {
      event.preventDefault();
      await this.paste();
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

  async copy() {
    await copy(this.editor.nativeElement);
  }

  async paste() {
    const text = await navigator.clipboard.readText();
    if (text) {
      handlePaste(
        this.editor.nativeElement,
        text,
        this.history,
        (t, labels) => {
          this.contentChange.emit(t);
          this.labelsChange.emit(labels);
        },
        () => this.highlightActiveLine()
      );
    }
  }

  delete() {
    deleteAll(
      this.editor.nativeElement,
      this.history,
      (t, labels) => {
        this.contentChange.emit(t);
        this.labelsChange.emit(labels);
      },
      () => this.highlightActiveLine()
    );
  }

  undo() {
    undo(this.history, (html) => this.restoreContent(html));
  }

  redo() {
    redo(this.history, (html) => this.restoreContent(html));
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
