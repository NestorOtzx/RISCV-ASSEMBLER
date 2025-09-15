import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TextEditor } from './text-editor/text-editor';
import { saveAs } from 'file-saver';
import { BinaryToRiscV, RiscVToBinary, HexToBinary, BinaryToHex, TranslationResult, NoConversion,  } from './assembler/translator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TextEditor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  inputText = signal('');
  inputActiveLine = signal(0);
  outputActiveLine = signal(-1);

  selectedInputFormat = signal<'riscv' | 'binary' | 'hexadecimal'>('riscv');
  previousInputFormat = 'riscv'
  selectedOutputFormat = signal<'binary' | 'hexadecimal' | 'riscv'>('binary');
  selectedLineIndexing = signal<'numbers' | 'direction'>('numbers');

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScrollContainer') inputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScrollContainer') outputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editor') editor!: TextEditor;
  @ViewChild('outputTextEditor') outputTextEditor!: TextEditor;

  selectedConvertMethod = signal("automatic"); // nuevo
  compiled = signal<TranslationResult | null>(null); // antes era computed

  convertInputToOutput() {
    const lines = this.inputText().toLowerCase().split('\n');
    const result = this.convertTextToFormat(lines, this.selectedInputFormat(), this.selectedOutputFormat());
    
    if (result != null)
    {
      this.outputTextEditor.setContent(result.output.join('\n'));
      this.compiled.set(result);
      this.updateEditorMarks();
    }
  }

  convertTextToFormat(lines: string[], from_format: string, to_format: string): TranslationResult | null
  {
    console.log("convert text to format");
    let result: TranslationResult | null;
    if (from_format == 'binary' && to_format == 'riscv')
    {
      result = BinaryToRiscV(lines);
    }
    else if (from_format == 'binary' && to_format == 'hexadecimal')
    {
      result = BinaryToHex(lines);
    }
    else if (from_format == 'hexadecimal' && to_format == 'riscv'){
      result = BinaryToRiscV(HexToBinary(lines).output);
    }else if (from_format == 'hexadecimal' && to_format == 'binary'){
      result = HexToBinary(lines);
    }else if (from_format == 'riscv' && to_format == 'binary'){
      result = RiscVToBinary(lines);
    }else if (from_format == 'riscv' && to_format == 'hexadecimal'){
      result = BinaryToHex(RiscVToBinary(lines).output);
    }
    else{
      result = NoConversion(lines);
    }
    return result;
  }

  get outputText(): string {
    return this.compiled()?.output.join('\n') ?? '';
  }

  get labelMap(): Record<string, number> {
    return this.compiled()?.labelMap ?? {};
  }


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
    const editorLine = this.inputActiveLine();
    const mapping = this.compiled()?.editorToOutput;
    if (mapping)
    {
      const outputLine = mapping[editorLine] ?? -1;
      this.outputActiveLine.set(outputLine);
      this.outputTextEditor.setActiveLineByIndex(outputLine);
    }
  }

  onEditorChange(content: string) {
    this.inputText.set(content);
    if (this.selectedConvertMethod() === 'automatic') this.convertInputToOutput(); // solo si autoAssemble
  }

  onSelectedConvertMethod(event: Event) {
    this.selectedConvertMethod.set((event.target as HTMLSelectElement).value as any);
    this.convertInputToOutput();
  }


  onInputActiveLineChange(line: number) {
    console.log("input active line changed to", line);
    this.inputActiveLine.set(line);
    this.updateActiveOutputLine();
  }

  onOutputActiveLineChange(line: number) {
    console.log("output active line changed to", line);

    this.outputActiveLine.set(line);
    this.editor.setActiveLineByIndex(this.compiled()?.outputToEditor[line] ?? -1)
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
    if (this.selectedConvertMethod() == 'automatic') this.convertInputToOutput();
  }


  onInputFormatChange(event: Event) {
    const prev = this.previousInputFormat;
    const current = (event.target as HTMLSelectElement).value as any;
    this.updateInputFormats(prev, current);
    this.previousInputFormat = current;
  }

  updateInputFormats(prev: string, current: string) {
    console.log("input format change "+prev + " "+ current);
    if (prev !== current) {
      this.editor.setContent(this.convertTextToFormat(this.inputText().split('\n'), prev, current)?.output.join('\n')||'')
      this.convertInputToOutput();
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
    //const blob = new Blob([this.outputTextSignal()], { type: 'text/plain;charset=utf-8' });
    //saveAs(blob, `output.${extension}`);
  }
}
