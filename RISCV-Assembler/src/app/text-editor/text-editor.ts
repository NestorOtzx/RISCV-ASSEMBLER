import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.css'
})
export class TextEditor implements AfterViewInit {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;

  lines: number[] = [1];
  private readonly ZWSP = '\u200B'; // Carácter invisible

  ngAfterViewInit() {
    // Iniciar con una línea vacía real
    this.editor.nativeElement.innerHTML = this.ZWSP;
    this.placeCaretAtEnd();

    this.updateLineCount();

    this.editor.nativeElement.addEventListener('input', () => {
      this.updateLineCount();
    });

    this.editor.nativeElement.addEventListener('paste', (event: ClipboardEvent) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text') ?? '';
      this.insertTextAtCursor(text);
    });
  }

  updateLineCount() {
    let text = this.editor.nativeElement.innerText || '';

    if (text.endsWith('\n')) {
      const lastLineEmpty = text.split('\n').at(-1)?.trim() === '';
      if (lastLineEmpty) {
        text = text.replace(/\n$/, '');
      }
    }

    const lineCount = Math.max(1, text.split('\n').length);
    this.lines = Array.from({ length: lineCount }, (_, i) => i + 1);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      this.insertTextAtCursor('    ');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.insertLineBreak();
      return;
    }

    if (event.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);

        // Si estamos en una línea vacía con solo ZWSP
        if (
          range.startContainer.nodeType === Node.TEXT_NODE &&
          (range.startContainer.nodeValue ?? '') === this.ZWSP &&
          range.startOffset === 1 // caret al final del ZWSP
        ) {
          event.preventDefault();

          // Borrar ZWSP actual
          range.startContainer.nodeValue = '';

          // Borrar el salto de línea anterior si existe
          const br = this.findPreviousBr(range.startContainer);
          if (br) {
            br.remove();
          }

          this.updateLineCount();
          return;
        }
      }
    }
  }

  insertTextAtCursor(text: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));

    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    this.updateLineCount();
  }

  insertLineBreak() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);

    // Nueva línea con ZWSP
    const zwspNode = document.createTextNode(this.ZWSP);
    br.after(zwspNode);

    range.setStart(zwspNode, 1);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);

    this.updateLineCount();
  }

  private findPreviousBr(node: Node): HTMLBRElement | null {
    let prev = node.previousSibling;
    while (prev) {
      if (prev.nodeName === 'BR') {
        return prev as HTMLBRElement;
      }
      prev = prev.previousSibling;
    }
    return null;
  }

  private placeCaretAtEnd() {
    const el = this.editor.nativeElement;
    const range = document.createRange();
    const sel = window.getSelection();

    range.selectNodeContents(el);
    range.collapse(false);

    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
