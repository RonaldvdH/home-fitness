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
    if (vp.width >= 1280) {
      const headerBox = await page.locator('header').boundingBox();
      expect(headerBox).not.toBeNull();
      expect(headerBox!.height).toBeLessThanOrEqual(76);
    }

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

test('Galaxy Z Flip Flex / Floor Mode (360x780): top half display, bottom half controls, zero overflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.getByTestId('active-exercise-title')).toBeVisible();
  await expectZeroHorizontalOverflow(page, '360x780 before Floor Mode');

  // Toggle Floor Mode from HeaderBar
  await page.getByLabel('Enter Floor Mode').click();
  await expect(page.getByTestId('flex-workout-view')).toBeVisible();

  // Assert zero horizontal AND zero vertical overflow (locked 100dvh split)
  const overflowMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(overflowMetrics.scrollWidth).toBeLessThanOrEqual(overflowMetrics.innerWidth);
  expect(overflowMetrics.scrollHeight).toBeLessThanOrEqual(overflowMetrics.innerHeight);

  // Assert Top Segment occupies top 50% (<= 390px) and contains animation + countdown timer
  const topSeg = page.getByTestId('flex-top-segment');
  const bottomSeg = page.getByTestId('flex-bottom-segment');
  const topBox = await topSeg.boundingBox();
  const bottomBox = await bottomSeg.boundingBox();
  const svgBox = await topSeg.getByRole('img', { name: /form demonstrator/i }).boundingBox();
  const timerBox = await topSeg.getByTestId('timer-display').boundingBox();
  const transportBox = await bottomSeg.getByTestId('flex-transport').boundingBox();

  expect(topBox).not.toBeNull();
  expect(bottomBox).not.toBeNull();
  expect(svgBox).not.toBeNull();
  expect(timerBox).not.toBeNull();
  expect(transportBox).not.toBeNull();

  // Top half invariants (0..390px)
  expect(topBox!.y).toBeLessThanOrEqual(1);
  expect(topBox!.y + topBox!.height).toBeLessThanOrEqual(391);
  expect(svgBox!.y + svgBox!.height).toBeLessThanOrEqual(391);
  expect(timerBox!.y + timerBox!.height).toBeLessThanOrEqual(391);

  // Bottom half invariants (390..780px)
  expect(bottomBox!.y).toBeGreaterThanOrEqual(389);
  expect(bottomBox!.y + bottomBox!.height).toBeLessThanOrEqual(781);
  expect(transportBox!.y).toBeGreaterThanOrEqual(389);
  expect(transportBox!.y + transportBox!.height).toBeLessThanOrEqual(781);

  // Interactive controls work smoothly in Floor Mode
  await bottomSeg.getByRole('button', { name: 'Start' }).click();
  await expect(bottomSeg.getByRole('button', { name: 'Pause' })).toBeVisible();
  await bottomSeg.getByRole('button', { name: 'Pause' }).click();
  await bottomSeg.getByLabel('Next step').click();
  await expect(topSeg.getByTestId('phase-badge')).toHaveText('WORK');

  // New Workout modal opens cleanly above Floor Mode and closes with Escape
  await bottomSeg.getByLabel('New Workout').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectZeroHorizontalOverflow(page, '360x780 Floor Mode New Workout modal');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('flex-workout-view')).toBeVisible();

  // Exit Floor Mode cleanly restores normal view with workout step preserved
  await bottomSeg.getByLabel('Exit Floor Mode').click();
  await expect(page.getByTestId('flex-workout-view')).toBeHidden();
  await expect(page.getByTestId('step-counter')).toContainText('2/');
  await expectZeroHorizontalOverflow(page, '360x780 after exiting Floor Mode');

  expect(errors).toEqual([]);
});
