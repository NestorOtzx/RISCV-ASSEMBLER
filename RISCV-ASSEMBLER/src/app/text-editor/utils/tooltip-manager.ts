export class TooltipManager {
  el: HTMLDivElement;
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'tooltip';
    this.el.style.position = 'fixed';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  show(text: string, x: number, y: number) {
    this.el.textContent = text;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }

  destroy() {
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  }
}
