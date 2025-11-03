import { Component, EventEmitter, Output, ViewChild, Input, signal, OnInit  } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextEditor } from '../text-editor/text-editor';
import { BinaryToHex, HexToBinary, BinaryToBinary, HexToHex, RiscVToBinary } from '../assembler/translator';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-export-window',
  standalone: true,
  imports: [FormsModule, TextEditor],
  templateUrl: './export-window.html',
  styleUrl: './export-window.css'
})
export class ExportWindow {
  @Output() close = new EventEmitter<void>();
  @ViewChild('exportTextEditor') exportTextEditor!: TextEditor;

  // === INPUTS FROM PARENT === //
  @Input({ required: true }) selectedOutputFormat!: 'binary' | 'hexadecimal' | 'riscv';
  @Input() initialMemSize = 256;
  @Input() initialStartAddress = 0;
  @Input() initialMemoryWidth: 8 | 32 = 8;

  // === REACTIVE SIGNALS === //
  baseText = signal('');
  inputFormat = signal<'binary' | 'hexadecimal'>('binary');
  outputFormat = signal<'text' | 'vhdl' | 'verilog'>('text');
  startAddress = signal(this.initialStartAddress);
  memSize = signal(this.initialMemSize);
  memoryWidth = signal<8 | 32>(this.initialMemoryWidth);
  componentName = signal('MemoryBlock');

  // === INTERNAL STATE === //
  exportedContent = '';

  // === HDL TEMPLATES === //
  readonly VHDL_TEMPLATE = `library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.NUMERIC_STD.ALL;

entity {COMPONENT_NAME} is
  Port (
    clk : in STD_LOGIC;
    addr : in INTEGER range 0 to {MEM_SIZE}-1;
    data_out : out STD_LOGIC_VECTOR({DATA_WIDTH} downto 0)
  );
end {COMPONENT_NAME};

architecture Behavioral of {COMPONENT_NAME} is
  type memory_t is array (0 to {MEM_SIZE}-1) of STD_LOGIC_VECTOR({DATA_WIDTH} downto 0);
  constant memory : memory_t := (
{MEM_CONTENT}
  );
begin
  process(clk)
  begin
    if rising_edge(clk) then
      data_out <= memory(addr);
    end if;
  end process;
end Behavioral;
`;

  readonly VERILOG_TEMPLATE = `
module {COMPONENT_NAME}(
  input logic clk,
  input logic [31:0] addr,
  output logic [{DATA_WIDTH}:0] data_out
);
  logic [{DATA_WIDTH}:0] memory [0:{MEM_SIZE}-1] = '{
{MEM_CONTENT}
  };

  always_ff @(posedge clk) begin
    data_out <= memory[addr];
  end
endmodule
`;

  ngOnInit(): void {
    this.memSize.set(this.initialMemSize);
    this.startAddress.set(this.initialStartAddress);
    this.memoryWidth.set(this.initialMemoryWidth);

    // Opcionalmente puedes regenerar el contenido inicial si es necesario:
    this.updateEditorContent();
  }

  // === MAIN METHODS === //

  setContent(content: string): void {
    this.baseText.set(content);
    this.updateEditorContent();
  }

  private updateEditorContent(): void {
    if (!this.exportTextEditor) return;

    const raw = this.baseText();
    if (!raw.trim()) return;

    const inputFormat = this.inputFormat();
    const outputFormat = this.outputFormat();
    const startAddress = this.startAddress();
    const memoryWidth = this.memoryWidth();
    const memSize = this.memSize();
    const componentName = this.componentName();

    const processed = this.processInput(raw, inputFormat);
    const output = this.generateOutput(processed, outputFormat, startAddress, memoryWidth, memSize, componentName);

    this.exportTextEditor.setContent(output);
    this.exportedContent = output;
  }

  private processInput(text: string, inputFormat: string): string[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const source = this.selectedOutputFormat;

    if (source === 'binary' && inputFormat === 'binary') return BinaryToBinary(lines).output;
    if (source === 'binary' && inputFormat === 'hexadecimal') return BinaryToHex(lines).output;
    if (source === 'hexadecimal' && inputFormat === 'binary') return HexToBinary(lines).output;
    if (source === 'hexadecimal' && inputFormat === 'hexadecimal') return HexToHex(lines).output;
    if (source === 'riscv' && inputFormat === 'binary') return RiscVToBinary(lines).output;
    if (source === 'riscv' && inputFormat === 'hexadecimal') return BinaryToHex(RiscVToBinary(lines).output).output;

    return lines;
  }

  private generateOutput(
    lines: string[],
    outputFormat: string,
    start: number,
    memoryWidth: 8 | 32,
    memSize: number,
    componentName: string
  ): string {
    switch (outputFormat) {
      case 'text':
        return lines.join('\n');
      case 'vhdl':
        return this.generateHDL(this.VHDL_TEMPLATE, lines, start, memoryWidth, memSize, componentName);
      case 'verilog':
        return this.generateHDL(this.VERILOG_TEMPLATE, lines, start, memoryWidth, memSize, componentName);
      default:
        return '';
    }
  }

  /**
   * Genera el contenido HDL dividiendo las instrucciones en partes según memoryWidth.
   * Si memoryWidth = 8, cada instrucción (de 32 bits) se divide en 4 bytes.
   * Si memoryWidth = 32, se usa tal cual.
   */
  private generateHDL(
  template: string,
  lines: string[],
  start: number,
  memoryWidth: 8 | 32,
  memSize: number,
  componentName: string
): string {
  const dataWidth = memoryWidth - 1;
  const memLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHex = line.startsWith('0x') || line.startsWith('0X');

    if (memoryWidth === 8) {
      if (isHex) {
        // === HEXADECIMAL MODE ===
        const clean = line.replace(/^0x/i, '').padStart(8, '0');
        const parts = [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6), clean.slice(6, 8)];
        for (let j = 0; j < parts.length; j++) {
          const addr = start + i * 4 + j;
          memLines.push(`    ${addr} => "0x${parts[j]}"`);
        }
      } else {
        // === BINARY MODE ===
        const clean = line.replace(/\s+/g, '').padStart(32, '0'); // asegurar 32 bits
        const parts = [clean.slice(0, 8), clean.slice(8, 16), clean.slice(16, 24), clean.slice(24, 32)];
        for (let j = 0; j < parts.length; j++) {
          const addr = start + i * 4 + j;
          memLines.push(`    ${addr} => "${parts[j]}"`);
        }
      }
    } else {
      // === 32-bit WIDTH ===
      const addr = start + i;
      memLines.push(`    ${addr} => "${line}"`);
    }
  }

  const memContent = memLines.join(',\n');

  return template
    .replaceAll('{MEM_SIZE}', memSize.toString())
    .replaceAll('{MEM_CONTENT}', memContent)
    .replaceAll('{COMPONENT_NAME}', componentName)
    .replaceAll('{DATA_WIDTH}', dataWidth.toString());
}


  // === UI METHODS === //

  onClose(): void {
    this.close.emit();
  }

  onInputFormatChange(value: 'binary' | 'hexadecimal'): void {
    this.inputFormat.set(value);
    this.updateEditorContent();
  }

  onOutputFormatChange(value: 'text' | 'vhdl' | 'verilog'): void {
    this.outputFormat.set(value);
    this.updateEditorContent();
  }

  onStartAddressChange(value: number): void {
    this.startAddress.set(Number(value));
    this.updateEditorContent();
  }

  onMemoryWidthChange(value: 8 | 32): void {
    this.memoryWidth.set(value);
    this.updateEditorContent();
  }

  onSave(): void {
    const content = this.exportedContent;
    if (!content.trim()) {
      alert('There is no content to export.');
      return;
    }

    let extension = 'txt';
    if (this.outputFormat() === 'verilog') extension = 'v';
    else if (this.outputFormat() === 'vhdl') extension = 'vhd';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const fileName = `exported_data.${extension}`;
    saveAs(blob, fileName);
  }
}
