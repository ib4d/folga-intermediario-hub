import { test, expect } from '@playwright/test';

/**
 * FOLGA HUB - Main Flow E2E Test
 * Requirements: @playwright/test installed
 */

test.describe('Main Operational Flow', () => {
  
  test('Complete Candidate Journey', async ({ page }) => {
    // 1. Login as Intermediario
    await page.goto('/login');
    await page.fill('input[name="email"]', 'intermediario@folga.pl');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/candidatos');
    
    // 2. Create Candidate
    await page.click('text=Nuevo Candidato');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    await page.fill('input[name="phone"]', '+573001234567');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/candidatos\/[a-zA-Z0-9-]+/);

    // 3. Generate Registration Link
    await page.click('text=Generar Link');
    const registrationLink = await page.getAttribute('input[readonly]', 'value');
    expect(registrationLink).toContain('/registro/');

    // 4. Public Registration Flow
    await page.goto(registrationLink!);
    await expect(page).toContainText('Registro de Candidato');
    
    // Step 1: Personal Data
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.selectOption('select[name="gender"]', 'M');
    await page.fill('input[name="dateOfBirth"]', '1990-01-01');
    await page.click('text=Siguiente');

    // ... (Continue steps as needed)
    
    // 5. Legal Approval (Login as Legal)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'legal@folga.pl');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/legal');
    await page.click(`text=John Doe`);
    await page.click('text=Aprobar');
    
    // 6. Logistics Assignment
    await page.goto('/logistica');
    await expect(page).toContainText('John Doe');
  });

});
