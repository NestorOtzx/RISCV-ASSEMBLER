import { Component, ElementRef, ViewChild, AfterViewInit, QueryList, DebugEventListener } from '@angular/core';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.css'
})
export class TextEditor implements AfterViewInit {
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;

  constructor(private elementRef: ElementRef) {}

  lines: number[] = [1];

  ngAfterViewInit() {
    this.updateLineCount();

    this.editor.nativeElement.addEventListener('input', () => {
      console.log("INPUT");
      this.updateLineCount();
    });

    this.editor.nativeElement.addEventListener('paste', (event: ClipboardEvent) => {
      event.preventDefault();
      const plainText = event.clipboardData?.getData('text/plain') || '';
      const selection = window.getSelection();
      const pasteLines = plainText.split('\n');

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        for (let line in pasteLines)
        {
          range.insertNode(document.createTextNode(line));
          
        }
        range.collapse(false); // Collapse the range to the end of the inserted text
      }
      
      this.updateLineCount();
    });
  }

  updateLineCount() {
    //console.log("child element count: ", this.editor);
    this.lines = Array.from({length: Math.max(this.editor.nativeElement.childNodes.length,1)}, (_, i) => i+1)
    //this.lines = Array.from({ length: childDivCount, }, (_, i) => i + 1);
  }


}
