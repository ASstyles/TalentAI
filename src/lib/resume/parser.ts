import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Validates magic file header bytes to prevent MIME-type spoofing
 * and reject malicious executables masquerading as documents.
 */
export function validateFileHeader(buffer: Buffer, extension: string): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const normalizedExt = extension.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'pdf') {
    // Standard PDF header signature: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    return (
      buffer.length >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    );
  }

  if (normalizedExt === 'docx') {
    // DOCX format is an OpenXML ZIP container: starts with PK\x03\x04
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  if (normalizedExt === 'txt') {
    // Check initial bytes for valid printable or UTF text, rejecting null bytes
    const checkLength = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0) return false;
    }
    return true;
  }

  return false;
}

/**
 * Extracts pure, readable text from PDF, DOCX, or plain text buffers.
 * Features automated engine failover to raw string stream sanitization
 * if complex or unusual document encoding encounters a parser warning.
 */
export async function extractDocumentText(buffer: Buffer, extension: string): Promise<string> {
  const normalizedExt = extension.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'txt') {
    return buffer.toString('utf-8').trim();
  }

  if (normalizedExt === 'pdf') {
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      if (result && typeof result.text === 'string' && result.text.trim().length > 0) {
        return sanitizeExtractedText(result.text);
      }
    } catch (err) {
      console.warn('[extractDocumentText] PDFParse error, falling back to stream extraction:', err);
    }
  }

  if (normalizedExt === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result && typeof result.value === 'string' && result.value.trim().length > 0) {
        return sanitizeExtractedText(result.value);
      }
    } catch (err) {
      console.warn('[extractDocumentText] Mammoth error, falling back to stream extraction:', err);
    }
  }

  // Universal fallback for binary document streams: extract printable UTF-8/ASCII tokens
  return fallbackStreamExtraction(buffer);
}

function sanitizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fallbackStreamExtraction(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const extracted = raw.replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ');
  return extracted.trim();
}
