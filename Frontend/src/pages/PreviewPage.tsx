import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../state';
import { DocumentPaper } from '../components/preview/DocumentPaper';
import { RevisionPanel } from '../components/preview/RevisionPanel';
import { RevisionHistory } from '../components/preview/RevisionHistory';
import { ExtractedFields } from '../components/preview/ExtractedFields';
import { DownloadActions } from '../components/preview/DownloadActions';
import { IconArrowLeft, IconSpinner } from '../components/common/Icons';
import { Button } from '../components/common/Button';

export const PreviewPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { state, loadPreview } = useDocumentStore();

  useEffect(() => {
    if (documentId) {
      // If we don't already have this document in memory or refreshed page
      if (!state.currentDocument || state.currentDocument.documentId !== documentId) {
        loadPreview(documentId);
      }
    }
  }, [documentId, loadPreview, state.currentDocument]);

  const doc = state.currentDocument;

  // Find active version
  const activeVersion = doc?.versions.find(
    (v: any) => v.versionNumber === state.activeVersionNumber
  ) || doc?.versions[doc.versions.length - 1] || null;

  if (state.isPreviewLoading && !doc) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <IconSpinner size={24} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Loading document draft...
        </span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
        <h2>Document not found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          The requested document could not be loaded from storage or cache.
        </p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Return to Studio
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Top action bar */}
      <nav className="preview-top-bar" aria-label="Document Toolbar">
        <div className="preview-top-left">
          <Link to="/" className="btn btn-ghost btn-sm" aria-label="Return to Studio">
            <IconArrowLeft size={14} /> Back
          </Link>
          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-hairline)' }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
            {doc.templateName}
          </span>
          <span className="preview-badge">
            v{state.activeVersionNumber} of {doc.versions.length}
          </span>
        </div>

        <DownloadActions
          documentId={doc.documentId}
          templateName={doc.templateName}
        />
      </nav>

      {/* Main two-column preview stage */}
      <div className="preview-layout">
        <main className="preview-paper-stage">
          <DocumentPaper
            version={activeVersion}
            templateName={doc.templateName}
          />
        </main>

        <aside className="preview-controls-panel" aria-label="Revision and Parameters Panel">
          <RevisionPanel />
          <RevisionHistory />
          <ExtractedFields />
        </aside>
      </div>
    </div>
  );
};
