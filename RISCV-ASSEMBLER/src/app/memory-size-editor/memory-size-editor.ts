import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-memory-size-editor',
  imports: [],
  templateUrl: './memory-size-editor.html',
  styleUrl: './memory-size-editor.css'
})
export class MemorySizeEditor {
  @Output() close = new EventEmitter<void>();

  onCloseClick() {
    this.close.emit();
  }
}
