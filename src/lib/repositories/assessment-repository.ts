import { BaseRepository } from './base';
import { CodingAssessment, CodingSubmission, TestCase } from '@/types/coding';
import { MOCK_CODING_ASSESSMENT, isDemoFixturesEnabled } from '@/lib/data/mock-data';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const ASSESSMENTS_COLLECTION = 'codingAssessments';
const SUBMISSIONS_COLLECTION = 'codingSubmissions';

export class AssessmentRepository extends BaseRepository {
  public static async getAssessmentById(id: string): Promise<CodingAssessment | null> {
    try {
      const doc = await this.db.collection(ASSESSMENTS_COLLECTION).doc(id).get();
      if (doc.exists) {
        return this.sanitizeDoc<CodingAssessment>(doc);
      }
    } catch {
      // In case of read failure or offline emulator, check demo fixtures
    }

    if (isDemoFixturesEnabled() && (id === MOCK_CODING_ASSESSMENT.id || id === 'default' || id.startsWith('code-'))) {
      return { ...MOCK_CODING_ASSESSMENT, id };
    }
    return null;
  }

  /**
   * Fetches the authoritative, server-side evaluation test cases (including hidden cases)
   * Prevents candidates from supplying their own synthetic test cases to manufacture passing scores.
   */
  public static async getPrivateTestCases(assessmentId: string): Promise<TestCase[]> {
    try {
      // 1. Check for isolated private test cases subcollection
      const subSnap = await this.db
        .collection(ASSESSMENTS_COLLECTION)
        .doc(assessmentId)
        .collection('privateTestCases')
        .get();

      if (!subSnap.empty) {
        return subSnap.docs.map((d: QueryDocumentSnapshot) => this.sanitizeDoc<TestCase>(d));
      }

      // 2. Fall back to parent assessment document test cases
      const assessment = await this.getAssessmentById(assessmentId);
      if (assessment && assessment.testCases && assessment.testCases.length > 0) {
        return assessment.testCases;
      }
    } catch {
      // Handled below
    }

    if (isDemoFixturesEnabled()) {
      return MOCK_CODING_ASSESSMENT.testCases;
    }

    return [];
  }

  /**
   * Returns public assessment metadata with ONLY non-hidden sample test cases for candidate UI.
   * Strips all hidden evaluation test cases to prevent candidate inspection.
   */
  public static async getPublicAssessment(
    assessmentId: string
  ): Promise<(Omit<CodingAssessment, 'testCases'> & { sampleTestCases: TestCase[]; hiddenCount: number }) | null> {
    const assessment = await this.getAssessmentById(assessmentId);
    if (!assessment) return null;

    const sampleTestCases = (assessment.testCases || []).filter((tc) => !tc.isHidden);
    const hiddenCount = (assessment.testCases || []).filter((tc) => tc.isHidden).length;

    const { testCases: _, ...publicMetadata } = assessment;
    return {
      ...publicMetadata,
      sampleTestCases,
      hiddenCount,
    };
  }

  public static async recordSubmission(submission: CodingSubmission): Promise<CodingSubmission> {
    await this.db.collection(SUBMISSIONS_COLLECTION).doc(submission.id).set(submission);
    return submission;
  }

  public static async getSubmissionsByCandidate(candidateId: string): Promise<CodingSubmission[]> {
    try {
      const snap = await this.db
        .collection(SUBMISSIONS_COLLECTION)
        .where('candidateId', '==', candidateId)
        .orderBy('submittedAt', 'desc')
        .get();

      if (!snap.empty) {
        return snap.docs.map((d: QueryDocumentSnapshot) => this.sanitizeDoc<CodingSubmission>(d));
      }
    } catch {
      // Fallback below
    }

    if (isDemoFixturesEnabled() && (candidateId === MOCK_CODING_ASSESSMENT.candidateId || candidateId.includes('alex'))) {
      const { MOCK_CODING_SUBMISSION } = await import('@/lib/data/mock-data');
      return [{ ...MOCK_CODING_SUBMISSION }];
    }

    return [];
  }
}
