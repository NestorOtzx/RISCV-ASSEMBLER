import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TextEditor } from './text-editor/text-editor';
import { ExportWindow } from './export-window/export-window';
import { MemorySizeEditor } from './memory-size-editor/memory-size-editor';
import { saveAs } from 'file-saver';
import { BinaryToRiscV, RiscVToBinary, HexToBinary, BinaryToHex, TranslationResult, NoConversion, BinaryToBinary, RiscVToRiscV, HexToHex } from './assembler/translator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, TextEditor, ExportWindow, MemorySizeEditor],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  showExportWindow = false;

  inputText = signal('');
  inputActiveLine = signal(0);
  outputActiveLine = signal(-1);

  selectedInputFormat = signal<'riscv' | 'binary' | 'hexadecimal'>('riscv');
  selectedOutputFormat = signal<'binary' | 'hexadecimal' | 'riscv'>('binary');
  previousInputFormat = 'riscv'
  selectedLineIndexing = signal<'numbers' | 'direction'>('numbers');
  showMemoryEditor = signal(false);

  memorySections = [
    { name: 'Reserved', end: 0x0040, color: '#008cffff', editable: true },           //  64 B
    { name: 'Text', end: 0x0100, color: '#5900ffff', editable: true },               // 256 B
    { name: 'Static Data', end: 0x0200, color: '#1f0066ff', editable: true },       // 512 B
    { name: 'Stack / Dynamic Data', end: 0x0400, color: '#41005aff', editable: false } // 1024 B (end)
  ];

  // physical default: 1 KiB
  memorySize = 0x0400; // 1024 bytes
  memoryUnit = 'B'; 

  // ** NUEVO: guardamos el width en la App y lo persistimos en localStorage **
  memoryWidth = 8; // por defecto 8 bits

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inputScrollContainer') inputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('outputScrollContainer') outputScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('editor') editor!: TextEditor;
  @ViewChild('outputTextEditor') outputTextEditor!: TextEditor;
  @ViewChild('exportWindow') exportWindow!: ExportWindow;

  selectedConvertMethod = signal("automatic"); // nuevo
  compiled = signal<TranslationResult | null>(null); // antes era computed

  constructor() {
    // Cargar width guardado (si existe)
    try {
      const saved = localStorage.getItem('memoryWidth');
      if (saved !== null) {
        const n = Number(saved);
        if (!isNaN(n) && (n === 8 || n === 32)) {
          this.memoryWidth = n;
        }
      }
    } catch (e) {
      // ignore (no localStorage disponible)
    }
  }

  // --------------------------------------------------------------------------------
  // Actualización desde MemorySizeEditor: ahora acepta width y lo persiste
  // --------------------------------------------------------------------------------
  onMemoryEditorUpdate(event: { sections: any[]; size: number; unit: string; width?: number }) {
    this.memorySections = event.sections;
    this.memorySize = event.size;
    this.memoryUnit = event.unit;

    if (event.width !== undefined) {
      this.memoryWidth = event.width;
      try {
        localStorage.setItem('memoryWidth', String(this.memoryWidth));
      } catch (e) {
        // ignore
      }
    }
  }

  toggleMemoryEditor() {
    this.showMemoryEditor.update(v => !v);
  }

  closeMemoryEditor() {
    this.showMemoryEditor.set(false);
  }

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
    console.log("convert text to format from:"+from_format + " to: "+to_format);
    let result: TranslationResult | null;
    let memoryWidthTyped: 8 | 32;
    if (this.memoryWidth == 32)
    {
      memoryWidthTyped = 32;
    }else{
      memoryWidthTyped = 8;
    }

    if (from_format == 'binary' && to_format == 'binary')
    {
      result = BinaryToBinary(lines, memoryWidthTyped);
    }
    else if (from_format == 'riscv' && to_format == 'riscv')
    {
      result = RiscVToRiscV(lines, memoryWidthTyped);
    }else if (from_format == 'hexadecimal' && to_format == 'hexadecimal'){
      result = HexToHex(lines, memoryWidthTyped);
    }
    else if (from_format == 'binary' && to_format == 'riscv')
    {
      result = BinaryToRiscV(lines, memoryWidthTyped);
    }
    else if (from_format == 'binary' && to_format == 'hexadecimal')
    {
      result = BinaryToHex(lines);
    }
    else if (from_format == 'hexadecimal' && to_format == 'riscv'){
      result = BinaryToRiscV(HexToBinary(lines).output, memoryWidthTyped);
    }else if (from_format == 'hexadecimal' && to_format == 'binary'){
      result = HexToBinary(lines);
    }else if (from_format == 'riscv' && to_format == 'binary'){
      result = RiscVToBinary(lines, memoryWidthTyped);
    }else if (from_format == 'riscv' && to_format == 'hexadecimal'){
      result = BinaryToHex(RiscVToBinary(lines, memoryWidthTyped).output);
    }
    else{
      result = NoConversion(lines);
    }
    return result;
  }

  get exportInitialMemoryWidth(): 8 | 32 {
  return this.memoryWidth === 32 ? 32 : 8;
}

    /**
   * Tamaño direccionable lógico (número de direcciones) que pasaremos a ExportWindow.
   * Calculado como: memorySize (bytes) / (memoryWidth / 8).
   */
  get exportInitialMemSize(): number {
    const bytesPerAddr = this.memoryWidth / 8 || 1;
    return Math.floor(this.memorySize / bytesPerAddr);
  }

  /**
   * Dirección lógica donde inicia la sección "Text".
   * Buscamos la sección 'Text', tomamos el 'end' del segmento anterior (en bytes)
   * y lo convertimos a direcciones lógicas (división por bytesPerAddr).
   */
  get exportInitialStartAddress(): number {
    const idx = this.memorySections.findIndex(s => s.name === 'Text');
    if (idx === -1) return 0;

    const prevEndBytes = idx === 0 ? 0 : (this.memorySections[idx - 1].end ?? 0);
    const bytesPerAddr = this.memoryWidth / 8 || 1;
    return Math.floor(prevEndBytes / bytesPerAddr);
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

  onOutsideClick(event: MouseEvent) {
    const editorElement = document.querySelector('app-memory-size-editor');
    if (editorElement && !editorElement.contains(event.target as Node)) {
      this.closeMemoryEditor();
    }
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
    this.previousInputFormat = prevOutput;
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
    this.selectedInputFormat.set((event.target as HTMLSelectElement).value as any);
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

  openExportWindow() {
    this.showExportWindow = true;
    // Espera un ciclo para asegurar que el componente esté montado
    setTimeout(() => {
      this.exportWindow.setContent(this.outputText);
    });
  }

  closeExportWindow() {
    this.showExportWindow = false;
  }
}
