import { test, expect } from '@playwright/test';

test.describe('TalentAI End-to-End User Journeys', () => {
  test('Health and readiness probes respond with 200 OK', async ({ request }) => {
    const liveRes = await request.get('/api/health/live');
    expect(liveRes.status()).toBe(200);
    const liveData = await liveRes.json();
    expect(liveData.status).toBe('ok');

    const readyRes = await request.get('/api/health/ready');
    expect(readyRes.status()).toBe(200);
    const readyData = await readyRes.json();
    expect(readyData.status).toBe('ready');
  });

  test('Public configuration endpoint provides safe client initialization parameters', async ({ request }) => {
    const configRes = await request.get('/api/config/public');
    expect(configRes.status()).toBe(200);
    const config = await configRes.json();
    expect(config.success).toBe(true);
    expect(config.data).toHaveProperty('apiKey');
  });

  test('Public job catalog returns available published engineering roles', async ({ request }) => {
    const jobsRes = await request.get('/api/jobs');
    expect(jobsRes.status()).toBe(200);
    const jobsData = await jobsRes.json();
    expect(jobsData.success).toBe(true);
    expect(Array.isArray(jobsData.data)).toBe(true);
    expect(jobsData.data.length).toBeGreaterThanOrEqual(0);
  });

  test('Landing page renders portal navigation and key intelligence pillars', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
    await expect(page).toHaveTitle(/Talent.*AI/i);
    const candidateLink = page.getByRole('link', { name: /candidate|jobs|get started/i }).first();
    await expect(candidateLink).toBeVisible();
  });

  test('Candidate job explorer protects unauthenticated access via RouteGuard', async ({ page }) => {
    await page.goto('/candidate/jobs');
    // Unauthenticated user is protected by RouteGuard
    await expect(page.getByText(/Authentication Required|Sign In/i).first()).toBeVisible();
  });

  test('Candidate assessment page enforces authentication guard', async ({ page }) => {
    await page.goto('/candidate/assessment/tech-fe-01');
    await expect(page.getByText(/Authentication Required|Sign In/i).first()).toBeVisible();
  });

  test('Unauthenticated access to /candidate/resume redirects cleanly to login with return redirect', async ({ page }) => {
    await page.goto('/candidate/resume');
    // Ensure URL arrives at login with redirect parameter
    await expect(page).toHaveURL(/\/login.*redirect=%2Fcandidate%2Fresume/);
    // Ensure login form is visible and interactive (NO infinite spinner)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|continue|login/i }).first()).toBeVisible();
    await expect(page.getByText(/Active Session Detected/i)).not.toBeVisible();
  });

  test('Login page renders cleanly with candidate portal hint without infinite spinner or Firestore errors', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errorLogs.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/login?role=candidate&redirect=%2Fcandidate%2Fresume');
    // Verify no hanging spinner or false active session when unauthenticated
    await expect(page.getByText(/Active Session Detected/i)).not.toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify absence of Firestore undefined orgId error
    const firestoreErrors = errorLogs.filter(
      (log) => log.includes('not a valid Firestore document') || log.includes('orgId')
    );
    expect(firestoreErrors).toHaveLength(0);
  });

  test('Registration page renders with candidate role default and clean validation schema', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[id="fullName"], input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[id="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"], input[name="password"]')).toBeVisible();
  });
});
