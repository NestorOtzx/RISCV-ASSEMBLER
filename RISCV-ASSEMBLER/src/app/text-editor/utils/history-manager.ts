export class HistoryManager {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  constructor(private maxHistory = 200) {}

  init(html: string) {
    this.undoStack = [html];
    this.redoStack = [];
  }

  push(html: string) {
    const last = this.undoStack[this.undoStack.length - 1];
    if (html === last) return;
    this.undoStack.push(html);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): string | undefined {
    if (this.undoStack.length > 1) {
      const current = this.undoStack.pop()!;
      this.redoStack.push(current);
      return this.undoStack[this.undoStack.length - 1];
    }
    return undefined;
  }

  redo(): string | undefined {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop()!;
      this.undoStack.push(next);
      return next;
    }
    return undefined;
  }
}
