export type UserRole = 'candidate' | 'recruiter' | 'admin';
export type UserStatus = 'active' | 'deactivated' | 'suspended';

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  orgId?: string; // Set for recruiters and org admins
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface CandidateProfile {
  id: string; // Doc ID == User ID
  userId: string;
  headline: string;
  summary: string;
  yearsOfExperience: number;
  location: {
    city: string;
    state?: string;
    country: string;
    remotePreference: 'remote_only' | 'hybrid' | 'onsite' | 'flexible';
  };
  githubUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  overallVerificationScore: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterProfile {
  id: string; // Doc ID == User ID
  userId: string;
  orgId: string;
  title: string;
  department: string;
  permissions: string[];
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  tier: 'free' | 'pro' | 'enterprise';
  settings: {
    requireIdentityVerification: boolean;
    allowVoiceInterview: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
