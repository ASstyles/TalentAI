import { test, expect } from '@playwright/test';

test.describe('TalentAI End-to-End User Journeys', () => {
  test('Health and readiness probes respond with 200 OK', async ({ request }) => {
    const liveRes = await request.get('/api/health/live');
    expect(liveRes.status()).toBe(200);
    const liveData = await liveRes.json();
    expect(liveData.status).toBe('alive');

    const readyRes = await request.get('/api/health/ready');
    expect(readyRes.status()).toBe(200);
    const readyData = await readyRes.json();
    expect(readyData.status).toBe('ready');
  });

  test('Public configuration endpoint provides safe client initialization parameters', async ({ request }) => {
    const configRes = await request.get('/api/config/public');
    expect(configRes.status()).toBe(200);
    const config = await configRes.json();
    expect(config).toHaveProperty('configured');
    expect(config).toHaveProperty('runtime');
  });

  test('Public job catalog returns available published engineering roles', async ({ request }) => {
    const jobsRes = await request.get('/api/jobs');
    expect(jobsRes.status()).toBe(200);
    const jobsData = await jobsRes.json();
    expect(jobsData.success).toBe(true);
    expect(Array.isArray(jobsData.data)).toBe(true);
    expect(jobsData.data.length).toBeGreaterThan(0);
  });

  test('Landing page renders portal navigation and key intelligence pillars', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TalentAI/i);
    // Verify core navigation links exist
    const candidateLink = page.getByRole('link', { name: /candidate|jobs|get started/i }).first();
    await expect(candidateLink).toBeVisible();
  });

  test('Candidate job explorer loads and allows viewing job openings', async ({ page }) => {
    await page.goto('/candidate/jobs');
    await expect(page.getByText(/open positions|engineering roles|browse/i).first()).toBeVisible();
  });

  test('Public assessment page renders instructions and evaluation rubric', async ({ page }) => {
    await page.goto('/assessment/tech-fe-01');
    await expect(page.getByText(/frontend|technical assessment|coding/i).first()).toBeVisible();
  });
});
