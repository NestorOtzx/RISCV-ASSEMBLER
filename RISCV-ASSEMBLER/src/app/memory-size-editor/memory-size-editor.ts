import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface MemorySection {
  name: string;
  end: number;
  color: string;
  error?: string;
  editable?: boolean;
}

@Component({
  selector: 'app-memory-size-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './memory-size-editor.html',
  styleUrls: ['./memory-size-editor.css']
})
export class MemorySizeEditor implements OnInit {
  @Output() close = new EventEmitter<void>();

  readonly MAX_SECTION_SIZE: number = 64;

  // ================= CONFIGURACIÓN BASE =================
  memoryConfig = {
    minSize: 0x00000100, // 1 KiB
    defaultSize: 0x100000000, // 4 GiB
    maxSize: 0x1000000000 // 64 GiB
  };

  memorySize: number = this.memoryConfig.defaultSize;
  memorySizeInput: number = 4; // valor inicial (4 GB)
  memoryUnit: string = 'GB';
  previousUnit: string = 'GB';
  memorySizeError?: string;

  // ================= CONVERSIÓN DE UNIDADES =================
  getBytesFromUnit(value: number, unit: string): number {
    switch (unit) {
      case 'B': return value;
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      case 'HEX': return parseInt(value.toString(), 16);
      default: return value;
    }
  }

  getUnitFromBytes(bytes: number): { value: number, unit: string } {
    if (bytes % (1024 ** 3) === 0) return { value: bytes / (1024 ** 3), unit: 'GB' };
    if (bytes % (1024 ** 2) === 0) return { value: bytes / (1024 ** 2), unit: 'MB' };
    if (bytes % 1024 === 0) return { value: bytes / 1024, unit: 'KB' };
    if (Number.isInteger(bytes)) return { value: parseInt(bytes.toString(16).toUpperCase(), 16), unit: 'HEX' };
    return { value: bytes, unit: 'B' };
  }


  formatSize(bytes: number): string {
    if (bytes >= 1024 ** 3) return (bytes / (1024 ** 3)).toFixed(2) + ' GB';
    if (bytes >= 1024 ** 2) return (bytes / (1024 ** 2)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  }

  // ================= SECCIONES BASE =================
  memorySections: MemorySection[] = [
    { name: 'Reserved', end: 0x00400000, color: '#008cffff', editable: true },
    { name: 'Text', end: 0x10000000, color: '#5900ffff', editable: true },
    { name: 'Static Data', end: 0x20000000, color: '#1f0066ff', editable: true },
    { name: 'Stack / Dynamic Data', end: 0x3ffffffff0, color: '#41005aff', editable: false }
  ];

  // ================= UNITY LIFECYCLE METHODS =================
  ngOnInit() {
    this.validateSections(this.memorySections);
  }

  // ================= MÉTODOS DE FORMATEO =================
  toHex(value: number): string {
    return '0x' + value.toString(16).toUpperCase();
  }

  parseHex(value: string): number {
    if (!value) return 0;
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
    return parseInt(value.replace(/[^0-9A-Fa-f]/g, ''), 16);
  }

  // ================= CIERRE =================
  onCloseClick() {
    this.close.emit();
  }

  // ================= ACTUALIZAR MEMORIA =================
  onMemorySizeInputChange(value: string) {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;

    const bytes = this.getBytesFromUnit(numericValue, this.memoryUnit);

    // 🔸 Validación básica de límites
    if (bytes < this.memoryConfig.minSize || bytes > this.memoryConfig.maxSize) {
      this.memorySizeError = `Value out of range (${this.formatSize(this.memoryConfig.minSize)} - ${this.formatSize(this.memoryConfig.maxSize)})`;
      return;
    }

    const simulated = this.memorySections.map(s => ({ ...s }));
    const lastIndex = simulated.length - 1;
    simulated[lastIndex].end = bytes;

    const ok = this.validateSections(simulated, bytes);
    if (ok) {
      this.memorySizeInput = numericValue;
      this.memorySize = bytes;
      this.memorySizeError = undefined;
      this.memorySections = simulated;
    } else {
      this.memorySizeError = 'Invalid change: this change overlaps a section end, please check the highlighted sections.';
    }
  }

  onMemoryUnitChange(event?: Event) {
    const oldUnit = this.previousUnit || this.memoryUnit;
    const newUnit = (event?.target as HTMLSelectElement)?.value || this.memoryUnit;

    // 🔹 Convertir el valor actual a bytes usando la unidad anterior
    const bytes = this.getBytesFromUnit(this.memorySizeInput, oldUnit);

    // 🔹 Calcular el nuevo valor visual según la nueva unidad
    const newValue = this.convertBytesToUnit(bytes, newUnit);

    // 🔹 Simular validación
    const simulated = this.memorySections.map(s => ({ ...s }));
    simulated[simulated.length - 1].end = bytes;

    const ok = this.validateSections(simulated, bytes);
    if (ok) {
      this.memoryUnit = newUnit;
      this.memorySizeInput = parseFloat(newValue.toFixed(2));
      this.memorySize = bytes;
      this.memorySections = simulated;
      this.memorySizeError = undefined;
    } else {
      this.memorySizeError = 'Invalid unit change: this change overlaps a section end, please check the highlighted sections.';
      this.memoryUnit = oldUnit;
    }

    this.previousUnit = this.memoryUnit;
  }

  convertBytesToUnit(bytes: number, unit: string): number {
    switch (unit) {
      case 'B': return bytes;
      case 'KB': return bytes / 1024;
      case 'MB': return bytes / (1024 * 1024);
      case 'GB': return bytes / (1024 * 1024 * 1024);
      case 'HEX': return parseFloat(bytes.toString(16).toUpperCase());
      default: return bytes;
    }
  }

  // ================= SECCIONES =================
  updateSectionEnd(name: string, value: string) {
    const index = this.memorySections.findIndex(s => s.name === name && s.editable);
    if (index === -1) return;

    const newEnd = this.parseHex(value);
    if (newEnd <= 0) return;

    const simulated = this.memorySections.map(s => ({ ...s }));
    simulated[index].end = newEnd;

    if (this.validateSections(simulated)) {
      this.memorySections = simulated;
    }
  }

  // ================= VALIDACIONES =================
  validateSections(testSections: MemorySection[], bytes?: number): boolean {
    const tempEnds = testSections.map(s => s.end);
    const memsize = bytes ? bytes : this.memorySize;
    tempEnds[tempEnds.length - 1] = memsize;

    let isAscending = true;
    for (let i = 1; i < tempEnds.length; i++) {
      if (tempEnds[i] <= tempEnds[i - 1]) {
        isAscending = false;
        testSections[i].error = 'Invalid end address for this segment.';
      } else {
        testSections[i].error = undefined;
      }
    }

    this.memorySections.forEach((realSection, i) => {
      realSection.error = testSections[i].error;
    });

    this.memorySections = [...this.memorySections];
    return isAscending;
  }

  // ================= VISUALIZACIÓN =================
  getSectionStyle(section: MemorySection, index: number) {
    let start = 0;
    if (index > 0) start = this.memorySections[index - 1].end;

    const total = this.memorySize;
    const sectionSize = section.end - start;
    const percentage = (sectionSize / total) * 100;

    return {
      'background-color': section.color,
      height: `${Math.max(percentage, 1)}%`,
      minHeight: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  }

  getSectionStart(index: number): number {
    return index === 0 ? 0 : this.memorySections[index - 1].end;
  }
}
