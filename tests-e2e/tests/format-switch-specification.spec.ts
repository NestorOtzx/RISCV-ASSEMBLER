import { test, expect } from '@playwright/test';
import assemblerCases from './assembler-cases.json' assert { type: 'json' };

test.describe('Assembler format interactions (RISC-V ↔ Binary)', () => {
  for (const { riscv, binary } of assemblerCases) {
    test.describe(`Instruction: ${riscv}`, () => {

      test('should convert input RISCV → Binary (input format change)', async ({ page }) => {
        await page.goto('http://localhost:4200');

        const inputEditor = page.locator('[data-testid="text-editor-input"] [data-testid="div-content-editable"]');
        const inputSelect = page.locator('[data-testid="select-input-format"]');

        await inputEditor.click();
        await inputEditor.fill(riscv);
        await inputSelect.selectOption('binary');

        await page.waitForTimeout(5);
        await expect(inputEditor).toContainText(binary);
      });

      test('should convert output RISCV → Binary (output format change)', async ({ page }) => {
        await page.goto('http://localhost:4200');

        const inputEditor = page.locator('[data-testid="text-editor-input"] [data-testid="div-content-editable"]');
        const outputEditor = page.locator('[data-testid="text-editor-output"] [data-testid="div-content-editable"]');
        const inputSelect = page.locator('[data-testid="select-input-format"]');
        const outputSelect = page.locator('[data-testid="select-output-format"]');

        await inputSelect.selectOption('riscv');
        await outputSelect.selectOption('binary');

        await inputEditor.click();
        await inputEditor.fill(riscv);

        await page.waitForTimeout(5);
        await expect(outputEditor).toContainText(binary);
      });

      test('should switch RISCV ↔ Binary using the ↔ button', async ({ page }) => {
        await page.goto('http://localhost:4200');

        const inputEditor = page.locator('[data-testid="text-editor-input"] [data-testid="div-content-editable"]');
        const outputEditor = page.locator('[data-testid="text-editor-output"] [data-testid="div-content-editable"]');
        const inputSelect = page.locator('[data-testid="select-input-format"]');
        const outputSelect = page.locator('[data-testid="select-output-format"]');
        const switchButton = page.locator('[data-testid="btn-switch-formats"]');

        // Set formats: input = RISCV, output = Binary
        await inputSelect.selectOption('riscv');
        await outputSelect.selectOption('binary');

        // Write RISCV instruction
        await inputEditor.click();
        await inputEditor.fill(riscv);

        await page.waitForTimeout(5);
        await expect(outputEditor).toContainText(binary);

        // Switch formats (↔)
        await switchButton.click();

        // Now input should be Binary, output RISCV
        await expect(inputSelect).toHaveValue('binary');
        await expect(outputSelect).toHaveValue('riscv');

        // Input content should be the binary, output should revert to RISCV
        await page.waitForTimeout(5);
        await expect(inputEditor).toContainText(binary);
        await expect(outputEditor).toContainText(riscv);
      });
    });
  }
});
