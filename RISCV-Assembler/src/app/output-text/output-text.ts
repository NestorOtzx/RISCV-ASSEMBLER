import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-output-text',
  imports: [],
  templateUrl: './output-text.html',
  styleUrl: './output-text.css',
  host: {
    class: 'flex flex-col md:w-1/2 w-full h-full border border-gray-600 rounded overflow-hidden bg-gray-800 font-mono'
  }
})
export class OutputText {
  @Input()
  outputText: string = '';

  get outputLines(): string[] {
    return this.outputText.split('\n');
  }
}
