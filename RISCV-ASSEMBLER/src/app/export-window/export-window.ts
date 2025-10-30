import { Component, EventEmitter, Output, ViewChild, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextEditor } from '../text-editor/text-editor';
import { BinaryToHex, HexToBinary, BinaryToBinary, HexToHex, RiscVToBinary } from '../assembler/translator';

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

  // === INPUT FROM PARENT === //
  @Input({ required: true }) selectedOutputFormat!: 'binary' | 'hexadecimal' | 'riscv';

  // === REACTIVE SIGNALS === //
  baseText = signal(''); // Unprocessed text (set by the parent)
  inputFormat = signal<'binary' | 'hexadecimal'>('binary');
  outputFormat = signal<'text' | 'vhdl' | 'verilog'>('text');
  startAddress = signal(0);

  // === HDL TEMPLATES === //
  readonly VHDL_TEMPLATE = `
library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.NUMERIC_STD.ALL;

entity MemoryBlock is
  Port (
    clk : in STD_LOGIC;
    addr : in INTEGER range 0 to {MEM_SIZE}-1;
    data_out : out STD_LOGIC_VECTOR(7 downto 0)
  );
end MemoryBlock;

architecture Behavioral of MemoryBlock is
  type memory_t is array (0 to {MEM_SIZE}-1) of STD_LOGIC_VECTOR(7 downto 0);
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
module MemoryBlock(
  input logic clk,
  input logic [31:0] addr,
  output logic [7:0] data_out
);
  logic [7:0] memory [0:{MEM_SIZE}-1] = '{
{MEM_CONTENT}
  };

  always_ff @(posedge clk) begin
    data_out <= memory[addr];
  end
endmodule
`;

  // === MAIN METHODS === //

  /**
   * Called by the parent to set the base text.
   */
  setContent(content: string): void {
    this.baseText.set(content);
    this.updateEditorContent();
  }

  /**
   * Processes the text and updates the editor according to the selected formats.
   */
  private updateEditorContent(): void {
    if (!this.exportTextEditor) return;

    const raw = this.baseText();
    if (!raw.trim()) return;

    const inputFormat = this.inputFormat();
    const outputFormat = this.outputFormat();
    const startAddress = this.startAddress();

    const processed = this.processInput(raw, inputFormat);
    const output = this.generateOutput(processed, outputFormat, startAddress);

    this.exportTextEditor.setContent(output);
  }

  /**
   * Converts the text from the original format (selectedOutputFormat)
   * to the desired input format (chosen from the dropdown).
   */
  private processInput(text: string, inputFormat: string): string[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const source = this.selectedOutputFormat; // Original format

    console.log("Source:", source, "Target input format:", inputFormat);

    // === POSSIBLE CONVERSIONS === //
    if (source === 'binary' && inputFormat === 'binary') {
      return BinaryToBinary(lines).output;
    }

    if (source === 'binary' && inputFormat === 'hexadecimal') {
      return BinaryToHex(lines).output;
    }

    if (source === 'hexadecimal' && inputFormat === 'binary') {
      return HexToBinary(lines).output;
    }

    if (source === 'hexadecimal' && inputFormat === 'hexadecimal') {
      return HexToHex(lines).output;
    }

    if (source === 'riscv' && inputFormat === 'binary') {
      return RiscVToBinary(lines).output;
    }

    if (source === 'riscv' && inputFormat === 'hexadecimal') {
      return BinaryToHex(RiscVToBinary(lines).output).output;
    }

    // Fallback: return lines as-is
    return lines;
  }

  /**
   * Generates the output based on the selected output format.
   */
  private generateOutput(lines: string[], outputFormat: string, start: number): string {
    switch (outputFormat) {
      case 'text':
        return lines.join('\n');

      case 'vhdl':
        return this.generateHDL(this.VHDL_TEMPLATE, lines, start);

      case 'verilog':
        return this.generateHDL(this.VERILOG_TEMPLATE, lines, start);

      default:
        return '';
    }
  }

  /**
   * Inserts the memory data into the corresponding HDL template.
   */
  private generateHDL(template: string, lines: string[], start: number): string {
    const memContent = lines
      .map((line, i) => `    ${i + start} => "${line}"`)
      .join(',\n');

    return template
      .replace('{MEM_SIZE}', (lines.length + start).toString())
      .replace('{MEM_CONTENT}', memContent);
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
}
