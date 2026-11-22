import { describe, it, expect } from 'vitest';

describe('Authentication Route Guards & Open Redirect Defenses (Phase 2 & 12)', () => {
  function getSafeDestination(redirectParam: string | null | undefined, userRole: string): string {
    const defaultDashboard =
      userRole === 'admin'
        ? '/admin/dashboard'
        : userRole === 'recruiter'
        ? '/recruiter/dashboard'
        : '/candidate/dashboard';

    if (!redirectParam) return defaultDashboard;

    // Defense against open redirect vulnerabilities:
    // Reject absolute URLs, protocol-relative URLs (//evil.com), javascript:, or data:
    if (
      redirectParam.startsWith('//') ||
      redirectParam.startsWith('http://') ||
      redirectParam.startsWith('https://') ||
      redirectParam.startsWith('javascript:') ||
      redirectParam.startsWith('data:')
    ) {
      return defaultDashboard;
    }

    // Ensure it begins with a single slash
    if (!redirectParam.startsWith('/')) {
      return defaultDashboard;
    }

    return redirectParam;
  }

  it('redirects authenticated candidate to candidate dashboard by default', () => {
    const dest = getSafeDestination(null, 'candidate');
    expect(dest).toBe('/candidate/dashboard');
  });

  it('redirects authenticated recruiter to recruiter dashboard by default', () => {
    const dest = getSafeDestination(null, 'recruiter');
    expect(dest).toBe('/recruiter/dashboard');
  });

  it('redirects authenticated admin to admin dashboard by default', () => {
    const dest = getSafeDestination(null, 'admin');
    expect(dest).toBe('/admin/dashboard');
  });

  it('preserves valid internal redirect destinations', () => {
    const dest = getSafeDestination('/candidate/jobs', 'candidate');
    expect(dest).toBe('/candidate/jobs');
  });

  it('defends against protocol-relative open redirect attacks (//evil.com)', () => {
    const dest = getSafeDestination('//evil.com/phishing', 'candidate');
    expect(dest).toBe('/candidate/dashboard');
  });

  it('defends against absolute URL open redirect attacks (https://evil.com)', () => {
    const dest = getSafeDestination('https://evil.com/login', 'recruiter');
    expect(dest).toBe('/recruiter/dashboard');
  });

  it('defends against javascript: pseudo-protocol XSS attempts', () => {
    const dest = getSafeDestination('javascript:alert(1)', 'admin');
    expect(dest).toBe('/admin/dashboard');
  });
});
