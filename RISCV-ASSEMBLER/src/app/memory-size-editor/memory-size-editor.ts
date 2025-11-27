import { Component, EventEmitter, Output, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
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
export class MemorySizeEditor implements OnInit, OnChanges {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Output() close = new EventEmitter<void>();

  readonly MAX_SECTION_SIZE: number = 64;

  @Input() sections!: MemorySection[];
  @Input() memorySize!: number;
  @Input() unit!: string;

  @Input() width?: number;

  @Output() update = new EventEmitter<{ sections: MemorySection[]; size: number; unit: string, width: number }>();

  memoryWidth: number = 8; 

  memoryConfig = {
    minSize: 0x00000100, 
    defaultSize: 0x0400,
    maxSize: 0x1000000000 
  };

  physicalSizeBytes: number = 0;

  memorySections: MemorySection[] = [];

  memorySizeInput: number = 0; 
  memoryUnit: string = '';
  previousUnit: string = 'B';
  memorySizeError?: string;

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

  ngOnInit() {
    if (this.width !== undefined) this.memoryWidth = this.width;

    this.physicalSizeBytes = this.memorySize;

    this.memoryUnit = this.unit;
    this.memorySizeInput = this.convertBytesToUnit(this.physicalSizeBytes, this.memoryUnit);

    const bytesPerAddr = this.bytesPerAddress;
    this.memorySections = structuredClone(this.sections || []).map(s => {
      return {
        ...s,
        end: Math.floor((s.end ?? 0) / bytesPerAddr)
      };
    });

    this.memorySize = Math.floor(this.physicalSizeBytes / bytesPerAddr);

    if (this.memorySections.length > 0) {
      this.memorySections[this.memorySections.length - 1].end = this.memorySize;
    }

    this.validateSections(this.memorySections);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['width'] && !changes['width'].isFirstChange()) {
      const newWidth = changes['width'].currentValue;
      if (newWidth === undefined) return;
      this.onSelectMemoryWidth(newWidth);
    }
  }

  toHex(value: number): string {
    return '0x' + value.toString(16).toUpperCase();
  }

  parseHex(value: string): number {
    if (!value) return 0;
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
    const clean = value.replace(/[^0-9A-Fa-f]/g, '');
    return clean ? parseInt(clean, 16) : 0;
  }

  onCloseClick() {
    this.close.emit();
  }

  onMemorySizeInputChange(value: string) {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;

    const newPhysicalBytes = this.getBytesFromUnit(numericValue, this.memoryUnit);

    if (newPhysicalBytes < this.memoryConfig.minSize || newPhysicalBytes > this.memoryConfig.maxSize) {
      this.memorySizeError = `Value out of range (${this.formatSize(this.memoryConfig.minSize)} - ${this.formatSize(this.memoryConfig.maxSize)})`;
      return;
    }

    const newLogicalSize = Math.floor(newPhysicalBytes / this.bytesPerAddress);

    const simulated = this.memorySections.map(s => ({ ...s }));
    if (simulated.length > 0) simulated[simulated.length - 1].end = newLogicalSize;

    this.memorySections = simulated;

    const ok = this.validateSections(simulated, newLogicalSize);
    if (ok) {
      this.memorySizeInput = numericValue;
      this.physicalSizeBytes = newPhysicalBytes;
      this.memorySize = newLogicalSize;
      this.memorySizeError = undefined;
      this.emit();
    } else {
      this.memorySizeError = 'Invalid change: this change overlaps a section end, please check the highlighted sections.';
    }
  }

  emit() {
    const bytesPerAddr = this.bytesPerAddress;
    const emittedSections = this.memorySections.map(s => ({
      ...s,
      end: s.end * bytesPerAddr
    }));

    this.update.emit({
      sections: emittedSections,
      size: this.physicalSizeBytes,
      unit: this.memoryUnit,
      width: this.memoryWidth
    });
  }

  onMemoryUnitChange(event?: Event) {
    const oldUnit = this.previousUnit || this.memoryUnit;
    const newUnit = (event?.target as HTMLSelectElement)?.value || this.memoryUnit;

    const physicalBytes = this.getBytesFromUnit(this.memorySizeInput, oldUnit);

    const newValue = this.convertBytesToUnit(physicalBytes, newUnit);

    const newLogicalSize = Math.floor(physicalBytes / this.bytesPerAddress);

    const simulated = this.memorySections.map(s => ({ ...s }));
    if (simulated.length > 0) simulated[simulated.length - 1].end = newLogicalSize;

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

  updateSectionEnd(name: string, value: string) {
    const index = this.memorySections.findIndex(s => s.name === name && s.editable);
    if (index === -1) return;

    const newEnd = this.parseHex(value);
    if (newEnd <= 0) return;

    const simulated = this.memorySections.map(s => ({ ...s }));
    simulated[index].end = newEnd;

    this.memorySections = simulated;

    const ok = this.validateSections(simulated);
    if (ok) {
      if (this.memorySections.length > 0) {
        this.memorySections[this.memorySections.length - 1].end = this.memorySize;
      }
      this.emit();
    } else {
    }
  }

  validateSections(testSections: MemorySection[], bytes?: number): boolean {
    const tempEnds = testSections.map(s => s.end);
    const memsize = bytes ? bytes : this.memorySize;
    tempEnds[tempEnds.length - 1] = memsize;

    let isAscending = true;

    if (tempEnds.length > 0) {
      if (tempEnds[0] <= 0) {
        isAscending = false;
        testSections[0].error = 'Segment end must be greater than start (non-zero length).';
      } else {
        testSections[0].error = undefined;
      }
    }

    for (let i = 1; i < tempEnds.length; i++) {
      if (tempEnds[i] <= tempEnds[i - 1]) {
        isAscending = false;
        testSections[i].error = 'Invalid end address for this segment.';
      } else {
        testSections[i].error = undefined;
      }

      if (tempEnds[i] - tempEnds[i - 1] <= 0) {
        isAscending = false;
        testSections[i].error = 'Segment must have positive size.';
      }
    }

    this.memorySections.forEach((realSection, i) => {
      realSection.error = testSections[i]?.error;
    });

    if (this.memorySections.length > 0) {
      this.memorySections[this.memorySections.length - 1].end = memsize;
    }

    this.memorySections = [...this.memorySections];
    return isAscending;
  }

  getSectionStyle(section: MemorySection, index: number) {
    let start = 0;
    if (index > 0) start = this.memorySections[index - 1].end;

    const total = this.memorySize || 1;
    const lastIndex = this.memorySections.length - 1;

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

  rescaleSections(newLogicalSize: number, oldLogicalSize: number) {
    if (oldLogicalSize <= 0) return;
    const scale = newLogicalSize / oldLogicalSize;
    this.memorySections = this.memorySections.map(s => ({
      ...s,
      end: Math.floor(s.end * scale)
    }));

    if (this.memorySections.length > 0) {
      this.memorySections[this.memorySections.length - 1].end = newLogicalSize;
    }
  }

  onSelectMemoryWidth(width: number) {
    if (this.memoryWidth === width) return;

    const oldLogical = this.memorySize;
    this.memoryWidth = width;

    const newLogical = Math.floor(this.physicalSizeBytes / this.bytesPerAddress);

    if (oldLogical > 0) {
      this.rescaleSections(newLogical, oldLogical);
    } else {
      if (this.memorySections.length > 0) {
        this.memorySections[this.memorySections.length - 1].end = newLogical;
      }
    }

    this.memorySections = [...this.memorySections];

    this.memorySize = newLogical;
    this.memorySizeInput = this.convertBytesToUnit(this.physicalSizeBytes, this.memoryUnit);

    const ok = this.validateSections(this.memorySections, this.memorySize);
    if (ok) {
      this.emit();
    }
  }

  resetDefaults() {
    this.memoryWidth = 8;
    this.memoryUnit = 'B';
    this.physicalSizeBytes = 0x0400; 
    this.memorySize = Math.floor(this.physicalSizeBytes / this.bytesPerAddress);
    this.memorySizeInput = this.convertBytesToUnit(this.physicalSizeBytes, this.memoryUnit);

    this.memorySections = [
      { name: 'Reserved', end: 0x0040, color: '#008cffff', editable: true },
      { name: 'Text', end: 0x0100, color: '#5900ffff', editable: true },
      { name: 'Static Data', end: 0x0200, color: '#1f0066ff', editable: true },
      { name: 'Stack / Dynamic Data', end: 0x0400, color: '#41005aff', editable: false }
    ];

    this.memorySizeError = undefined;
    this.validateSections(this.memorySections, this.memorySize);

    this.emit();
  }

  exportConfiguration() {
    const bytesPerAddr = this.bytesPerAddress;
    const data = {
      memorySections: this.memorySections.map(section => ({
        name: section.name,
        end: section.end * bytesPerAddr 
      })),
      memorySize: this.physicalSizeBytes,
      memoryUnit: this.memoryUnit,
      memoryWidth: this.memoryWidth 
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'memory-config.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  importConfiguration(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        if (!Array.isArray(data.memorySections)) {
          alert('Invalid or corrupted configuration file.');
          return;
        }

        let updated = false;

        if (typeof data.memoryWidth === 'number' && (data.memoryWidth === 8 || data.memoryWidth === 32)) {
          if (this.memoryWidth !== data.memoryWidth) {
            this.memoryWidth = data.memoryWidth;
            updated = true;
          }
        }

        if (typeof data.memorySize === 'number' && data.memorySize > 0) {
          if (this.physicalSizeBytes !== data.memorySize) {
            this.physicalSizeBytes = data.memorySize;
            updated = true;
          }
        }

        if (typeof data.memoryUnit === 'string' && ['B', 'KB', 'MB', 'GB', 'HEX'].includes(data.memoryUnit)) {
          if (this.memoryUnit !== data.memoryUnit) {
            this.memoryUnit = data.memoryUnit;
            updated = true;
          }
        }

        const bytesPerAddr = this.bytesPerAddress;
        this.memorySize = Math.floor(this.physicalSizeBytes / (bytesPerAddr || 1));
        this.memorySizeInput = this.convertBytesToUnit(this.physicalSizeBytes, this.memoryUnit);

        for (const imported of data.memorySections) {
          if (typeof imported.name !== 'string' || typeof imported.end !== 'number') continue;

          const existing = this.memorySections.find(s => s.name === imported.name);
          if (existing && existing.editable) {
            const newEndLogical = Math.floor(imported.end / (bytesPerAddr || 1));
            if (existing.end !== newEndLogical) {
              existing.end = newEndLogical;
              updated = true;
            }
          }
        }

        if (this.memorySections.length > 0) {
          const lastIdx = this.memorySections.length - 1;
          if (this.memorySections[lastIdx].end !== this.memorySize) {
            this.memorySections[lastIdx].end = this.memorySize;
          }
        }

        const valid = this.validateSections(this.memorySections, this.memorySize);
        if (updated) {
          this.emit();
          alert('Configuration imported successfully.');
        } else {
          alert('No matching editable sections or valid memory parameters found.');
        }
      } catch (e) {
        alert('Error reading the JSON configuration file.');
      }

      input.value = '';
    };

    reader.readAsText(file);
  }


}
