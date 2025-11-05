import { test, expect, Page } from '@playwright/test';
import assemblerCases from './assembler-cases.json' assert { type: 'json' };

// ✅ Extendemos el tipo Clipboard para TypeScript
declare global {
  interface Clipboard {
    _content?: string;
  }
}

test.describe('Text Editor Toolbar Buttons (with clipboard mock)', () => {
  // Helpers
  const getInputEditor = (page: Page) =>
    page.locator('[data-testid="text-editor-input"]');

  const getInputContent = (page: Page) =>
    page.locator('[data-testid="text-editor-input"] [data-testid="div-content-editable"]');

  const getInputButtons = (page: Page) => ({
    undo: page.locator('[data-testid="text-editor-input"] [data-testid="btn-undo"]'),
    redo: page.locator('[data-testid="text-editor-input"] [data-testid="btn-redo"]'),
    copy: page.locator('[data-testid="text-editor-input"] [data-testid="btn-copy"]'),
    paste: page.locator('[data-testid="text-editor-input"] [data-testid="btn-paste"]'),
    clear: page.locator('[data-testid="text-editor-input"] [data-testid="btn-clear"]'),
  });

  const combinedText = assemblerCases.map(c => c.riscv).join('\n');

  // --- CONFIGURACIÓN GLOBAL ---
  test.beforeEach(async ({ context, page }) => {
    // 1️⃣ Otorgar permisos simulados al contexto
    await context.grantPermissions(['clipboard-read', 'clipboard-write', 'microphone', 'camera']);

    // 2️⃣ Mockear clipboard ANTES de cargar la app
    await page.addInitScript(() => {
      const mockClipboard = {
        _content: '',
        async writeText(text: string) {
          this._content = text;
        },
        async readText() {
          return this._content || '';
        },
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        configurable: true,
      });
    });

    // 3️⃣ Cargar la app
    await page.goto('http://localhost:4200');
  });

  // --- PRUEBA 1: UNDO / REDO ---
  test('should undo and redo correctly', async ({ page }) => {
    const inputEditor = getInputContent(page);
    const { undo, redo } = getInputButtons(page);

    await inputEditor.click();
    await inputEditor.fill(combinedText);
    await expect(inputEditor).toContainText(assemblerCases[0].riscv);

    await undo.click();
    await page.waitForTimeout(200);
    await redo.click();

    await expect(inputEditor).toContainText(assemblerCases[0].riscv);
  });

  // --- PRUEBA 2: COPY ---
  test('should copy text using mocked clipboard', async ({ page }) => {
    const inputEditor = getInputContent(page);
    const { copy } = getInputButtons(page);

    await inputEditor.click();
    await inputEditor.fill(combinedText);
    await copy.click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain(assemblerCases[0].riscv);
  });

  // --- PRUEBA 3: CLEAR ---
  test('should clear all content', async ({ page }) => {
    const inputEditor = getInputContent(page);
    const { clear } = getInputButtons(page);

    await inputEditor.click();
    await inputEditor.fill(combinedText);
    await clear.click();

    await expect(inputEditor).toHaveText('');
  });

  // --- PRUEBA 4: PASTE ---
  test('should paste copied content correctly using mocked clipboard', async ({ page }) => {
    const inputEditor = getInputContent(page);
    const { copy, clear, paste } = getInputButtons(page);

    await inputEditor.click();
    await inputEditor.fill(combinedText);
    await copy.click();

    await clear.click();
    await paste.click();

    await expect(inputEditor).toContainText(assemblerCases[0].riscv);
  });

  // --- PRUEBA 5: FULL SEQUENCE ---
  test('should perform full sequence: copy → clear → paste → clear', async ({ page }) => {
    const inputEditor = getInputContent(page);
    const { copy, clear, paste } = getInputButtons(page);

    await inputEditor.click();
    await inputEditor.fill(combinedText);

    await copy.click();
    const clipboardText = await page.evaluate(() => navigator.clipboard._content);
    expect(clipboardText).toContain(assemblerCases[0].riscv);

    await clear.click();
    await expect(inputEditor).toHaveText('');

    await paste.click();
    await expect(inputEditor).toContainText(assemblerCases[0].riscv);

    await clear.click();
    await expect(inputEditor).toHaveText('');
  });
});
