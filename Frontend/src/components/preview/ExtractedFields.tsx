import React from 'react';
import { useDocumentStore } from '../../state';

export const ExtractedFields: React.FC = () => {
  const { state } = useDocumentStore();
  const currentVersion = state.currentDocument?.versions.find(
    (v: any) => v.versionNumber === state.activeVersionNumber
  );

  const fields = currentVersion?.fields || state.currentDocument?.fields || {};
  const entries = Object.entries(fields);

  if (entries.length === 0) return null;

  return (
    <div className="preview-section">
      <div className="preview-section-title">
        <span>Extracted parameters</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {entries.length} attributes
        </span>
      </div>

      <div className="fields-dl">
        {entries.map(([key, value]) => (
          <div key={key} className="field-row">
            <span className="field-label">{key}</span>
            <span className="field-value">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
