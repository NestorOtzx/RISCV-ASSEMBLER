import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';
import { ensureFirstLineWrapped, getClosestDiv, placeCaretAtEnd, fixEmptyDivs } from './utils/dom-utils';
import { extractContentAndLabels } from './utils/content-utils';
import { handleNewLineIndent } from './utils/indent-utils';
import { HistoryManager } from './utils/history-manager';
import { TooltipManager } from './utils/tooltip-manager';
import { highlightText } from './utils/highlight-utils';
import { copy, handlePaste, deleteAll, undo, redo } from './utils/editor-actions';
import { isValidRISCVInstruction } from '../assembler/utils';



@Component({
  selector: 'app-text-editor',
  standalone: true,
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.css']
})
export class TextEditor implements AfterViewInit {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;
  
  private _lineIndexing: 'numbers' | 'direction' = 'numbers';
  private _textFormat: 'riscv' | 'binary' | 'hexadecimal' | 'text' = 'text';

  @Input()
  set lineIndexing(value: 'numbers' | 'direction') {
    this._lineIndexing = value;
    // recalcula los números de línea con la nueva forma
    const { text } = extractContentAndLabels(this.editor.nativeElement);
    this.updateLineCounter(text);
  }
  @Input()
  set textFormat(value: 'riscv' | 'binary' | 'hexadecimal' | 'text') {
    this._textFormat = value;
    // recalcula inmediatamente cuando cambia
    if (this.editor) {
      const { text } = extractContentAndLabels(this.editor.nativeElement);
      this.updateLineCounter(text);
    }
  }

  @Input() editable: boolean = true;

  @Output() contentChange = new EventEmitter<string>();
  @Output() activeLineChange = new EventEmitter<number>();

  lineCounter: string[] = [this.getLineIndex(1)];

  private history = new HistoryManager(200);
  private tooltip!: TooltipManager;

  constructor(private elementRef: ElementRef) {}

  get lineIndexing(): 'numbers' | 'direction' {
    return this._lineIndexing;
  }

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
      this.emit(text, labels);
      this.highlightActiveLine();
      this.history.push(editorEl.innerHTML);
    });

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
        const { text, labels } = extractContentAndLabels(editorEl);
        this.history.push(this.editor.nativeElement.innerHTML);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleNewLineIndent(this.editor.nativeElement, () => {
          const { text, labels } = extractContentAndLabels(this.editor.nativeElement);
          this.emit(text, labels);
        }, () => this.highlightActiveLine());
        const { text, labels } = extractContentAndLabels(editorEl);
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

  getLineIndex(lineNumber: number): string {
    if (this.lineIndexing === 'direction') {
      const address = (0x0000 + lineNumber * 4).toString(16).toUpperCase();
      return '0x' + address.padStart(4, '0');
    }
    return lineNumber.toString();
  }


  async copy() {
    await copy(this.editor.nativeElement);
  }

  async paste() {
    if (!this.editable) return;
    const text = await navigator.clipboard.readText();
    if (text) {
      handlePaste(
        this.editor.nativeElement,
        text,
        this.history,
        (t, labels) => {
          this.emit(t, labels);
        },
        () => this.highlightActiveLine()
      );
    }
  }

  delete() {
    if (!this.editable) return;
    deleteAll(
      this.editor.nativeElement,
      this.history,
      (t, labels) => {
        this.emit(t, labels);
      },
      () => this.highlightActiveLine()
    );
  }

  undo() {
    if (!this.editable) return;
    undo(this.history, (html) => this.restoreContent(html));
  }

  redo() {
    if (!this.editable) return;
    redo(this.history, (html) => this.restoreContent(html));
  }


  private restoreContent(html: string) {
    if (!this.editable) return;
    this.editor.nativeElement.innerHTML = html;
    ensureFirstLineWrapped(this.editor.nativeElement);
    fixEmptyDivs(this.editor.nativeElement);
    const { text, labels } = extractContentAndLabels(this.editor.nativeElement);
    this.emit(text, labels);
    placeCaretAtEnd(this.editor.nativeElement);
    this.highlightActiveLine();
  }


  private insertTextAtCursor(text: string) {
    if (!this.editable) return;
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

  private highlightActiveLine() {
    const selection = window.getSelection();
    if (!selection) return;
    const targetNode = selection.isCollapsed ? selection.anchorNode : selection.focusNode;
    if (!targetNode) return;
    const lineDiv = getClosestDiv(targetNode, this.editor.nativeElement);
    if (!lineDiv) return;

    const editorEl = this.editor.nativeElement;
    const divs = Array.from(editorEl.querySelectorAll('div'));

    divs.forEach(div => {
      div.classList.remove('active-line', 'unactive-line');
      if (div === lineDiv) div.classList.add('active-line');
      else div.classList.add('unactive-line');
    });

    const activeIndex = divs.indexOf(lineDiv);
    if (activeIndex !== -1) {
      this.activeLineChange.emit(activeIndex); 
    }
  }

  public setActiveLineByIndex(lineIndex: number) {
    const editorEl = this.editor.nativeElement;
    const divs = Array.from(editorEl.querySelectorAll('div'));

    // Si no hay líneas o el índice no existe → limpiar todas las clases
    if (lineIndex < 0 || lineIndex >= divs.length) {
      divs.forEach(div => {
        div.classList.remove('active-line', 'unactive-line');
        div.classList.add('unactive-line');
      });
      return;
    }

    const lineDiv = divs[lineIndex];

    divs.forEach(div => {
      div.classList.remove('active-line', 'unactive-line');
      if (div === lineDiv) {
        div.classList.add('active-line');
      } else {
        div.classList.add('unactive-line');
      }
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
    if (this.editable)
    {
      console.log("Set content ");
    }
    const editorEl = this.editor.nativeElement;
    editorEl.innerHTML = '';
    text.split(/\r?\n/).forEach(line => {
      const div = document.createElement('div');
      div.classList.add('unactive-line');
      if (line === '') div.innerHTML = '<br>';
      else div.textContent = line;
      editorEl.appendChild(div);
    });
    const { text: cleaned, labels } = extractContentAndLabels(editorEl);
    this.emit(cleaned, labels);
    (labels);
    this.history.push(editorEl.innerHTML);
    
    this.highlightActiveLine();
    if (!this.editable) { return; }
    placeCaretAtEnd(editorEl);
  }

  emit(textin:string, labelsin:{name:string,line:number}[])
  {
    
    this.contentChange.emit(textin);
    const { text, labels } = extractContentAndLabels(this.editor.nativeElement);
    this.updateLineCounter(text);
    highlightText(this.editor.nativeElement, labels);
  }

  private updateLineCounter(text: string) {
    const rawLines = text.split('\n');
    const result: string[] = [];
    if (this.editable)
    {
      console.log("update line counter!"+this._textFormat + text);
    }
    let lineNumber = 1;
    for (const raw of rawLines) {
      const clean = raw.trim();
      if (this._textFormat == "text"){
        result.push(this.getLineIndex(lineNumber));
        lineNumber++;
      }else if (this._textFormat == "binary")
      {
        //todo: check if valid binary line
        result.push(this.getLineIndex(lineNumber));
        lineNumber++;
      }else if (this._textFormat == "hexadecimal")
      {
        //todo: check if valid hexadecimal line
        result.push(this.getLineIndex(lineNumber));
        lineNumber++;
      }else{
        if (clean.length > 0 && isValidRISCVInstruction(clean)) {
          result.push(this.getLineIndex(lineNumber));
          lineNumber++;
        } else {
          result.push('\u00A0'); // espacio si no es válida
        }
      }
    }

    if (result.length <= 1) {
      this.lineCounter = [this.getLineIndex(1)];
    } else {
      this.lineCounter = result;
    }
  }
}
