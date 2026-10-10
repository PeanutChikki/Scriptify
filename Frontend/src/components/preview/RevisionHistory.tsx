import React from 'react';
import { useDocumentStore } from '../../state';
import { IconCheck } from '../common/Icons';

export const RevisionHistory: React.FC = () => {
  const { state, setActiveVersion } = useDocumentStore();
  const versions = state.currentDocument?.versions || [];

  if (versions.length === 0) return null;

  return (
    <div className="preview-section">
      <div className="preview-section-title">
        <span>Revision history</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
      </div>

      <div className="history-list" role="list">
        {versions.map((ver: any) => {
          const isActive = ver.versionNumber === state.activeVersionNumber;
          return (
            <button
              key={ver.versionId}
              type="button"
              className={`history-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveVersion(ver.versionNumber)}
              role="listitem"
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="history-item-top">
                <span className="history-version-badge">v{ver.versionNumber}</span>
                {isActive && <IconCheck size={13} style={{ color: 'var(--accent-primary)' }} />}
              </div>
              <span className="history-instruction">{ver.instruction}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
