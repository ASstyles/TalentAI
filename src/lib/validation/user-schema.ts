import { z } from 'zod';

export const UserRoleSchema = z.enum(['candidate', 'recruiter', 'admin']);
export const UserStatusSchema = z.enum(['active', 'deactivated', 'suspended']);

export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Valid email is required'),
  displayName: z.string().min(1, 'Display name is required'),
  photoURL: z.string().url().optional(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  orgId: z.string().min(1).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string(),
});

export const CandidateProfileSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  headline: z.string(),
  summary: z.string(),
  yearsOfExperience: z.number().min(0),
  location: z.object({
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    remotePreference: z.enum(['remote_only', 'hybrid', 'onsite', 'flexible']),
  }),
  githubUsername: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  overallVerificationScore: z.number().min(0).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RecruiterProfileSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  orgId: z.string().min(1, 'Recruiter must belong to an organization'),
  title: z.string().min(1),
  department: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.string(),
});

export const OrganizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().min(1),
  tier: z.enum(['free', 'pro', 'enterprise']),
  settings: z.object({
    requireIdentityVerification: z.boolean(),
    allowVoiceInterview: z.boolean(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
