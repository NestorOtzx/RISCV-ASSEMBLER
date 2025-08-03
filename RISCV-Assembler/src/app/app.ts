import { Component, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { assembleITypeProgressive } from './assembler/encoders/i-type';
import { assembleBTypeProgressive } from './assembler/encoders/b-type';
import { assembleJTypeProgressive } from './assembler/encoders/j-type';
import { assembleRTypeProgressive } from './assembler/encoders/r-type';
import { assembleSTypeProgressive } from './assembler/encoders/s-type';
import { assembleSpecialITypeProgressive } from './assembler/encoders/special-i-type';
import { assembleUTypeProgressive } from './assembler/encoders/u-type';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  inputText = signal('');
  selectedFormat = signal('binary');

  outputText = computed(() => {
    const lines = this.inputText().split('\n');
    const format = this.selectedFormat();

    return lines.map(line => {
      let binary = assembleRTypeProgressive(line.trim());
      if (!binary) binary = assembleITypeProgressive(line.trim());
      if (!binary) binary = assembleSTypeProgressive(line.trim());
      if (!binary) binary = assembleBTypeProgressive(line.trim());
      if (!binary) binary = assembleSpecialITypeProgressive(line.trim());
      if (!binary) binary = assembleUTypeProgressive(line.trim());
      if (!binary) binary = assembleJTypeProgressive(line.trim());
      if (!binary) return line;

      if (format === 'binary') {
        return binary;
      } else if (format === 'hexadecimal') {
        const hex = parseInt(binary, 2).toString(16).padStart(8, '0');
        return `0x${hex}`;
      }

      return line;
    }).join('\n');
  });

  onFormatChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedFormat.set(selectElement.value);
    console.log('Formato seleccionado:', selectElement.value);
  }
}

