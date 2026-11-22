export type EngineeringRole =
  | 'Software Engineer'
  | 'Frontend Engineer'
  | 'Backend Engineer'
  | 'Full-Stack Engineer'
  | 'AI Engineer'
  | 'Machine Learning Engineer'
  | 'Data Scientist'
  | 'Data Engineer'
  | 'Computer Vision Engineer'
  | 'NLP Engineer'
  | 'DevOps Engineer'
  | 'Cloud Engineer'
  | 'MLOps Engineer'
  | 'Cybersecurity Engineer'
  | 'QA Automation Engineer'
  | 'Site Reliability Engineer';

export type SeniorityLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff';
export type JobStatus = 'draft' | 'published' | 'paused' | 'closed';

export interface CompetencyRequirement {
  skillId: string;
  name: string;
  category: 'languages' | 'frameworks' | 'databases' | 'cloud' | 'ml' | 'systems' | 'testing';
  minLevel: 1 | 2 | 3 | 4 | 5; // 1: Novice, 2: Competent, 3: Proficient, 4: Advanced, 5: Expert
  weight: number; // 1 to 10
}

export interface JobOpening {
  id: string;
  orgId: string;
  title: string;
  specialization: EngineeringRole;
  seniority: SeniorityLevel;
  status: JobStatus;
  description: string;
  responsibilities: string[];
  mandatoryCompetencies: CompetencyRequirement[];
  preferredCompetencies: CompetencyRequirement[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  location: {
    type: 'remote' | 'hybrid' | 'onsite';
    locationString: string;
  };
  assessmentRubricId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
