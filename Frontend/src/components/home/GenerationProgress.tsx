import React from 'react';
import { useDocumentStore } from '../../state';
import { Button } from '../common/Button';

export const GenerationProgress: React.FC = () => {
  const { state, cancelGeneration } = useDocumentStore();

  if (!state.isGenerating) return null;

  return (
    <div className="progress-card" role="status" aria-live="polite">
      <div className="progress-left">
        <div className="progress-spinner" />
        <div className="progress-info">
          <span className="progress-title">{state.generationStage || 'Processing document request...'}</span>
          <span className="progress-subtitle">Local LLM inference in progress. Usually takes a few moments.</span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={cancelGeneration}
      >
        Cancel
      </Button>
    </div>
  );
};
