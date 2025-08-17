import { Component, signal, computed, ViewChild, ElementRef, AfterViewInit, Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TextEditor } from './text-editor/text-editor';
import { saveAs } from 'file-saver';

// Importa tus ensambladores
import { assembleRTypeProgressive } from './assembler/encoders/r-type';
import { assembleITypeProgressive } from './assembler/encoders/i-type';
import { assembleSTypeProgressive } from './assembler/encoders/s-type';
import { assembleBTypeProgressive } from './assembler/encoders/b-type';
import { assembleSpecialITypeProgressive } from './assembler/encoders/special-i-type';
import { assembleUTypeProgressive } from './assembler/encoders/u-type';
import { assembleJTypeProgressive } from './assembler/encoders/j-type';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TextEditor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  inputText = signal('');
  selectedOutputFormat = signal('binary');
  selectedInputFormat = signal('riscv');

  lineNumbers = signal<number[]>([1]);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScrollContainer') inputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScrollContainer') outputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editor') editor!: TextEditor;
  
  onEditorChange(content: string) {
    this.inputText.set(content); // sincroniza con tu signal
  }

  outputText = computed(() => {
    const lines = this.inputText().toLowerCase().split('\n');
    const format = this.selectedOutputFormat();
    return this.RISCV_to_format(lines, format);
  });

 
  RISCV_to_format(lines: Array<string>, format : string) {
    return lines.map(line => {
      let binary = assembleRTypeProgressive(line.trim())
        || assembleITypeProgressive(line.trim())
        || assembleSTypeProgressive(line.trim())
        || assembleBTypeProgressive(line.trim())
        || assembleSpecialITypeProgressive(line.trim())
        || assembleUTypeProgressive(line.trim())
        || assembleJTypeProgressive(line.trim());

      if (!binary) return line;

      switch (format) {
        case 'binary': return binary;
        case 'hexadecimal': return `0x${parseInt(binary, 2).toString(16).padStart(8, '0')}`;
        default: return line;
      }
    }).join('\n');
  }

  switchFormats()
  {
    const currInput = this.selectedInputFormat();
    const aux =  this.selectedInputFormat();
    const currOutput = this.selectedOutputFormat();
    console.log("switch formats ", currInput, aux, currOutput)
    this.selectedInputFormat.set(currOutput);
    this.selectedOutputFormat.set(aux);
    this.updateInputFormats(currInput, currOutput);
  }

  onOutputFormatChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedOutputFormat.set(selectElement.value);
  }

  onInputFormatChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    console.log("Changing input from: ", this.selectedInputFormat(), " to:", selectElement.value)
    const prev = this.selectedInputFormat();
    const current = selectElement.value;
    this.updateInputFormats(prev, current);
    this.selectedInputFormat.set(selectElement.value);
  }

  updateInputFormats(prev: string, current: string)
  {
    if (prev !== current)
    {
      if (prev === "riscv" && current == "binary")
      {
        const lines = this.inputText().toLowerCase().split('\n');
        const format = "binary";
        this.inputText.set(this.RISCV_to_format(lines, format)); 
      } else if (prev === "riscv" && current == "hexadecimal")
      {
        const lines = this.inputText().toLowerCase().split('\n');
        const format = "hexadecimal";
        this.inputText.set(this.RISCV_to_format(lines, format));
      } else if (prev === "binary" && current == "riscv")
      {

      } else if (prev === "binary" && current == "hexadecimal")
      {

      } else if (prev === "hexadecimal" && current == "binary")
      {

      } else if (prev === "hexadecimal" && current == "riscv")
      {

      }
    }
  }

  onImportFile() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const content = (reader.result as string).replace(/\r/g, '');
      this.editor.setContent(content);
    };

    reader.readAsText(file);
  }

  copyOutput() {
    navigator.clipboard.writeText(this.outputText()).then(() => {
      alert('Output copied to clipboard!');
    });
  }

  downloadOutput() {
    const format = this.selectedOutputFormat();
    let extension = 'txt';
    if (format === 'vhdl') extension = 'vhd';
    else if (format === 'verilog') extension = 'v';
    else if (format === 'hexadecimal') extension = 'hex';

    const blob = new Blob([this.outputText()], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `output.${extension}`);
  }


}
