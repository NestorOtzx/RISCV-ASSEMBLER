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
    // validación básica de límites
    if (bytes < this.memoryConfig.minSize || bytes > this.memoryConfig.maxSize) {
      this.memorySizeError = `Valor fuera de rango (${this.formatSize(this.memoryConfig.minSize)} - ${this.formatSize(this.memoryConfig.maxSize)})`;
      // actualizar visualmente errores en secciones mediante una simulación mínima
      const simulated = this.memorySections.map(s => ({ ...s }));
      simulated[simulated.length - 1].end = bytes;
      this.validateSections(simulated); // esto copia errores a real
      return;
    }

    // simulación completa
    const simulated = this.memorySections.map(s => ({ ...s }));
    const lastIndex = simulated.length - 1;
    simulated[lastIndex].end = bytes;

    const ok = this.validateSections(simulated, bytes);
    if (ok) {
      this.memorySizeInput = numericValue;
      this.memorySize = bytes;
      this.memorySections = simulated;
      this.memorySizeError = undefined;
    } else {
      // aquí validateSections ya copió los errores a memorySections; añadimos un mensaje global
      this.memorySizeError = 'Cambio inválido: revisa las secciones resaltadas.';
    }
  }



  onMemoryUnitChange(event?: Event) {
  // Obtener la unidad anterior (antes de que Angular actualice)
  const oldUnit = this.previousUnit || this.memoryUnit;
  const newUnit = (event?.target as HTMLSelectElement)?.value || this.memoryUnit;

  // Convertir el valor actual a bytes usando la unidad anterior
  const bytes = this.getBytesFromUnit(this.memorySizeInput, oldUnit);

  // Calcular el nuevo valor visual según la nueva unidad
  const newValue = this.convertBytesToUnit(bytes, newUnit);

  // Simular la asignación del nuevo tamaño (no aplicar hasta validar)
  const simulated = this.memorySections.map(s => ({ ...s }));
  simulated[simulated.length - 1].end = bytes;

  const ok = this.validateSections(simulated, bytes);
  if (ok) {
    // aplicar cambio
    this.memoryUnit = newUnit;
    this.memorySizeInput = parseFloat(newValue.toFixed(2));
    this.memorySize = bytes;
    this.memorySections = simulated;
    this.memorySizeError = undefined;
  } else {
    // copiar errores ya hecho por validateSections; no cambiar unidad ni valor visible
    this.memorySizeError = 'Cambio de unidad inválido: revisa las secciones resaltadas.';
    // mantener previousUnit para la próxima vez
    // (no sobrescribimos memoryUnit porque ngModel ya lo cambió, así que lo volvemos atrás)
    this.memoryUnit = oldUnit;
  }

  // Guardar la nueva unidad (si fue exitosa) o mantener previousUnit para el próximo cambio
  this.previousUnit = this.memoryUnit;
}



  convertBytesToUnit(bytes: number, unit: string): number {
    switch (unit) {
      case 'KB': return bytes / 1024;
      case 'MB': return bytes / (1024 * 1024);
      case 'GB': return bytes / (1024 * 1024 * 1024);
      default: return bytes;
    }
  }




  updateSectionEnd(name: string, value: string) {
    const index = this.memorySections.findIndex(s => s.name === name && s.editable);
    if (index === -1) return;

    const newEnd = this.parseHex(value);
    if (newEnd <= 0) return;

    // Crear copia simulada
    const simulated = this.memorySections.map(s => ({ ...s }));
    simulated[index].end = newEnd;

    // Validar primero
    if (this.validateSections(simulated)) {
      // ✅ Si pasa validación, aplicar cambios reales
      this.memorySections = simulated;
    }
  }


  // ================= VALIDACIONES =================
  validateSections(testSections: MemorySection[], bytes?: number): boolean {
    const tempEnds = testSections.map(s => s.end);
    const memsize = bytes? bytes : this.memorySize;
    tempEnds[tempEnds.length - 1] = memsize;

    let isAscending = true;
    for (let i = 1; i < tempEnds.length; i++) {
      if (tempEnds[i] <= tempEnds[i - 1]) {
        isAscending = false;
        testSections[i].error = 'This segment end is not correct.';
      } else {
        testSections[i].error = undefined;
      }
    }

    this.memorySections.forEach((realSection, i) => {
      realSection.error = testSections[i].error;
    });


    return isAscending;
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
      minHeight: '60px', // 👈 asegura que el texto no se oculte
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  }

  getSectionStart(index: number): number {
    return index === 0 ? 0 : this.memorySections[index - 1].end;
  }
}
