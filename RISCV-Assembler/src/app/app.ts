import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TextEditor } from './text-editor/text-editor';
import { saveAs } from 'file-saver';

// Ensambladores
import { assembleRTypeProgressive } from './assembler/encoders/r-type';
import { assembleITypeProgressive } from './assembler/encoders/i-type';
import { assembleSTypeProgressive } from './assembler/encoders/s-type';
import { assembleBTypeProgressive } from './assembler/encoders/b-type';
import { assembleSpecialITypeProgressive } from './assembler/encoders/special-i-type';
import { assembleUTypeProgressive } from './assembler/encoders/u-type';
import { assembleJTypeProgressive } from './assembler/encoders/j-type';
import { OutputText } from './output-text/output-text';

type TranslationResult = {
  output: string[];
  labelMap: Record<string, number>;
  errors: { line: number; message: string }[];
  lineMapping: number[]; // editor line → output line, -1 si no existe
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TextEditor, OutputText],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  inputText = signal('');
  activeLine = signal(0); // línea seleccionada en editor
  activeOutputLine = signal(-1); // línea equivalente en output
  outputTextSignal = signal('');

  selectedOutputFormat = signal<'binary' | 'hexadecimal' | 'riscv'>('binary');
  selectedLineIndexing = signal<'numbers' | 'direction'>('numbers');
  selectedInputFormat = signal<'riscv' | 'binary' | 'hexadecimal'>('riscv');

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScrollContainer') inputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScrollContainer') outputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editor') editor!: TextEditor;

  selectedConvertMethod = signal("automatic"); // nuevo
  compiled = signal<TranslationResult | null>(null); // antes era computed


  // Traducción pura + mapeo de líneas
  private RISCV_translate(lines: string[], format: string): TranslationResult {
    const output: string[] = [];
    const labelMap: Record<string, number> = {};
    const errors: { line: number; message: string }[] = [];
    const lineMapping: number[] = [];

    let instructionAddress = 0;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        lineMapping.push(-1); // línea vacía → no hay output
        return;
      }

      const isLabel = /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);
      if (isLabel) {
        const labelName = trimmed.replace(':', '');
        if (labelMap.hasOwnProperty(labelName)) {
          errors.push({ line: i + 1, message: `Duplicated label "${labelName}"` });
        } else {
          labelMap[labelName] = instructionAddress;
        }
        lineMapping.push(-1); // etiquetas no generan output
        return;
      }

      let binary = assembleRTypeProgressive(trimmed)
        || assembleITypeProgressive(trimmed)
        || assembleSTypeProgressive(trimmed)
        || assembleBTypeProgressive(trimmed)
        || assembleSpecialITypeProgressive(trimmed)
        || assembleUTypeProgressive(trimmed)
        || assembleJTypeProgressive(trimmed);

      if (!binary) {
        if (trimmed.length > 0) errors.push({ line: i + 1, message: 'Invalid instruction' });
        lineMapping.push(-1);
        return;
      }

      instructionAddress++;
      lineMapping.push(output.length); // mapeo: editor line → índice en output

      switch (format) {
        case 'binary': output.push(binary); break;
        case 'hexadecimal': output.push(`0x${parseInt(binary, 2).toString(16).padStart(8,'0')}`); break;
        default: output.push(trimmed); break;
      }
    });

    return { output, labelMap, errors, lineMapping };
  }

  convert() {
    const lines = this.inputText().toLowerCase().split('\n');
    const format = this.selectedOutputFormat();
    const result = this.RISCV_translate(lines, format);
    this.outputTextSignal.set(result.output.join('\n'));
    this.compiled.set(result);
    this.updateEditorMarks();
  }

  get outputText(): string {
    return this.compiled()?.output.join('\n') ?? '';
  }

  get labelMap(): Record<string, number> {
    return this.compiled()?.labelMap ?? {};
  }


  // Actualizar errores en editor (fuera de computed)
  updateEditorMarks() {
    if (!this.editor) return;

    const result = this.compiled();
    const totalLines = this.inputText().split('\n').length;
    for (let i = 1; i <= totalLines; i++) this.editor.clearWrongMark(i);
    result?.errors.forEach(e => this.editor.markLineAsWrong(e.line, e.message));

    this.updateActiveOutputLine();
  }

  // Línea activa → output
  updateActiveOutputLine() {
    const editorLine = this.activeLine();
    const mapping = this.compiled()?.lineMapping;
    if (mapping)
    {
      const outputLine = mapping[editorLine] ?? -1;
      this.activeOutputLine.set(outputLine);
    }
  }

  onEditorChange(content: string) {
    this.inputText.set(content);
    if (this.selectedConvertMethod() === 'automatic') this.convert(); // solo si autoAssemble
  }

  onSelectedConvertMethod(event: Event) {
    this.selectedConvertMethod.set((event.target as HTMLSelectElement).value as any);
    this.convert();
  }


  onActiveLineChange(line: number) {
    this.activeLine.set(line);
    this.updateActiveOutputLine();
  }

  

  switchFormats() {
    const prevInput = this.selectedInputFormat();
    const prevOutput = this.selectedOutputFormat();
    this.selectedInputFormat.set(prevOutput);
    this.selectedOutputFormat.set(prevInput);
    this.updateInputFormats(prevInput, prevOutput);
  }

  onSelectedLineIndexingChange(event: Event) {
    this.selectedLineIndexing.set((event.target as HTMLSelectElement).value as any);
  }

  onOutputFormatChange(event: Event) {
    this.selectedOutputFormat.set((event.target as HTMLSelectElement).value as any);
    if (this.selectedConvertMethod() == 'automatic') this.convert();
  }


  onInputFormatChange(event: Event) {
    const prev = this.selectedInputFormat();
    const current = (event.target as HTMLSelectElement).value as any;
    this.updateInputFormats(prev, current);
    this.selectedInputFormat.set(current);
  }

  updateInputFormats(prev: string, current: string) {
    if (prev !== current) {
      if (prev === 'riscv' && (current === 'binary' || current === 'hexadecimal')) {
        const lines = this.inputText().toLowerCase().split('\n');
        this.inputText.set(this.RISCV_translate(lines, current).output.join('\n'));
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
    reader.onload = () => this.editor.setContent((reader.result as string).replace(/\r/g,''));
    reader.readAsText(file);
  }

  downloadOutput() {
    const format = this.selectedOutputFormat();
    let extension = 'txt';
    const blob = new Blob([this.outputTextSignal()], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `output.${extension}`);
  }
}
