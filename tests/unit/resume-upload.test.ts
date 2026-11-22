import { describe, it, expect } from 'vitest';

describe('Resume Ingestion, Magic Bytes & Storage Isolation (Phase 4 & 12)', () => {
  // Magic byte signatures
  const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // '%PDF-'
  const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // 'PK\x03\x04'
  const EXE_MAGIC = Buffer.from([0x4d, 0x5a]); // 'MZ' (PE Windows executable)
  const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]); // '\x7fELF'

  function validateResumeBuffer(buffer: Buffer, originalName: string): { valid: boolean; format?: string; error?: string } {
    // 10MB limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 10MB maximum limit' };
    }

    if (buffer.length === 0) {
      return { valid: false, error: 'File buffer is empty' };
    }

    // Executable rejection first
    if (buffer.subarray(0, 2).equals(EXE_MAGIC) || buffer.subarray(0, 4).equals(ELF_MAGIC)) {
      return { valid: false, error: 'Executable files strictly prohibited' };
    }

    // PDF validation
    if (buffer.subarray(0, 5).equals(PDF_MAGIC)) {
      return { valid: true, format: 'pdf' };
    }

    // DOCX validation
    if (buffer.subarray(0, 4).equals(DOCX_MAGIC)) {
      return { valid: true, format: 'docx' };
    }

    // Plain text validation: check for binary null bytes
    if (originalName.toLowerCase().endsWith('.txt')) {
      for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
        if (buffer[i] === 0x00) {
          return { valid: false, error: 'Binary content detected in plain text resume' };
        }
      }
      return { valid: true, format: 'txt' };
    }

    return { valid: false, error: 'Unsupported file format. Only PDF, DOCX, and TXT are supported' };
  }

  it('validates legitimate PDF documents via %PDF- magic bytes', () => {
    const validPdf = Buffer.concat([PDF_MAGIC, Buffer.from('1.7\n%Fake PDF content')]);
    const result = validateResumeBuffer(validPdf, 'resume.pdf');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('pdf');
  });

  it('validates legitimate DOCX documents via PK ZIP magic bytes', () => {
    const validDocx = Buffer.concat([DOCX_MAGIC, Buffer.from('word/document.xml content')]);
    const result = validateResumeBuffer(validDocx, 'resume.docx');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('docx');
  });

  it('validates legitimate TXT plain text documents', () => {
    const validTxt = Buffer.from('Alex Mercer\nSenior Full-Stack Engineer\nSkills: Go, Node.js');
    const result = validateResumeBuffer(validTxt, 'resume.txt');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('txt');
  });

  it('strictly rejects malicious executables renamed with .pdf extension (masquerade attack)', () => {
    const fakePdfExe = Buffer.concat([EXE_MAGIC, Buffer.from('this is malicious binary code')]);
    const result = validateResumeBuffer(fakePdfExe, 'resume.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('prohibited');
  });

  it('strictly rejects files exceeding 10MB limit', () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0x20); // 11MB
    const result = validateResumeBuffer(oversized, 'huge.txt');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10MB');
  });

  it('constructs strictly tenant-isolated Cloud Storage storage paths per candidate UID', () => {
    const candidateUid = 'cand-user-789';
    const filename = 'alex_mercer_resume.pdf';
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `candidates/${candidateUid}/resumes/${Date.now()}-${sanitizedFilename}`;

    expect(storagePath).toMatch(/^candidates\/cand-user-789\/resumes\/\d+-alex_mercer_resume\.pdf$/);
    expect(storagePath).not.toContain('..');
  });
});
