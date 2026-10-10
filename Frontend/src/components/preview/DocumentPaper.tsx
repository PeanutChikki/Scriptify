import React from 'react';

interface DocumentPaperProps {
  content?: string;
  templateName?: string;
  version?: number;
}

export const DocumentPaper: React.FC<DocumentPaperProps> = ({
  content,
  templateName = 'Document',
  version = 1
}) => {
  if (!content || !content.trim()) {
    return (
      <div className="document-paper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No document content loaded.</p>
      </div>
    );
  }

  // Parse lines into paragraphs and sections
  const paragraphs = content.split(/\n\s*\n/);

  return (
    <article
      className="document-paper"
      aria-label={`Document Preview: ${templateName} Version ${version}`}
    >
      <div className="doc-header">
        <h1 className="doc-title">{templateName}</h1>
        <div className="doc-subtitle">Generated with Scriptify &bull; Local Qwen</div>
        <div className="doc-meta-right">
          <span>Version {version}</span>
        </div>
      </div>

      <div className="doc-body">
        {paragraphs.map((para, pIdx) => {
          const lines = para.split('\n');
          // Check if paragraph looks like a heading or list
          const firstLine = lines[0].trim();
          const isHeading = firstLine.length < 50 && firstLine === firstLine.toUpperCase() && /^[A-Z0-9\s:_-]+$/.test(firstLine);

          if (isHeading && lines.length === 1) {
            return (
              <h3 key={pIdx} style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem', color: '#111111' }}>
                {firstLine}
              </h3>
            );
          }

          return (
            <p key={pIdx} style={{ marginBottom: '1.25rem', whiteSpace: 'pre-wrap' }}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {line}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        })}
      </div>
    </article>
  );
};
