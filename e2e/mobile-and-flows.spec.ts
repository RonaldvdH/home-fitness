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

async function dismissDialogWithEscape(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Verify Base UI's post-mount focus trap & useDismiss effect settled (Preact flushes useEffect on rAF)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.querySelector('[role="dialog"]');
        return Boolean(el && document.activeElement && el.contains(document.activeElement));
      }),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
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
    await dismissDialogWithEscape(page);

    // Check unified Settings modal (Timer & Audio, Spaces, Data & Backup) fits cleanly
    await page.getByLabel('Open settings').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectZeroHorizontalOverflow(page, `${vp.name} Settings modal (Timer & Audio)`);
    await page.getByRole('tab', { name: /Spaces/i }).click();
    await expectZeroHorizontalOverflow(page, `${vp.name} Settings modal (Spaces)`);
    await page.getByRole('tab', { name: /Data & Backup/i }).click();
    await expectZeroHorizontalOverflow(page, `${vp.name} Settings modal (Data & Backup)`);
    await dismissDialogWithEscape(page);

    // Check History modal fits cleanly
    await page.getByRole('button', { name: 'Open workout history', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectZeroHorizontalOverflow(page, `${vp.name} History modal`);
    await dismissDialogWithEscape(page);

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
  await dismissDialogWithEscape(page);
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
  await dismissDialogWithEscape(page);
  await expect(page.getByTestId('flex-workout-view')).toBeVisible();

  // Exit Floor Mode cleanly restores normal view with workout step preserved
  await bottomSeg.getByLabel('Exit Floor Mode').click();
  await expect(page.getByTestId('flex-workout-view')).toBeHidden();
  await expect(page.getByTestId('step-counter')).toContainText('2/');
  await expectZeroHorizontalOverflow(page, '360x780 after exiting Floor Mode');

  expect(errors).toEqual([]);
});

test('Workout Spaces (360x800): switching to Travel excludes dumbbells & Manage Spaces creates custom space', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  // Open New Workout overlay and switch Space to Travel (no dumbbells)
  await page.getByRole('button', { name: 'New Workout' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Travel', exact: true }).click();
  await expect(page.getByTestId('active-space-equipment-summary')).toContainText('Wall');
  await expect(page.getByTestId('active-space-equipment-summary')).not.toContainText('DB');

  // Preview and load a 15 min Upper Body Travel workout -> zero Dumbbell exercises
  await page.getByRole('button', { name: /15 min/i }).click();
  await page.getByRole('button', { name: /Upper Body/i }).click();
  const previewText = await page.getByTestId('new-workout-preview').textContent();
  expect(previewText?.toLowerCase()).not.toContain('dumbbell');

  await page.getByRole('button', { name: 'Load & Preview' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  const routineSidebarText = await page.locator('aside').textContent();
  expect(routineSidebarText?.toLowerCase()).not.toContain('dumbbell');
  await expectZeroHorizontalOverflow(page, '360x800 Travel workout loaded');

  // Open New Workout -> Manage Spaces -> opens unified Settings directly on Spaces tab -> create custom 7.5kg Balcony space
  await page.getByRole('button', { name: 'New Workout' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Manage Spaces' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Spaces/i })).toHaveAttribute('aria-selected', 'true');
  await expectZeroHorizontalOverflow(page, '360x800 Settings Spaces tab');

  await page.getByRole('button', { name: '+ Add Workout Space' }).click();
  await page.getByLabel('Space Name *').fill('Balcony');
  await page.getByRole('button', { name: 'Dumbbells' }).click();
  await page.getByLabel('Dumbbell Weight (kg)').fill('7.5');
  await page.getByRole('button', { name: 'Save Space' }).click();

  const spacesDialog = page.getByRole('dialog');
  await expect(spacesDialog.getByText('Balcony', { exact: true })).toBeVisible();
  await expect(spacesDialog.getByText('7.5kg Dumbbells')).toBeVisible();
  await spacesDialog.getByRole('button', { name: 'Done' }).click();

  // Returns smoothly to New Workout with Balcony selected and 7.5kg DB shown
  await expect(page.getByRole('heading', { name: 'Start a New Workout' })).toBeVisible();
  await expect(page.getByTestId('active-space-equipment-summary')).toContainText('7.5kg DB');
  await expectZeroHorizontalOverflow(page, '360x800 New Workout after adding Balcony');

  await dismissDialogWithEscape(page);
  expect(errors).toEqual([]);
});

test('All Exercises Browser (360x800): search, filter, live 60 FPS preview, and preview on stage', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Browse All Exercises' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('library-preview-card')).toBeVisible();
  await expectZeroHorizontalOverflow(page, '360x800 All Exercises Browser');

  // Filter by Elastic Bands and select Band Pull-Aparts
  await page.getByRole('button', { name: 'Elastic Bands' }).click();
  await page.getByTestId('library-exercise-list').getByText('Band Pull-Aparts').click();
  await expect(page.getByTestId('library-preview-title')).toHaveText('Band Pull-Aparts');

  // Preview directly on stage without overwriting active routine
  await page.getByRole('button', { name: 'Preview on Stage' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('active-exercise-title')).toHaveText('Band Pull-Aparts');
  await expect(page.getByRole('button', { name: 'Back to Workout' })).toBeVisible();
  await expectZeroHorizontalOverflow(page, '360x800 stage after library preview');

  await page.getByRole('button', { name: 'Back to Workout' }).click();
  await expect(page.getByTestId('active-exercise-title')).not.toHaveText('Band Pull-Aparts');
  expect(errors).toEqual([]);
});

test('3D Exercise Demonstrator (360x800): WebGL canvas renders, orbits + resets, and toggles 2D/3D', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const demonstrator = page.getByTestId('exercise-demonstrator');
  await expect(demonstrator).toHaveAttribute('data-mode', '3d');

  // Lazy Stage3D chunk mounts WebGL canvas with non-zero bounding box
  const canvas = page.getByTestId('stage-3d-canvas');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThanOrEqual(240);
  expect(canvasBox!.height).toBeGreaterThanOrEqual(200);

  // Drag on 3D stage to orbit -> Reset View button appears and restores camera
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    canvasBox!.x + canvasBox!.width / 2 + 70,
    canvasBox!.y + canvasBox!.height / 2 - 20,
    { steps: 6 },
  );
  await page.mouse.up();
  const resetViewBtn = page.getByTestId('stage-3d-reset-view');
  await expect(resetViewBtn).toBeVisible();
  await resetViewBtn.click();
  await expect(resetViewBtn).toBeHidden();

  // Switch cleanly to 2D SVG and back to 3D WebGL
  await page.getByTestId('demonstrator-mode-2d').click();
  await expect(demonstrator).toHaveAttribute('data-mode', '2d');
  await expect(page.locator('svg[aria-label="Animated exercise form demonstrator"]')).toBeVisible();

  await page.getByTestId('demonstrator-mode-3d').click();
  await expect(demonstrator).toHaveAttribute('data-mode', '3d');
  await expect(page.getByTestId('stage-3d-canvas')).toBeVisible();

  await expectZeroHorizontalOverflow(page, '360x800 3D stage');
  expect(errors).toEqual([]);
});

test('3D Demonstrator graceful fallback (360x800): uses 2D SVG with zero errors when WebGL is unavailable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.addInitScript(() => {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function mockedGetContext(
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
        return null;
      }
      return (origGetContext as (...a: unknown[]) => RenderingContext | null).call(
        this,
        type,
        ...args,
      );
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');

  const demonstrator = page.getByTestId('exercise-demonstrator');
  await expect(demonstrator).toHaveAttribute('data-mode', '2d');
  await expect(page.locator('svg[aria-label="Animated exercise form demonstrator"]')).toBeVisible();
  await expect(page.getByTestId('stage-3d-canvas')).toHaveCount(0);
  await expectZeroHorizontalOverflow(page, '360x800 2D fallback');
  expect(errors).toEqual([]);
});
