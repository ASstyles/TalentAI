import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { AuditRepository } from '@/lib/repositories/audit-repository';
import { rateLimiter } from '@/lib/rate-limit/redis-limiter';

// Block public free webmail providers to enforce genuine corporate work emails
const BLOCKED_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com'];

function isCorporateEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return !BLOCKED_DOMAINS.includes(domain);
}

const AccessRequestSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  workEmail: z
    .string()
    .email('Please enter a valid work email')
    .refine((val) => isCorporateEmail(val), {
      message: 'Please use your official company work email (e.g. name@company.com), not a generic personal email.',
    }),
  companyName: z.string().min(2, 'Company name is required'),
  jobTitle: z.string().min(2, 'Job title is required (e.g. Lead Technical Recruiter, VP Engineering)'),
  businessWebsite: z.string().url('Please enter a valid company website URL (e.g. https://company.com)'),
  reason: z.string().min(20, 'Please provide a detailed reason for access (at least 20 characters)'),
});

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
    const rateCheck = await rateLimiter.checkRateLimit('recruiter_access_request', clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Too many access requests submitted. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, rateCheck.resetTime - Math.floor(Date.now() / 1000))),
          },
        }
      );
    }
    const body = await req.json();
    const parsed = AccessRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { fullName, workEmail, companyName, jobTitle, businessWebsite, reason } = parsed.data;

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const requestRecord = {
      id: requestId,
      fullName,
      workEmail,
      companyName,
      jobTitle,
      businessWebsite,
      reason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Commit to recruiterAccessRequests collection
    await adminDb.collection('recruiterAccessRequests').doc(requestId).set(requestRecord);

    // Record immutable audit event
    await AuditRepository.recordLog({
      actor: fullName,
      actorId: 'anonymous_recruiter_applicant',
      role: 'guest',
      action: 'RECRUITER_ACCESS_REQUEST_SUBMITTED',
      target: `Company: ${companyName} (Email: ${workEmail})`,
      details: `Job Title: ${jobTitle}. Website: ${businessWebsite}. Status: PENDING.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Recruiter access request submitted successfully. An administrator will review your credentials.',
      requestId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
