import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Galaxy Z Flip unfolded (360x800)', width: 360, height: 800 },
  { name: 'Standard phone (390x844)', width: 390, height: 844 },
  { name: 'Desktop (1280x800)', width: 1280, height: 800 },
] as const;

async function expectZeroHorizontalOverflow(page: Page, contextLabel: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Horizontal overflow detected (${contextLabel}): scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
  ).toBeLessThanOrEqual(metrics.innerWidth);
}

for (const vp of VIEWPORTS) {
  test(`zero horizontal overflow & zero runtime errors on ${vp.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page.getByTestId('active-exercise-title')).toBeVisible();
    await expectZeroHorizontalOverflow(page, `${vp.name} initial`);

    // Check New Workout modal fits cleanly
    await page.getByRole('button', { name: 'New Workout' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectZeroHorizontalOverflow(page, `${vp.name} New Workout modal`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // Check Settings modal fits cleanly
    await page.getByLabel('Open timer settings').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectZeroHorizontalOverflow(page, `${vp.name} Settings modal`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // Check History modal fits cleanly
    await page.getByRole('button', { name: 'Open workout history', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectZeroHorizontalOverflow(page, `${vp.name} History modal`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    expect(errors).toEqual([]);
  });
}

test('Galaxy Z Flip core workout flow: New Workout -> Shuffle -> Start -> Pause -> Preview -> Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  // Open 1-screen New Workout overlay
  await page.getByRole('button', { name: 'New Workout' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Pick 10 min + Abs & Core and shuffle once
  await page.getByRole('button', { name: /10 min/i }).click();
  await page.getByRole('button', { name: /Abs & Core/i }).click();
  await expect(page.getByTestId('new-workout-preview')).toContainText('10:00');
  await page.getByRole('button', { name: 'Shuffle' }).click();

  // Start Workout immediately
  await page.getByRole('button', { name: 'Start Workout' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('active-routine-name')).toHaveText('10 min • Abs & Core');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

  // Pause & advance to first WORK step
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByLabel('Next step').click();
  await expect(page.getByTestId('phase-badge')).toHaveText('WORK');
  await expectZeroHorizontalOverflow(page, '360x800 active WORK step');

  // Verify Exercise Header uses full width (no cramped half-column wrapping) & single-line badge
  const headerBox = await page.getByTestId('exercise-header').boundingBox();
  const titleBox = await page.getByTestId('active-exercise-title').boundingBox();
  const badgeBox = await page.getByTestId('exercise-equipment-badge').boundingBox();
  expect(headerBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  expect(titleBox!.width).toBeGreaterThanOrEqual(headerBox!.width * 0.8);
  expect(badgeBox!.height).toBeLessThanOrEqual(28);

  // Non-destructive preview of an exercise from RoutineSidebar + single-row preview banner check
  const secondExerciseBtn = page.locator('aside button').filter({ hasText: /^2\./ }).first();
  await secondExerciseBtn.click();
  const backBtn = page.getByRole('button', { name: 'Back to Workout' });
  await expect(backBtn).toBeVisible();
  const previewBannerBox = await backBtn.locator('..').boundingBox();
  expect(previewBannerBox).not.toBeNull();
  expect(previewBannerBox!.height).toBeLessThanOrEqual(48);
  await backBtn.click();
  await expect(page.getByTestId('step-counter')).toContainText('2/');

  // Verify RoutineSidebar header keeps title and Add Exercise button on one row
  const addExBtn = page.getByRole('button', { name: 'Add Exercise' });
  const sidebarHeaderBox = await addExBtn.locator('..').boundingBox();
  expect(sidebarHeaderBox).not.toBeNull();
  expect(sidebarHeaderBox!.height).toBeLessThanOrEqual(52);

  // Open Add Exercise modal and dismiss with Escape
  await addExBtn.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectZeroHorizontalOverflow(page, '360x800 Add Exercise modal');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
