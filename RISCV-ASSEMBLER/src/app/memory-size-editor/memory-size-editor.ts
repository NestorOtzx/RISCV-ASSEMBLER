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

  // ================= CONFIGURACIÓN BASE =================
  memoryConfig = {
    minSize: 0x00000400, // 1 KiB
    defaultSize: 0x100000000, // 4 GiB
    maxSize: 0x1000000000 // 64 GiB
  };

  memorySize: number = this.memoryConfig.defaultSize;
  memorySizeInput: number = 4; // valor inicial (4 GB)
  memoryUnit: 'KB' | 'MB' | 'GB' = 'GB';

  // ================= CONVERSIÓN DE UNIDADES =================
  getBytesFromUnit(value: number, unit: string): number {
    switch (unit) {
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  getUnitFromBytes(bytes: number): { value: number, unit: string } {
    if (bytes % (1024 ** 3) === 0) return { value: bytes / (1024 ** 3), unit: 'GB' };
    if (bytes % (1024 ** 2) === 0) return { value: bytes / (1024 ** 2), unit: 'MB' };
    if (bytes % 1024 === 0) return { value: bytes / 1024, unit: 'KB' };
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
    // Asegura que la sección de Stack/Dynamic Data esté correctamente calculada al iniciar
    this.validateSections();
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
    if (isNaN(numericValue) || numericValue <= 0) return;

    const bytes = this.getBytesFromUnit(numericValue, this.memoryUnit);
    if (bytes < this.memoryConfig.minSize || bytes > this.memoryConfig.maxSize) return;

    this.memorySizeInput = numericValue;
    this.memorySize = bytes;
    this.validateSections();
  }

  onMemoryUnitChange() {
    // recalcular en bytes con nueva unidad
    this.memorySize = this.getBytesFromUnit(this.memorySizeInput, this.memoryUnit);
    this.validateSections();
  }


  updateSectionEnd(name: string, value: string) {
    const section = this.memorySections.find(s => s.name === name && s.editable);
    if (!section) return;

    const newEnd = this.parseHex(value);
    if (newEnd <= 0) {
      section.error = 'El valor no puede ser cero o negativo.';
      return;
    }

    section.end = newEnd;
    section.error = undefined;
    this.validateSections();
  }

  // ================= VALIDACIONES =================
  validateSections() {
    let currentStart = 0;

    for (let i = 0; i < this.memorySections.length; i++) {
      const section = this.memorySections[i];

      if (section.name === 'Stack / Dynamic Data') {
        // Se calcula automáticamente desde Static Data hasta el final de la memoria
        const prev = this.memorySections[i - 1];
        if (prev) {
          section.end = this.memorySize;
        }
        section.error = undefined;
        continue;
      }

      if (section.end <= currentStart) {
        section.error = 'El final debe ser mayor al inicio calculado.';
        continue;
      }

      if (section.end > this.memorySize) {
        section.error = 'Esta sección supera el tamaño total de la memoria.';
        continue;
      }

      section.error = undefined;
      currentStart = section.end;
    }
  }

  // ================= VISUALIZACIÓN =================
  getSectionStyle(section: MemorySection, index: number) {
    let start = 0;
    if (index > 0) start = this.memorySections[index - 1].end;

    const total = this.memorySize;
    const sectionSize = section.end - start;
    const percentage = (sectionSize / total) * 100;

    // Altura proporcional, con un mínimo visible de 40px
    return {
      'background-color': section.color,
      height: `${Math.max(percentage, 1)}%`,
      minHeight: '40px', // 👈 asegura que el texto no se oculte
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  }

  getSectionStart(index: number): number {
    return index === 0 ? 0 : this.memorySections[index - 1].end;
  }
}
