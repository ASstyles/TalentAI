export type EvidenceTier =
  | 'claimed'            // Tier 1: Candidate-claimed on profile / resume
  | 'extracted'          // Tier 2: Extracted with context / NLP
  | 'project_supported'  // Tier 3: Verified via project / codebase
  | 'verified'           // Tier 4: Verified via official credentials / third-party
  | 'assessed';          // Tier 5: Demonstrated in interview / coding sandbox

export const TIER_WEIGHTS: Record<EvidenceTier, number> = {
  claimed: 0.1,
  extracted: 0.2,
  project_supported: 0.4,
  verified: 0.7,
  assessed: 1.0,
};

export interface ExtractedSkill {
  name: string;
  category: 'languages' | 'frameworks' | 'databases' | 'cloud' | 'ml' | 'systems' | 'testing';
  evidenceTier: EvidenceTier;
  confidence: number; // 0-1
  sourceSnippet?: string;
  yearsOfExperience?: number;
}

export interface ExtractedProject {
  name: string;
  problemSolved: string;
  claimedContribution: string;
  architecture: string;
  technologies: string[];
  engineeringDecisions: string[];
  metricsAchieved?: string[];
  evidenceAvailable: boolean;
  repoUrl?: string;
}

export interface ResumeExtractedData {
  contactInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
  };
  summary: string;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate?: string;
    endDate?: string;
    isVerified: boolean;
  }>;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    highlights: string[];
    technologiesUsed: string[];
  }>;
  skills: ExtractedSkill[];
  projects: ExtractedProject[];
  certifications: Array<{
    name: string;
    issuer: string;
    date?: string;
    verificationUrl?: string;
  }>;
}

export interface ResumeDocument {
  id: string;
  candidateId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  parsingStatus: 'uploaded' | 'processing' | 'parsed' | 'failed';
  extractedData?: ResumeExtractedData;
  rawText?: string;
  uploadedAt: string;
  parsedAt?: string;
}
