import { Component, EventEmitter, Output, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface MemorySection {
  name: string;
  // Internamente `end` se guarda en DIRECCIONES (no en bytes)
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
export class MemorySizeEditor implements OnInit, OnChanges {
  @Output() close = new EventEmitter<void>();

  readonly MAX_SECTION_SIZE: number = 64;

  // Entradas externas: `memorySize` viene por compatibilidad (se asume BYTES)
  @Input() sections!: MemorySection[];
  @Input() memorySize!: number; // Entrada heredada: tamaño FÍSICO en BYTES
  @Input() unit!: string;

  // NUEVO: recibir el width desde el padre (8 o 32)
  @Input() width?: number;

  @Output() update = new EventEmitter<{ sections: MemorySection[]; size: number; unit: string, width: number }>();

  // ================= NUEVO: ancho de memoria (bits) =================
  memoryWidth: number = 8; // 8 o 32

  // ================= CONFIGURACIÓN BASE =================
  memoryConfig = {
    minSize: 0x00000100, // 1 KiB (bytes)
    defaultSize: 0x0400, // 4 GiB
    maxSize: 0x1000000000 // 64 GiB
  };

  // Tamaño físico constante en bytes (mantener fijo al cambiar width)
  physicalSizeBytes: number = 0;

  // Interno: secciones guardadas EN DIRECCIONES
  memorySections: MemorySection[] = [];

  // memorySize ahora será el tamaño LÓGICO (en direcciones)
  memorySizeInput: number = 0; // valor mostrado en el input (representa tamaño físico)
  memoryUnit: string = '';
  previousUnit: string = 'B';
  memorySizeError?: string;

  // ================= CONVERSIÓN Y AYUDANTES =================
  get bytesPerAddress(): number {
    return this.memoryWidth / 8;
  }

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

  // ================= LIFECYCLE =================
  ngOnInit() {
    // Si el padre pasó un width, úsalo; si no, mantener el default (8)
    if (this.width !== undefined) this.memoryWidth = this.width;

    // Guardamos el tamaño físico que llega por input (en bytes)
    this.physicalSizeBytes = this.memorySize;

    // Inicializamos unidad y control visual (input muestra tamaño físico)
    this.memoryUnit = this.unit;
    this.memorySizeInput = this.convertBytesToUnit(this.physicalSizeBytes, this.memoryUnit);

    // Convertimos las secciones que vienen (probablemente en BYTES) a DIRECCIONES
    const bytesPerAddr = this.bytesPerAddress;
    this.memorySections = structuredClone(this.sections || []).map(s => {
      return {
        ...s,
        end: Math.floor((s.end ?? 0) / bytesPerAddr)
      };
    });

    // Calculamos tamaño lógico (direcciones) a partir del tamaño físico
    this.memorySize = Math.floor(this.physicalSizeBytes / bytesPerAddr);

    // Forzar que la última sección termine exactamente al final lógico
    if (this.memorySections.length > 0) {
      this.memorySections[this.memorySections.length - 1].end = this.memorySize;
    }

    // Validamos e inicializamos (propaga errores si existen)
    this.validateSections(this.memorySections);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si el padre cambió el width mientras el editor está abierto, lo aplicamos
    if (changes['width'] && !changes['width'].isFirstChange()) {
      const newWidth = changes['width'].currentValue;
      if (newWidth === undefined) return;
      // Reutilizar la lógica interna para cambiar width (reescala y revalida)
      this.onSelectMemoryWidth(newWidth);
    }
    // Si el padre cambió sections/memorySize/unit directamente mientras abierto,
    // podríamos reaccionar aquí también, pero evitar cambios automáticos no esperados.
  }

  // ================= MÉTODOS ÚTILES =================
  toHex(value: number): string {
    return '0x' + value.toString(16).toUpperCase();
  }

  parseHex(value: string): number {
    if (!value) return 0;
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
    // eliminar prefijos y caracteres no hex
    const clean = value.replace(/[^0-9A-Fa-f]/g, '');
    return clean ? parseInt(clean, 16) : 0;
  }

  // ================= CIERRE =================
  onCloseClick() {
    this.close.emit();
  }

  // ================= ACTUALIZAR TAMAÑO (INPUT) =================
  onMemorySizeInputChange(value: string) {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;

    // Interpretamos input como tamaño físico (bytes) en la unidad seleccionada
    const newPhysicalBytes = this.getBytesFromUnit(numericValue, this.memoryUnit);

    // Validación de límites en bytes
    if (newPhysicalBytes < this.memoryConfig.minSize || newPhysicalBytes > this.memoryConfig.maxSize) {
      this.memorySizeError = `Value out of range (${this.formatSize(this.memoryConfig.minSize)} - ${this.formatSize(this.memoryConfig.maxSize)})`;
      return;
    }

    // Calculamos nuevo tamaño lógico (direcciones)
    const newLogicalSize = Math.floor(newPhysicalBytes / this.bytesPerAddress);

    // Simulamos la última sección terminando en newLogicalSize
    const simulated = this.memorySections.map(s => ({ ...s }));
    if (simulated.length > 0) simulated[simulated.length - 1].end = newLogicalSize;

    // Siempre actualizamos la UI con la simulación para que los arreglos parciales se reflejen
    this.memorySections = simulated;

    const ok = this.validateSections(simulated, newLogicalSize);
    if (ok) {
      // Si la simulación es válida, aplicamos cambios definitivos y emitimos
      this.memorySizeInput = numericValue;
      this.physicalSizeBytes = newPhysicalBytes;
      this.memorySize = newLogicalSize;
      this.memorySizeError = undefined;
      this.emit();
    } else {
      // Si hay errores, mostramos mensaje pero dejamos la simulación aplicada
      this.memorySizeError = 'Invalid change: this change overlaps a section end, please check the highlighted sections.';
    }
  }

  // ================= EMIT =================
  emit() {
    // Emitimos tamaño físico en BYTES y sections convertidas a BYTES (compatibilidad)
    const bytesPerAddr = this.bytesPerAddress;
    const emittedSections = this.memorySections.map(s => ({
      ...s,
      // convertir end (direcciones) a bytes
      end: s.end * bytesPerAddr
    }));

    this.update.emit({
      sections: emittedSections,
      size: this.physicalSizeBytes,
      unit: this.memoryUnit,
      width: this.memoryWidth
    });
  }

  // ================= CAMBIO DE UNIDAD =================
  onMemoryUnitChange(event?: Event) {
    const oldUnit = this.previousUnit || this.memoryUnit;
    const newUnit = (event?.target as HTMLSelectElement)?.value || this.memoryUnit;

    // Interpretamos memorySizeInput como representación del tamaño físico en la unidad antigua
    const physicalBytes = this.getBytesFromUnit(this.memorySizeInput, oldUnit);

    // Nuevo valor visual para el input
    const newValue = this.convertBytesToUnit(physicalBytes, newUnit);

    // Calcular nuevo tamaño lógico (direcciones)
    const newLogicalSize = Math.floor(physicalBytes / this.bytesPerAddress);

    // Simulamos la última sección terminando en newLogicalSize
    const simulated = this.memorySections.map(s => ({ ...s }));
    if (simulated.length > 0) simulated[simulated.length - 1].end = newLogicalSize;

    // Aplicamos la simulación a la UI siempre
    this.memorySections = simulated;

    const ok = this.validateSections(simulated, newLogicalSize);
    if (ok) {
      this.memoryUnit = newUnit;
      this.memorySizeInput = parseFloat(newValue.toFixed(2));
      this.physicalSizeBytes = physicalBytes;
      this.memorySize = newLogicalSize;
      this.memorySections = simulated;
      this.memorySizeError = undefined;
      this.emit();
    } else {
      this.memorySizeError = 'Invalid unit change: this change overlaps a section end, please check the highlighted sections.';
      this.memoryUnit = oldUnit;
    }

    this.previousUnit = this.memoryUnit;
  }

  // ================= SECCIONES =================
  updateSectionEnd(name: string, value: string) {
    const index = this.memorySections.findIndex(s => s.name === name && s.editable);
    if (index === -1) return;

    // parseHex devuelve un número (interpretado como dirección)
    const newEnd = this.parseHex(value);
    if (newEnd <= 0) return;

    const simulated = this.memorySections.map(s => ({ ...s }));
    simulated[index].end = newEnd;

    // Aplicamos la simulación a la UI para que la corrección se vea inmediatamente
    this.memorySections = simulated;

    const ok = this.validateSections(simulated);
    if (ok) {
      // Si la simulación es válida, emitimos
      // Asegurar que la última sección llegue al final lógico
      if (this.memorySections.length > 0) {
        this.memorySections[this.memorySections.length - 1].end = this.memorySize;
      }
      this.emit();
    } else {
      // Si hay errores, no revertimos; el usuario verá las marcas de error por sección y podrá corregirlas
    }
  }

  // ================= VALIDACIONES =================
  validateSections(testSections: MemorySection[], bytes?: number): boolean {
    // En esta función `bytes` (si se pasa) es el tamaño LÓGICO (direcciones), no bytes físicos
    const tempEnds = testSections.map(s => s.end);
    const memsize = bytes ? bytes : this.memorySize;
    // Forzamos el último end a memsize para validar correctamente
    tempEnds[tempEnds.length - 1] = memsize;

    let isAscending = true;

    // --- Validación especial para la primera sección: debe terminar > 0 (tamaño positivo) ---
    if (tempEnds.length > 0) {
      if (tempEnds[0] <= 0) {
        isAscending = false;
        testSections[0].error = 'Segment end must be greater than start (non-zero length).';
      } else {
        testSections[0].error = undefined;
      }
    }

    // --- Validación para el resto: cada end debe ser mayor que el end anterior ---
    for (let i = 1; i < tempEnds.length; i++) {
      if (tempEnds[i] <= tempEnds[i - 1]) {
        isAscending = false;
        testSections[i].error = 'Invalid end address for this segment.';
      } else {
        testSections[i].error = undefined;
      }

      // Adicional: evitar tamaños cero entre cualquier par consecutivo
      if (tempEnds[i] - tempEnds[i - 1] <= 0) {
        isAscending = false;
        testSections[i].error = 'Segment must have positive size.';
      }
    }

    // Copiamos errores a las secciones reales
    this.memorySections.forEach((realSection, i) => {
      realSection.error = testSections[i]?.error;
    });

    // Forzar que la última sección termine exactamente en memsize (modelo consistente)
    if (this.memorySections.length > 0) {
      this.memorySections[this.memorySections.length - 1].end = memsize;
    }

    this.memorySections = [...this.memorySections];
    return isAscending;
  }

  // ================= VISUALIZACIÓN =================
  getSectionStyle(section: MemorySection, index: number) {
    let start = 0;
    if (index > 0) start = this.memorySections[index - 1].end;

    // Evitar división por cero
    const total = this.memorySize || 1;
    const lastIndex = this.memorySections.length - 1;

    // Forzamos que el último elemento use this.memorySize como end
    const end = index === lastIndex ? this.memorySize : section.end;

    const sectionSize = Math.max(end - start, 0);
    const percentage = total > 0 ? (sectionSize / total) * 100 : 0;

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

  // ================= REESCALADO Y CAMBIO DE WIDTH =================
  rescaleSections(newLogicalSize: number, oldLogicalSize: number) {
    if (oldLogicalSize <= 0) return;
    const scale = newLogicalSize / oldLogicalSize;
    this.memorySections = this.memorySections.map(s => ({
      ...s,
      end: Math.floor(s.end * scale)
    }));

    // Asegurar último elemento llegue al final lógico
    if (this.memorySections.length > 0) {
      this.memorySections[this.memorySections.length - 1].end = newLogicalSize;
    }
  }

  onSelectMemoryWidth(width: number) {
    if (this.memoryWidth === width) return;

    const oldLogical = this.memorySize;
    this.memoryWidth = width;

    // Recalcular nuevo tamaño lógico a partir del tamaño físico
    const newLogical = Math.floor(this.physicalSizeBytes / this.bytesPerAddress);

    // Reescalamos proporcionalmente
    if (oldLogical > 0) {
      this.rescaleSections(newLogical, oldLogical);
    } else {
      // Si no había logical previo, simplemente forzamos el final
      if (this.memorySections.length > 0) {
        this.memorySections[this.memorySections.length - 1].end = newLogical;
      }
    }

    // Aplicamos la simulación a la UI
    this.memorySections = [...this.memorySections];

    // Actualizamos tamaño lógico y control visual (input muestra tamaño físico)
    this.memorySize = newLogical;
    this.memorySizeInput = this.convertBytesToUnit(this.physicalSizeBytes, this.memoryUnit);

    // Validamos (actualiza errores por sección) y si está bien emitimos; si no, dejamos la UI con los errores
    const ok = this.validateSections(this.memorySections, this.memorySize);
    if (ok) {
      this.emit();
    }
  }
}
