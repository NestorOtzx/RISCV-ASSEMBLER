import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-output-text',
  imports: [],
  templateUrl: './output-text.html',
  styleUrl: './output-text.css',
  host: {
    class: 'relative flex flex-col md:w-1/2 w-full h-full border border-gray-600 rounded overflow-hidden bg-gray-800 font-mono'
  }
})
export class OutputText {
  @Input()
  outputText: string = '';

  get outputLines(): string[] {
    return this.outputText.split('\n');
  }
  copy(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.outputText)
        .then(() => console.log('✅ Copied to clipboard'))
        .catch(err => console.error('❌ Error copying text:', err));
    } else {
      // fallback por si el navegador no soporta clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = this.outputText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      console.log('✅ Copied with fallback');
    }
  }
}
