import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input } from '@angular/core';

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
  
  constructor(private elementRef: ElementRef) {}

  @Input() lines: string[] = ['1'];

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private readonly MAX_HISTORY = 200;

  private tooltipEl!: HTMLDivElement;

  ngAfterViewInit() {
    this.ensureFirstLineWrapped();
    this.saveState(); 

    const editorEl = this.editor.nativeElement;

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.classList.add('tooltip');
    document.body.appendChild(this.tooltipEl);

    editorEl.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    editorEl.addEventListener('mouseleave', () => this.hideTooltip());

    editorEl.addEventListener('input', () => {
      this.ensureFirstLineWrapped();
      this.emitContent();
      this.highlightActiveLine();
      this.saveState();
      this.markLineAsWrong(1);
    });

    editorEl.addEventListener('paste', (event: ClipboardEvent) => {
      event.preventDefault();
      const plainText = event.clipboardData?.getData('text/plain') || '';
      const selection = window.getSelection();
      const pasteLines = plainText.split(/\r?\n/);

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        const startOffset = range.startOffset;

        range.deleteContents();

        let currentDiv = this.getClosestDiv(startNode);
        if (!currentDiv) {
          currentDiv = document.createElement('div');
          currentDiv.innerHTML = '<br>';
          editorEl.appendChild(currentDiv);
        }

        const beforeText = currentDiv.textContent?.slice(0, startOffset) || '';
        const afterText = currentDiv.textContent?.slice(startOffset) || '';

        const parent = currentDiv.parentNode!;
        let refNode: ChildNode | null = currentDiv.nextSibling;

        const firstLine = beforeText + (pasteLines[0] ?? '');
        if (firstLine === '') currentDiv.innerHTML = '<br>';
        else currentDiv.textContent = firstLine;

        let lastInserted = currentDiv;

        for (let i = 1; i < pasteLines.length; i++) {
          const newDiv = document.createElement('div');
          const line = pasteLines[i] ?? '';
          if (line === '') newDiv.innerHTML = '<br>';
          else newDiv.textContent = line;
          parent.insertBefore(newDiv, refNode);
          lastInserted = newDiv;
        }

        if (afterText) {
          const base = lastInserted.textContent || '';
          lastInserted.textContent = base + afterText;
        }

        const newRange = document.createRange();
        const firstChild = lastInserted.firstChild;
        if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
          newRange.setStart(firstChild, (firstChild as Text).length);
        } else if (lastInserted.lastChild) {
          newRange.setStartAfter(lastInserted.lastChild);
        } else {
          newRange.setStart(lastInserted, 0);
        }
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      this.emitContent();
      this.highlightActiveLine();
      this.saveState();
    });


    editorEl.addEventListener('keydown', (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? event.metaKey : event.ctrlKey;

      if (mod && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        this.undo();
        return;
      }
      if ((mod && event.key.toLowerCase() === 'y') || (mod && event.shiftKey && event.key.toLowerCase() === 'z')) {
        event.preventDefault();
        this.redo();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        this.insertTextAtCursor('\t');
        this.saveState();
        return;
      }

      // Capturamos Enter y hacemos la indentación personalizada
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleNewLineIndent();
        this.saveState();
        return;
      }
    });


    editorEl.addEventListener('keyup', () => this.highlightActiveLine());
    editorEl.addEventListener('mouseup', () => this.highlightActiveLine());

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (sel && editorEl.contains(sel.anchorNode)) {
        this.highlightActiveLine();
      }
    });
  }

  private getCaretOffsetInDiv(div: HTMLDivElement): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);

    // Creamos un rango que selecciona desde el inicio del div hasta la posición actual
    const preRange = range.cloneRange();
    preRange.selectNodeContents(div);
    preRange.setEnd(range.endContainer, range.endOffset);

    // preRange.toString() devuelve el texto antes del caret dentro del div
    return preRange.toString().length;
  }

  private handleNewLineIndent() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const currentDiv = this.getClosestDiv(range.startContainer);
    if (!currentDiv) return;

    // Texto completo de la línea actual (antes de cualquier cambio)
    const fullText = (currentDiv.textContent ?? '');

    // Offset del caret relativo al inicio de la línea
    const caretOffset = this.getCaretOffsetInDiv(currentDiv);

    // Partimos la línea donde está el caret
    const beforeText = fullText.slice(0, caretOffset);
    const afterText = fullText.slice(caretOffset);

    // Tomamos la indentación (tabs) del inicio de la línea completa
    const indentMatch = fullText.match(/^\t+/);
    let baseIndent = indentMatch ? indentMatch[0] : '';

    // Si la línea completa es una etiqueta (ej: "main:") añadimos un tab extra
    const isLabelLine = fullText.trim().endsWith(':') && /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(fullText.trim());
    if (isLabelLine) baseIndent += '\t';

    // Ajustamos la línea actual (lo que queda antes del caret)
    if (beforeText === '') {
      // si queda vacía la línea actual, dejamos un <br> para que sea seleccionable
      currentDiv.innerHTML = '<br>';
    } else {
      currentDiv.textContent = beforeText;
    }

    // Creamos el nuevo div con la indentación y el texto que venía después del caret
    const newDiv = document.createElement('div');
    const newContent = baseIndent + afterText;

    if (newContent === '') {
      newDiv.innerHTML = '<br>';
    } else {
      newDiv.textContent = newContent;
    }

    // Insertamos debajo de la línea actual
    const parent = currentDiv.parentNode!;
    parent.insertBefore(newDiv, currentDiv.nextSibling);

    // Colocamos el caret al final de la indentación de la nueva línea
    const newRange = document.createRange();
    const firstChild = newDiv.firstChild;

    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      // Posicionamos dentro del text node en el offset igual al número de tabs
      newRange.setStart(firstChild, baseIndent.length);
    } else {
      // Si es <br> u otro, posicionamos al inicio del nuevoDiv
      newRange.setStart(newDiv, 0);
    }
    newRange.collapse(true);

    sel.removeAllRanges();
    sel.addRange(newRange);

    // Aseguramos que la nueva línea quede visible y actualizamos estado
    if ((newDiv as HTMLElement).scrollIntoView) {
      // centra ligeramente para visibilidad
      try { newDiv.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ }
    }

    this.emitContent();
    this.highlightActiveLine();
  }


  private saveState() {
    const html = this.editor.nativeElement.innerHTML;
    const last = this.undoStack[this.undoStack.length - 1];
    if (html === last) return;
    this.undoStack.push(html);
    if (this.undoStack.length > this.MAX_HISTORY) this.undoStack.shift();
    this.redoStack = []; 
  }

  private restoreContent(html: string) {
    this.editor.nativeElement.innerHTML = html;
    this.ensureFirstLineWrapped();
    this.emitContent();
    this.placeCaretAtEnd(this.editor.nativeElement);
    this.highlightActiveLine();
  }

  async copy() {
    const selection = window.getSelection();
    const editorEl = this.editor.nativeElement;

    if (!selection || !editorEl.contains(selection.anchorNode)) return;
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

  async paste() {
    const text = await navigator.clipboard.readText();
    if (!text) return;

    const selection = window.getSelection();
    const editorEl = this.editor.nativeElement;

    const pasteLines = text.split(/\r?\n/);

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      let currentDiv = this.getClosestDiv(range.startContainer);
      if (!currentDiv) {
        currentDiv = document.createElement('div');
        currentDiv.innerHTML = '<br>';
        editorEl.appendChild(currentDiv);
      }

      const beforeText = currentDiv.textContent?.slice(0, range.startOffset) || '';
      const afterText = currentDiv.textContent?.slice(range.startOffset) || '';

      range.deleteContents();

      const firstLine = beforeText + (pasteLines[0] ?? '');
      if (firstLine === '') {
        currentDiv.innerHTML = '<br>';
      } else {
        currentDiv.textContent = firstLine;
      }

      let lastInserted = currentDiv;

      for (let i = 1; i < pasteLines.length; i++) {
        const newDiv = document.createElement('div');
        const line = pasteLines[i] ?? '';
        if (line === '') {
          newDiv.innerHTML = '<br>';
        } else {
          newDiv.textContent = line;
        }
        editorEl.insertBefore(newDiv, lastInserted.nextSibling);
        lastInserted = newDiv;
      }

      if (afterText) {
        if (lastInserted.innerHTML === '<br>') {
          lastInserted.textContent = afterText;
        } else {
          lastInserted.textContent = (lastInserted.textContent || '') + afterText;
        }
      }

      const newRange = document.createRange();
      const firstChild = lastInserted.firstChild;
      if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
        newRange.setStart(firstChild, (firstChild as Text).length);
      } else if (lastInserted.lastChild) {
        newRange.setStartAfter(lastInserted.lastChild);
      } else {
        newRange.setStart(lastInserted, 0);
      }

      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    editorEl.querySelectorAll("div").forEach(div => {
      if (div.innerHTML.trim() === "") {
        div.innerHTML = "<br>";
      }
    });

    this.emitContent();
    this.highlightActiveLine();
  }

  delete() {
    const editorEl = this.editor.nativeElement;
    editorEl.innerHTML = '<div><br></div>';
    this.emitContent();
    this.saveState();
    this.placeCaretAtEnd(editorEl);
    this.highlightActiveLine();
  }

  undo() {
    if (this.undoStack.length > 1) {
      const current = this.undoStack.pop()!; 
      this.redoStack.push(current);
      const prev = this.undoStack[this.undoStack.length - 1];
      this.restoreContent(prev);
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop()!;
      this.undoStack.push(next);
      this.restoreContent(next);
    }
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

    this.emitContent();
    this.saveState(); 
    this.placeCaretAtEnd(editorEl);
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

  private placeCaretAtEnd(el: HTMLElement) {
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

  private ensureFirstLineWrapped() {
    const editorEl = this.editor.nativeElement;

    if (editorEl.childNodes.length === 0) {
      const div = document.createElement('div');
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

  private highlightActiveLine() {
    const selection = window.getSelection();
    if (!selection) return;

    let targetNode: Node | null = null;
    targetNode = selection.isCollapsed ? selection.anchorNode : selection.focusNode;
    if (!targetNode) return;

    const lineDiv = this.getClosestDiv(targetNode);
    if (!lineDiv) return;

    this.applyLineClasses(lineDiv);
  }

  private applyLineClasses(activeLine: HTMLDivElement | null) {
    const editorEl = this.editor.nativeElement;

    editorEl.querySelectorAll('div').forEach(div => {
      div.classList.remove('active-line', 'unactive-line');
      if (activeLine && div === activeLine) div.classList.add('active-line');
      else div.classList.add('unactive-line');
    });
  }

  private getClosestDiv(node: Node): HTMLDivElement | null {
    while (node && node !== this.editor.nativeElement) {
      if ((node as HTMLElement).nodeName === 'DIV') return node as HTMLDivElement;
      node = node.parentNode as Node;
    }
    return null;
  }

  



  private emitContent() {
    const lines: string[] = [];

    for (const child of Array.from(this.editor.nativeElement.children)) {
      if ((child as HTMLElement).tagName.toLowerCase() === "div") {
        let text = (child as HTMLElement).innerText;

        // 🔹 Limpieza completa de caracteres especiales
        text = text
          .replace(/\u00A0/g, " ")   // no-breaking space → espacio normal
          .replace(/\u200B/g, "")    // zero width space → nada
          .replace(/\u2028|\u2029/g, "") // separadores de línea/parrafo → eliminados
          .replace(/\r\n|\r|\n/g, "") // quitar cualquier salto interno
          .trim();                   // quitar espacios extra al inicio/fin

        lines.push(text);
      }
    }

    const cleanText = lines.join("\n");
    this.contentChange.emit(cleanText);

    // 🔹 Detectamos etiquetas (ejemplo: "main:", "loop:", etc.)
    const labels: { name: string, line: number }[] = [];
    lines.forEach((line, i) => {
      const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):$/); 
      if (match) {
        labels.push({
          name: match[1],    // nombre sin el `:`
          line: i + 1        // línea 1-indexada
        });
      }
    });

    this.labelsChange.emit(labels);
  }


  // === Tooltip handlers ===
  handleMouseMove(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (target && target.classList.contains('wrong-line') && target.dataset['error']) {
      this.tooltipEl.textContent = target.dataset['error'];
      this.tooltipEl.style.display = 'block';
      this.tooltipEl.style.left = `${e.clientX + 12}px`;
      this.tooltipEl.style.top = `${e.clientY + 12}px`;
    } else {
      this.hideTooltip();
    }
  }


  private hideTooltip() {
    this.tooltipEl.style.display = 'none';
  }

  // === Cambiado: mark/clear error ===
  markLineAsWrong(lineNumber: number, errorMessage?: string) {
    const editorEl = this.editor.nativeElement;
    const divs = editorEl.querySelectorAll('div');
    
    if (lineNumber < 1 || lineNumber > divs.length) return;

    const targetDiv = divs[lineNumber - 1] as HTMLDivElement;
    targetDiv.classList.add('wrong-line');

    if (errorMessage) {
      targetDiv.dataset['error'] = errorMessage; // ✅ acceso seguro en TS
    }
  }

  clearWrongMark(lineNumber: number) {
    const editorEl = this.editor.nativeElement;
    const divs = editorEl.querySelectorAll('div');

    if (lineNumber < 1 || lineNumber > divs.length) return;

    const targetDiv = divs[lineNumber - 1] as HTMLDivElement;
    targetDiv.classList.remove('wrong-line');
    delete targetDiv.dataset['error']; // ✅ borrado con ['error']
  }


}
