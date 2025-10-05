// extrae texto limpio y detecta labels (name + line)
export function extractContentAndLabels(editorEl: HTMLDivElement) {
  const lines: string[] = [];

  for (const child of Array.from(editorEl.children)) {
    if ((child as HTMLElement).tagName.toLowerCase() === 'div') {
      let text = (child as HTMLElement).innerText || '';

      text = text
        .replace(/\u00A0/g, ' ')   // NBSP -> space
        .replace(/\u200B/g, '')    // zero-width
        .replace(/\u2028|\u2029/g, '') // unicode line separators
        .replace(/\r\n|\r|\n/g, '') // internal newlines
        .trim();

      lines.push(text);
    }
  }

  const fullText = lines.join('\n');

  const labels: { name: string; line: number }[] = [];
  lines.forEach((line, i) => {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):$/);
    if (match) {
      labels.push({ name: match[1], line: i + 1 });
    }
  });

  return { text: fullText, labels, rawLines: lines };
}
