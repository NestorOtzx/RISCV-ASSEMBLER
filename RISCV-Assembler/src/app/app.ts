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
import { OutputText } from './output-text/output-text';
import { isValidInstruction } from './assembler/utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TextEditor, OutputText],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  inputText = signal('');
  selectedOutputFormat = signal('binary');
  selectedLineIndexing = signal('numbers');
  selectedInputFormat = signal('riscv');

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScrollContainer') inputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScrollContainer') outputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editor') editor!: TextEditor;
  
  onEditorChange(content: string) {
    console.log("editor change: ", content);
    this.inputText.set(content); // sincroniza con tu signal
  }

  onLabelsChange(labels: { name: string, line: number }[]) {
    console.log("Etiquetas detectadas:", labels);
  }

  outputText = computed(() => {
    const lines = this.inputText().toLowerCase().split('\n');
    const format = this.selectedOutputFormat();
    return this.RISCV_to_format(lines, format);
  });

  

  getLineIndex(lineNumber:number): string{
    var directionFormat;
    if (this.selectedLineIndexing() === 'direction') {
        const address = (0x0000+(lineNumber * 4)).toString(16).toUpperCase();
        directionFormat = '0x' + address.padStart(4, '0');
    }else{
        directionFormat = lineNumber.toString();
    }
    return directionFormat
  }
 
  RISCV_to_format(lines: Array<string>, format : string) {
    return lines.map((line, i) => {
      const trimmed = line.trim();

      const isLabel = /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);

      if (isLabel) {
        this.editor.clearWrongMark(i + 1);
        return trimmed;
      }

      let binary = assembleRTypeProgressive(trimmed)
        || assembleITypeProgressive(trimmed)
        || assembleSTypeProgressive(trimmed)
        || assembleBTypeProgressive(trimmed)
        || assembleSpecialITypeProgressive(trimmed)
        || assembleUTypeProgressive(trimmed)
        || assembleJTypeProgressive(trimmed);

      console.log("line i: ", i+1, ": ", line, " binary?", binary);

      if (!binary) {
        if (trimmed.length > 2) {
          this.editor.markLineAsWrong(i+1, "This instruction doesn't exist.");
        } else if (trimmed.length > 0) {
          this.editor.clearWrongMark(i+1);  
        }
        return line;
      } else {
        this.editor.clearWrongMark(i+1);
      }

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

  onSelectedLineIndexingChange(event: Event){
    const selectElement = event.target as HTMLSelectElement;
    this.selectedLineIndexing.set(selectElement.value);
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
