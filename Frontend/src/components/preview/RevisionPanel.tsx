import React, { useState } from 'react';
import { useDocumentStore } from '../../state';
import { Button } from '../common/Button';
import { IconRefresh, IconClose } from '../common/Icons';

export const RevisionPanel: React.FC = () => {
  const { state, revise, dismissPreviewError } = useDocumentStore();
  const [instruction, setInstruction] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || state.isRevising) return;

    const ok = await revise(instruction.trim());
    if (ok) {
      setInstruction('');
    }
  };

  return (
    <div className="preview-section">
      <div className="preview-section-title">Change some details</div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        Specify adjustments or corrected data. The model maintains all previous context to update the document.
      </p>

      {state.previewError && (
        <div
          className="banner banner-error"
          style={{ marginBottom: '0.85rem', padding: '0.65rem 0.85rem' }}
          role="alert"
        >
          <div className="banner-content">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
              {state.previewError.missingFields ? 'Missing revision details' : 'Revision failed'}
            </span>
            <p style={{ fontSize: 'var(--text-xs)', marginTop: '0.2rem' }}>
              {state.previewError.message}
            </p>
            {state.previewError.missingFields && (
              <div className="missing-tags-list" style={{ marginTop: '0.35rem' }}>
                {state.previewError.missingFields.map((f, i) => (
                  <span key={i} className="missing-tag" style={{ fontSize: '0.68rem' }}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="banner-close-btn"
            onClick={dismissPreviewError}
            aria-label="Dismiss error"
          >
            <IconClose size={13} />
          </button>
        </div>
      )}

      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <textarea
          className="form-textarea"
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Change the salary to 20 LPA and the start date to 1 Dec"
          disabled={state.isRevising}
          aria-label="Document revision instructions"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={state.isRevising}
            disabled={!instruction.trim() || state.isRevising}
            icon={<IconRefresh size={13} />}
          >
            {state.isRevising ? 'Updating document...' : 'Update'}
          </Button>
        </div>
      </form>
    </div>
  );
};
