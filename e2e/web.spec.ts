import { expect, test } from '@playwright/test';

test('signup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'gaos' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  await expect(page).toMatchAriaSnapshot({ name: 'signup.aria.yml' });
});

test('signed-in', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'email' })
    .fill(`user-${crypto.randomUUID()}@example.com`);
  await page.getByRole('textbox', { name: 'password' }).fill('correct-horse');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('signed in')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  await page.getByRole('textbox', { name: 'email' }).clear();
  await page.getByRole('textbox', { name: 'password' }).clear();
  await expect(page).toMatchAriaSnapshot({ name: 'signed-in.aria.yml' });
});
