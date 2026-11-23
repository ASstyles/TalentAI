import { describe, it, expect } from 'vitest';
import { validateFileHeader, extractDocumentText, MAX_RESUME_FILE_SIZE } from '@/lib/resume/parser';

describe('Document Extractor & Resume Parsing Engine (src/lib/resume/parser.ts)', () => {
  const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
  const DOCX_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]); // PK\x03\x04
  const EXE_HEADER = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ

  it('correctly identifies valid PDF file signatures via magic bytes', () => {
    const isValid = validateFileHeader(PDF_HEADER, 'pdf');
    expect(isValid).toBe(true);
  });

  it('correctly identifies valid DOCX file signatures via OpenXML PK zip magic bytes', () => {
    const isValid = validateFileHeader(DOCX_HEADER, 'docx');
    expect(isValid).toBe(true);
  });

  it('validates genuine plain text files without binary null bytes', () => {
    const txtBuffer = Buffer.from('Senior Staff Software Engineer Resume\nLanguages: TypeScript, Rust, Go');
    const isValid = validateFileHeader(txtBuffer, 'txt');
    expect(isValid).toBe(true);
  });

  it('rejects binary executables disguised with .pdf or .txt extension', () => {
    expect(validateFileHeader(EXE_HEADER, 'pdf')).toBe(false);
    expect(validateFileHeader(EXE_HEADER, 'docx')).toBe(false);
    expect(validateFileHeader(EXE_HEADER, 'txt')).toBe(false);
  });

  it('rejects null or empty buffers', () => {
    expect(validateFileHeader(Buffer.alloc(0), 'pdf')).toBe(false);
  });

  it('enforces maximum resume file size constant at 10MB', () => {
    expect(MAX_RESUME_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it('extracts plain text from text files accurately', async () => {
    const sample = 'John Doe\nPrincipal Distributed Systems Architect\nProven track record with Kubernetes.';
    const text = await extractDocumentText(Buffer.from(sample, 'utf-8'), 'txt');
    expect(text).toContain('John Doe');
    expect(text).toContain('Kubernetes');
  });

  it('falls back gracefully to stream extraction when binary document contains text tokens', async () => {
    const pseudoDoc = Buffer.concat([
      DOCX_HEADER,
      Buffer.from('Candidate: Jane Smith Technical Skills: React, Python, PostgreSQL'),
    ]);
    const extracted = await extractDocumentText(pseudoDoc, 'docx');
    expect(extracted).toContain('Jane Smith');
    expect(extracted).toContain('PostgreSQL');
  });
});
