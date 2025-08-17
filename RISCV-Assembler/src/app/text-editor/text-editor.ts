import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  templateUrl: './text-editor.html',
  styleUrls: ['./text-editor.css']
})
export class TextEditor implements AfterViewInit {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;

  @Output() contentChange = new EventEmitter<string>();

  constructor(private elementRef: ElementRef) {}

  lines: number[] = [1];

  ngAfterViewInit() {
    this.ensureFirstLineWrapped();
    this.updateLineCount();

    this.editor.nativeElement.addEventListener('input', () => {
      this.ensureFirstLineWrapped();
      this.updateLineCount();
      this.emitContent();
    });

    this.editor.nativeElement.addEventListener('paste', (event: ClipboardEvent) => {
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
          this.editor.nativeElement.appendChild(currentDiv);
        }

        const beforeText = currentDiv.textContent?.slice(0, startOffset) || '';
        const afterText = currentDiv.textContent?.slice(startOffset) || '';

        const parent = currentDiv.parentNode!;
        let refNode: ChildNode | null = currentDiv.nextSibling;

        // Primera línea
        const firstLine = beforeText + (pasteLines[0] ?? '');
        if (firstLine === '') {
          currentDiv.innerHTML = '<br>';
        } else {
          currentDiv.textContent = firstLine;
        }

        let lastInserted = currentDiv;

        // Resto de líneas
        for (let i = 1; i < pasteLines.length; i++) {
          const newDiv = document.createElement('div');
          const line = pasteLines[i] ?? '';
          if (line === '') {
            newDiv.innerHTML = '<br>';
          } else {
            newDiv.textContent = line;
          }
          parent.insertBefore(newDiv, refNode);
          lastInserted = newDiv;
        }

        // Añadir el texto que estaba después de la selección
        if (afterText) {
          const base = lastInserted.textContent || '';
          lastInserted.textContent = base + afterText;
        }

        // 🔹 Recolocar el cursor al final de lo pegado
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

      this.updateLineCount();
      this.emitContent();
    });

  }

  private ensureFirstLineWrapped() {
    const editorEl = this.editor.nativeElement;

    if (editorEl.childNodes.length === 0) {
      const div = document.createElement('div');
      div.innerHTML = '<br>'; // línea vacía visible
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

  private getClosestDiv(node: Node): HTMLDivElement | null {
    while (node && node !== this.editor.nativeElement) {
      if ((node as HTMLElement).nodeName === 'DIV') return node as HTMLDivElement;
      node = node.parentNode as Node;
    }
    return null;
  }

  updateLineCount() {
    this.lines = Array.from(
      { length: Math.max(this.editor.nativeElement.childNodes.length, 1) },
      (_, i) => i + 1
    );
  }

  private emitContent() {
    this.contentChange.emit(this.editor.nativeElement.innerText);
  }

  getContent(): string {
    return this.editor.nativeElement.innerText;
  }

  setContent(text: string) {
    const editorEl = this.editor.nativeElement;
    editorEl.innerHTML = ''; // limpio

    text.split(/\r?\n/).forEach(line => {
      const div = document.createElement('div');
      if (line === '') {
        div.innerHTML = '<br>';
      } else {
        div.textContent = line;
      }
      editorEl.appendChild(div);
    });

    this.updateLineCount();
    this.emitContent();
  }
}
