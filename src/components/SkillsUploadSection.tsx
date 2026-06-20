import { useCallback, useRef, useState } from "react";
import {
  isValidSkillFileName,
  parseSkillMarkdown,
  readSkillFile,
  validateSkill,
  type ParsedSkill,
  type SkillValidationIssue,
} from "../lib/parseSkill";

interface UploadedSkill {
  fileName: string;
  fileSize: number;
  parsed: ParsedSkill;
  issues: SkillValidationIssue[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SkillsUploadSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [upload, setUpload] = useState<UploadedSkill | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    if (!isValidSkillFileName(file.name)) {
      setUpload(null);
      setError("Please upload a file named SKILL.md or skills.md.");
      return;
    }

    const content = await readSkillFile(file);
    const parsed = parseSkillMarkdown(content);

    if (!parsed) {
      setUpload(null);
      setError(
        "Could not parse frontmatter. Make sure the file starts with YAML frontmatter between --- markers.",
      );
      return;
    }

    setUpload({
      fileName: file.name,
      fileSize: file.size,
      parsed,
      issues: validateSkill(parsed),
    });
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const clearUpload = () => {
    setUpload(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadParsed = () => {
    if (!upload) return;

    const blob = new Blob([upload.parsed.raw], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "SKILL.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const hasErrors = upload?.issues.some((issue) => issue.level === "error") ?? false;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Skills upload</h2>
          <p>
            Drop a <code>SKILL.md</code> or <code>skills.md</code> file here to preview
            and validate it.
          </p>
        </div>
        {upload && (
          <button type="button" className="button button-ghost" onClick={clearUpload}>
            Clear
          </button>
        )}
      </div>

      <div
        className={`dropzone${isDragging ? " dropzone-active" : ""}${upload ? " dropzone-filled" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload skills markdown file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".md,text/markdown"
          className="dropzone-input"
          onChange={(event) => handleFiles(event.target.files)}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon" aria-hidden="true">
            ↑
          </div>
          <p className="dropzone-title">
            {upload ? upload.fileName : "Choose a skills file or drag it here"}
          </p>
          <p className="dropzone-hint">
            Accepts <code>SKILL.md</code> and <code>skills.md</code> with YAML frontmatter
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {upload && (
        <div className="upload-results">
          <div className="meta-grid">
            <div className="meta-card">
              <span className="meta-label">File</span>
              <strong>{upload.fileName}</strong>
            </div>
            <div className="meta-card">
              <span className="meta-label">Size</span>
              <strong>{formatBytes(upload.fileSize)}</strong>
            </div>
            <div className="meta-card">
              <span className="meta-label">Skill name</span>
              <strong>{upload.parsed.frontmatter.name ?? "—"}</strong>
            </div>
            <div className="meta-card meta-card-wide">
              <span className="meta-label">Description</span>
              <strong>{upload.parsed.frontmatter.description ?? "—"}</strong>
            </div>
          </div>

          {upload.issues.length > 0 && (
            <div className="issues-list">
              {upload.issues.map((issue) => (
                <div
                  key={issue.message}
                  className={`alert ${issue.level === "error" ? "alert-error" : "alert-warning"}`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {upload.issues.length === 0 && (
            <div className="alert alert-success">Skill file looks valid.</div>
          )}

          <div className="preview-block">
            <div className="preview-header">
              <h3>Preview</h3>
              <button
                type="button"
                className="button button-primary"
                onClick={downloadParsed}
                disabled={hasErrors}
              >
                Download as SKILL.md
              </button>
            </div>
            <pre className="preview-content">{upload.parsed.raw}</pre>
          </div>

          <div className="install-note">
            <strong>Install manually:</strong> copy the file to{" "}
            <code>~/.cursor/skills/&lt;skill-name&gt;/SKILL.md</code> for personal skills, or{" "}
            <code>.cursor/skills/&lt;skill-name&gt;/SKILL.md</code> for project skills.
          </div>
        </div>
      )}
    </section>
  );
}
