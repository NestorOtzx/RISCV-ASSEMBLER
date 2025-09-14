import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TextEditor } from './text-editor/text-editor';
import { saveAs } from 'file-saver';
import { OutputText } from './output-text/output-text';
import { BinaryToRiscV, RiscVToBinary, TranslationResult } from './assembler/translator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TextEditor, OutputText],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  inputText = signal('');
  activeLine = signal(0);
  activeOutputLine = signal(-1);
  outputTextSignal = signal('');

  selectedInputFormat = signal<'riscv' | 'binary' | 'hexadecimal'>('riscv');
  selectedOutputFormat = signal<'binary' | 'hexadecimal' | 'riscv'>('binary');
  selectedLineIndexing = signal<'numbers' | 'direction'>('numbers');

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScrollContainer') inputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScrollContainer') outputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editor') editor!: TextEditor;

  selectedConvertMethod = signal("automatic"); // nuevo
  compiled = signal<TranslationResult | null>(null); // antes era computed

  convert() {
    const lines = this.inputText().toLowerCase().split('\n');
    const format = this.selectedOutputFormat();
    let result;
    if (this.selectedInputFormat() == 'binary' && this.selectedOutputFormat() == 'riscv')
    {
      result = BinaryToRiscV(lines);
    }else{
      result = RiscVToBinary(lines,format);
    }
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
      if (prev === 'riscv' && current === 'binary') {
        const lines = this.inputText().toLowerCase().split('\n');
        this.inputText.set(RiscVToBinary(lines, current).output.join('\n'));
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
