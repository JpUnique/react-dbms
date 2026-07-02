import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  FileText, Table2, FileImage, FileCode, Film, FileAudio,
  PresentationIcon, Download, Loader2, EyeOff, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentViewerProps {
  fileType: string;
  previewUrl: string | null;
  isLoading?: boolean;
  onDownload?: () => void;
}

const IMAGE_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const VIDEO_TYPES  = ['mp4', 'webm', 'ogg', 'mov'];
const AUDIO_TYPES  = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
const CODE_TYPES   = ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'xml', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'sh', 'yaml', 'yml', 'sql', 'md'];
const SHEET_TYPES  = ['xls', 'xlsx', 'csv'];
const SLIDE_TYPES  = ['ppt', 'pptx'];
const DOC_TYPES    = ['doc', 'docx', 'rtf'];

/* ── Generic loading/error/placeholder shells ──────────────────────────── */

const SpinnerBox: React.FC = () => (
  <div className="min-h-96 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const ErrorBox: React.FC<{ message: string; onDownload?: () => void }> = ({ message, onDownload }) => (
  <div className="min-h-60 flex flex-col items-center justify-center border-2 border-dashed rounded-lg border-red-200 dark:border-red-900 p-8 text-center gap-3">
    <AlertCircle className="h-10 w-10 text-red-400" />
    <p className="text-sm text-muted-foreground">{message}</p>
    {onDownload && (
      <Button variant="outline" size="sm" onClick={onDownload}>
        <Download className="h-4 w-4 mr-2" /> Download instead
      </Button>
    )}
  </div>
);

const Placeholder: React.FC<{
  icon: React.ReactNode; label: string; message: string; onDownload?: () => void;
}> = ({ icon, label, message, onDownload }) => (
  <div className="min-h-96 flex flex-col items-center justify-center border-2 border-dashed rounded-lg border-muted p-10 text-center gap-4">
    {icon}
    <div>
      <h3 className="text-base font-semibold">{label}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{message}</p>
    </div>
    {onDownload && (
      <Button variant="outline" size="sm" onClick={onDownload}>
        <Download className="h-4 w-4 mr-2" /> Download to view
      </Button>
    )}
  </div>
);

/* ── Text / Code viewer ─────────────────────────────────────────────────── */

const TextViewer: React.FC<{ url: string; ext: string; onDownload?: () => void }> = ({ url, ext, onDownload }) => {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(setText)
      .catch(() => setErr(true));
  }, [url]);

  if (err) return <ErrorBox message="Could not load file content." onDownload={onDownload} />;
  if (text === null) return <SpinnerBox />;

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40 text-xs text-muted-foreground font-mono">
        <span className="uppercase font-semibold">{ext}</span>
        {onDownload && (
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onDownload}>
            <Download className="h-3 w-3" /> Download
          </Button>
        )}
      </div>
      <pre className="p-4 text-sm font-mono overflow-auto max-h-[72vh] whitespace-pre-wrap break-words bg-muted/10">
        {text}
      </pre>
    </div>
  );
};

/* ── DOCX viewer (mammoth → HTML) ───────────────────────────────────────── */

const DocxViewer: React.FC<{ url: string; onDownload?: () => void }> = ({ url, onDownload }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => mammoth.convertToHtml({ arrayBuffer: buf }))
      .then(result => setHtml(result.value))
      .catch(() => setErr(true));
  }, [url]);

  if (err) return <ErrorBox message="Could not render this Word document." onDownload={onDownload} />;
  if (html === null) return <SpinnerBox />;

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40 text-xs text-muted-foreground">
        <span className="font-semibold">Word Document</span>
        {onDownload && (
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onDownload}>
            <Download className="h-3 w-3" /> Download
          </Button>
        )}
      </div>
      <div
        className="p-6 prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-[72vh]
                   [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1
                   [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/30"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

/* ── Spreadsheet viewer (SheetJS) ───────────────────────────────────────── */

const SpreadsheetViewer: React.FC<{ url: string; ext: string; onDownload?: () => void }> = ({ url, ext, onDownload }) => {
  const [tables, setTables] = useState<{ name: string; html: string }[] | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const wb = XLSX.read(buf, { type: 'array' });
        const result = wb.SheetNames.map(name => ({
          name,
          html: XLSX.utils.sheet_to_html(wb.Sheets[name], { id: `sheet-${name}` }),
        }));
        setTables(result);
      })
      .catch(() => setErr(true));
  }, [url]);

  if (err) return <ErrorBox message="Could not render this spreadsheet." onDownload={onDownload} />;
  if (tables === null) return <SpinnerBox />;

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Tab bar for sheets */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/40">
        <div className="flex gap-1 overflow-x-auto">
          {tables.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActiveSheet(i)}
              className={`px-3 py-1 text-xs rounded font-medium whitespace-nowrap transition-colors
                ${activeSheet === i
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-xs text-muted-foreground uppercase font-semibold">{ext}</span>
          {onDownload && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onDownload}>
              <Download className="h-3 w-3" /> Download
            </Button>
          )}
        </div>
      </div>
      {/* Sheet content */}
      <div
        className="overflow-auto max-h-[72vh] p-2
                   [&_table]:border-collapse [&_table]:text-xs [&_table]:w-full
                   [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:whitespace-nowrap
                   [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/50 [&_th]:font-semibold"
        dangerouslySetInnerHTML={{ __html: tables[activeSheet]?.html ?? '' }}
      />
    </div>
  );
};

/* ── Main component ─────────────────────────────────────────────────────── */

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  fileType: rawType,
  previewUrl,
  isLoading = false,
  onDownload,
}) => {
  const ft = rawType.toLowerCase().replace(/^\./, '');

  if (isLoading) return <SpinnerBox />;

  if (!previewUrl) {
    return (
      <Placeholder
        icon={<EyeOff className="h-14 w-14 text-muted-foreground/50" />}
        label="Preview unavailable"
        message="Click the Preview tab to load the file, or download it to view locally."
        onDownload={onDownload}
      />
    );
  }

  /* ── PDF ── */
  if (ft === 'pdf') {
    return (
      <div className="rounded-lg overflow-hidden border">
        <iframe
          src={previewUrl}
          title="PDF preview"
          className="w-full"
          style={{ height: '75vh', minHeight: '500px' }}
        />
      </div>
    );
  }

  /* ── Images ── */
  if (IMAGE_TYPES.includes(ft)) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-4" style={{ minHeight: '400px' }}>
        <img
          src={previewUrl}
          alt="Document preview"
          className="max-w-full max-h-[70vh] object-contain rounded shadow"
        />
      </div>
    );
  }

  /* ── Video ── */
  if (VIDEO_TYPES.includes(ft)) {
    return (
      <div className="rounded-lg overflow-hidden border bg-black">
        <video src={previewUrl} controls className="w-full max-h-[70vh]" />
      </div>
    );
  }

  /* ── Audio ── */
  if (AUDIO_TYPES.includes(ft)) {
    return (
      <div className="rounded-lg border p-8 flex items-center justify-center bg-muted/20" style={{ minHeight: '160px' }}>
        <audio src={previewUrl} controls className="w-full max-w-lg" />
      </div>
    );
  }

  /* ── DOCX / DOC ── */
  if (DOC_TYPES.includes(ft)) {
    if (ft === 'doc' || ft === 'rtf') {
      return (
        <Placeholder
          icon={<FileText className="h-14 w-14 text-blue-500" />}
          label={`${ft.toUpperCase()} Document`}
          message="Legacy DOC/RTF format cannot be rendered in the browser. Download and open with Word or LibreOffice."
          onDownload={onDownload}
        />
      );
    }
    return <DocxViewer url={previewUrl} onDownload={onDownload} />;
  }

  /* ── Spreadsheets ── */
  if (SHEET_TYPES.includes(ft)) {
    return <SpreadsheetViewer url={previewUrl} ext={ft} onDownload={onDownload} />;
  }

  /* ── Plain text / code ── */
  if (ft === 'txt' || CODE_TYPES.includes(ft)) {
    return <TextViewer url={previewUrl} ext={ft} onDownload={onDownload} />;
  }

  /* ── Presentations ── */
  if (SLIDE_TYPES.includes(ft)) {
    return (
      <Placeholder
        icon={<PresentationIcon className="h-14 w-14 text-orange-500" />}
        label={`${ft.toUpperCase()} Presentation`}
        message="PowerPoint files cannot be rendered in the browser directly. Download to open with PowerPoint, LibreOffice Impress, or upload to Google Slides."
        onDownload={onDownload}
      />
    );
  }

  /* ── Fallback ── */
  return (
    <Placeholder
      icon={<EyeOff className="h-14 w-14 text-muted-foreground" />}
      label={`${ft.toUpperCase() || 'Unknown'} File`}
      message="No preview available for this file type. Download it to view its contents."
      onDownload={onDownload}
    />
  );
};

export default DocumentViewer;
