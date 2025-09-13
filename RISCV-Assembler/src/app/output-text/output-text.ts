import { Component, Input,Signal  } from '@angular/core';

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

  @Input() 
  selectedLineIndexing!: Signal <string>;

  @Input()
  activeOutputLineIndex: number | null = null;


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
    }
  }

  get lineNumbers(): string[] {
    var lines = this.outputLines.map((line, i) => {
      // Si la línea está vacía o es solo un espacio, mostramos espacio en blanco
      if (!line.trim()) return "\u00A0";
      return this.getLineIndex(i);
    });
    if (lines.length <= 1)
    {
      lines = [this.getLineIndex(0)];
    }
    return lines;
  }

  getLineIndex(i: number): string{
    if (this.selectedLineIndexing() === 'direction') {
      // Dirección en hexadecimal, multiplicando por 4 y mínimo 4 dígitos
      const address = ((i + 1) * 4).toString(16).toUpperCase();
      return '0x' + address.padStart(4, '0');
    } else {
      // Simplemente el número de línea
      return (i + 1).toString();
    }
    return ''
  }

}
