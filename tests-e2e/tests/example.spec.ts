import { test, expect } from '@playwright/test';

test.describe('Angular App basic test', () => {
  test('should load the app and display the correct title', async ({ page }) => {
    // Ir a la URL base configurada en playwright.config.ts
    await page.goto('/');

    // Verificar que la página tiene un título de documento
    await expect(page).toHaveTitle("RISCVAssembler");
  });
});
