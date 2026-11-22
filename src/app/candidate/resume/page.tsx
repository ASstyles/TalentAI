'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Trash2,
  Loader2,
  FileUp,
  ShieldCheck,
  Code,
  Layers,
} from 'lucide-react';
import { ResumeExtractedData } from '@/types/resume';

export default function ResumeIntelligencePage() {
  const { user, idToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ResumeExtractedData | null>(null);
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
        setError('Only PDF, DOCX, and TXT files are supported.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds the 10MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a resume file (PDF, DOCX, or TXT).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('autoParse', 'true');

      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload resume');

      setUploadedStoragePath(data.data.storagePath);
      if (data.data.rawText) setInputText(data.data.rawText);

      if (data.data.parsedData) {
        setParsedResult(data.data.parsedData);
        setSuccessNotice('Resume uploaded, stored securely, and parsed with Gemini AI!');
      } else {
        // Fallback: parse raw text
        await parseRawText(data.data.rawText);
        setSuccessNotice('Resume uploaded and text extracted. Analyzing skills...');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading resume');
    } finally {
      setLoading(false);
    }
  };

  const parseRawText = async (textToParse: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        headers,
        body: JSON.stringify({ rawText: textToParse }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze resume text');

      setParsedResult(data.data);
      setSuccessNotice('Skills analyzed and classified into 5-tier evidence hierarchy!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToProfile = async () => {
    if (!parsedResult || !idToken) return;
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch('/api/candidate/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          headline: parsedResult.summary ? parsedResult.summary.substring(0, 100) : 'Software Engineer',
          summary: parsedResult.summary,
          city: parsedResult.contactInfo.location || '',
          extractedSkills: parsedResult.skills,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with profile');

      setSuccessNotice('Successfully synchronized with your persistent candidate profile & role recommendations!');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!uploadedStoragePath || !idToken) return;
    if (!confirm('Are you sure you want to delete this uploaded resume document?')) return;

    try {
      const res = await fetch(`/api/resume/upload?storagePath=${encodeURIComponent(uploadedStoragePath)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        setUploadedStoragePath(null);
        setSelectedFile(null);
        setSuccessNotice('Resume deleted from storage');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-800 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          5-Tier Evidence Intelligence
        </div>
        <h1 className="text-2xl font-bold text-white">Resume Intelligence & Evidence Extraction</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-3xl">
          Upload your genuine engineering resume. Gemini separates self-claimed keywords from contextualized project architecture, code achievements, and verified competencies.
        </p>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Upload or Paste Text */}
        <div className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload Document (PDF / DOCX / TXT)
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'text' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Resume Text
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center space-y-3 bg-slate-950/40 hover:border-indigo-500/50 transition">
                <FileUp className="h-10 w-10 text-indigo-400 mx-auto" />
                <div>
                  <label htmlFor="resumeFile" className="cursor-pointer font-semibold text-xs text-indigo-400 hover:underline">
                    Click to browse file
                  </label>{' '}
                  <span className="text-xs text-slate-400">or drag and drop</span>
                  <p className="text-[11px] text-slate-500 mt-1">PDF, DOCX, or TXT (Max 10MB)</p>
                </div>
                <input
                  type="file"
                  id="resumeFile"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span className="font-medium text-white truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-slate-500">({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    Remove
                  </button>
                </div>
              )}

              <button
                onClick={handleUploadAndAnalyze}
                disabled={loading || !selectedFile}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {loading ? 'Uploading & Analyzing with Gemini...' : 'Upload & Extract Evidence'}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <label className="block text-xs font-semibold uppercase text-slate-400">
                Raw Resume Text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste the text content of your resume here..."
                rows={14}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{inputText.length} characters</span>
                <button
                  onClick={() => parseRawText(inputText)}
                  disabled={loading || !inputText.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? 'Analyzing with Gemini...' : 'Extract Evidence Tiers'}
                </button>
              </div>
            </div>
          )}

          {uploadedStoragePath && (
            <div className="flex items-center justify-between rounded-xl bg-slate-900/40 p-3 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] truncate">
                Stored at: <code className="text-slate-300">{uploadedStoragePath}</code>
              </span>
              <button
                onClick={handleDeleteResume}
                className="text-slate-500 hover:text-rose-400 flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Parsed Intelligence Breakdown */}
        <div className="space-y-4">
          {parsedResult ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              {/* Candidate Info */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{parsedResult.contactInfo.fullName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {parsedResult.contactInfo.email} {parsedResult.contactInfo.location && `• ${parsedResult.contactInfo.location}`}
                  </p>
                </div>
                <button
                  onClick={handleSyncToProfile}
                  disabled={syncing}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-sm transition"
                >
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {syncing ? 'Syncing...' : 'Sync to Profile'}
                </button>
              </div>

              {/* Summary */}
              {parsedResult.summary && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                    Contextual Summary
                  </span>
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    {parsedResult.summary}
                  </p>
                </div>
              )}

              {/* Extracted Skills Categorized into Tiers */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Extracted Competencies & Evidence Tiers
                </span>
                <div className="flex flex-wrap gap-2">
                  {parsedResult.skills.map((s, idx) => {
                    const isProject = s.evidenceTier === 'project_supported';
                    const isExtracted = s.evidenceTier === 'extracted';
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg px-2.5 py-1.5 text-xs border flex items-center gap-1.5 ${
                          isProject
                            ? 'bg-blue-950/60 border-blue-700/60 text-blue-300'
                            : isExtracted
                            ? 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-[9px] uppercase font-mono px-1 rounded bg-slate-900 text-slate-400">
                          {s.evidenceTier.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Projects with Architecture Evidence */}
              {parsedResult.projects && parsedResult.projects.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Project Architecture Evidence
                  </span>
                  {parsedResult.projects.map((p, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
                          Architecture Evidenced
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{p.architecture}</p>
                      <div className="flex flex-wrap gap-1">
                        {p.technologies.map((t, tidx) => (
                          <span key={tidx} className="text-[10px] rounded bg-slate-900 px-1.5 py-0.5 text-slate-400 border border-slate-800">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center text-slate-500 space-y-3">
              <FileText className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Document Analyzed Yet</h3>
              <p className="text-xs max-w-xs mx-auto">
                Upload your resume or paste its text on the left to extract competencies with the Gemini intelligence engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
