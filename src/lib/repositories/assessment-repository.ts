import { BaseRepository, PersistenceError, sanitizeForFirestore } from './base';
import { CodingAssessment, CodingSubmission, TestCase } from '@/types/coding';
import { MOCK_CODING_ASSESSMENT, isDemoFixturesEnabled } from '@/lib/data/mock-data';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const ASSESSMENTS_COLLECTION = 'codingAssessments';
const SUBMISSIONS_COLLECTION = 'codingSubmissions';

export class AssessmentRepository extends BaseRepository {
  public static async getAssessmentById(id: string): Promise<CodingAssessment | null> {
    if (!id || typeof id !== 'string') return null;
    const cleanId = id.trim();

    try {
      const doc = await this.db.collection(ASSESSMENTS_COLLECTION).doc(cleanId).get();
      if (doc.exists) {
        return this.sanitizeDoc<CodingAssessment>(doc);
      }
    } catch (err: unknown) {
      if (!isDemoFixturesEnabled()) {
        const errorObj = err as { code?: string; message?: string };
        throw new PersistenceError(
          `Failed to get assessment '${cleanId}': ${errorObj?.message || 'Database error'}`,
          errorObj?.code || 'FIRESTORE_READ_ERROR',
          err
        );
      }
    }

    if (isDemoFixturesEnabled() && (cleanId === MOCK_CODING_ASSESSMENT.id || cleanId === 'default' || cleanId.startsWith('code-'))) {
      return { ...MOCK_CODING_ASSESSMENT, id: cleanId };
    }
    return null;
  }

  /**
   * Fetches the authoritative, server-side evaluation test cases (including hidden cases)
   * Prevents candidates from supplying their own synthetic test cases to manufacture passing scores.
   */
  public static async getPrivateTestCases(assessmentId: string): Promise<TestCase[]> {
    const cleanId = assessmentId.trim();
    try {
      // 1. Check for isolated private test cases subcollection
      const subSnap = await this.db
        .collection(ASSESSMENTS_COLLECTION)
        .doc(cleanId)
        .collection('privateTestCases')
        .get();

      if (!subSnap.empty) {
        return subSnap.docs.map((d: QueryDocumentSnapshot) => this.sanitizeDoc<TestCase>(d));
      }

      // 2. Fall back to parent assessment document test cases
      const assessment = await this.getAssessmentById(cleanId);
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
    const sanitized = sanitizeForFirestore(submission);
    try {
      await this.db.collection(SUBMISSIONS_COLLECTION).doc(submission.id).set(sanitized);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      throw new PersistenceError(
        `Failed to record coding submission '${submission.id}': ${errorObj?.message || 'Write error'}`,
        errorObj?.code || 'FIRESTORE_WRITE_ERROR',
        err
      );
    }
    return sanitized as unknown as CodingSubmission;
  }

  public static async getSubmissionsByCandidate(candidateId: string): Promise<CodingSubmission[]> {
    try {
      const snap = await this.db
        .collection(SUBMISSIONS_COLLECTION)
        .where('candidateId', '==', candidateId.trim())
        .orderBy('submittedAt', 'desc')
        .get();

      return snap.docs.map((doc: QueryDocumentSnapshot) => this.sanitizeDoc<CodingSubmission>(doc));
    } catch (err: unknown) {
      if (!isDemoFixturesEnabled()) {
        const errorObj = err as { code?: string; message?: string };
        throw new PersistenceError(
          `Failed to get candidate submissions: ${errorObj?.message || 'Database error'}`,
          errorObj?.code || 'FIRESTORE_READ_ERROR',
          err
        );
      }
      return [];
    }
  }
}
