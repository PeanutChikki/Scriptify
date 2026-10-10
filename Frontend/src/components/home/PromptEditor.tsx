import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../../state';
import { TemplatePicker } from './TemplatePicker';
import { Button } from '../common/Button';

export const PromptEditor: React.FC = () => {
  const { state, setPrompt, generate } = useDocumentStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // Auto-resize textarea to fit content naturally
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(120, Math.min(el.scrollHeight, 400))}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [state.prompt]);

  const handleSubmit = async () => {
    if (!state.prompt.trim() || state.isGenerating) return;
    const result = await generate();
    if (result.success && result.documentId) {
      navigate(`/preview/${result.documentId}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isPromptEmpty = !state.prompt.trim();

  return (
    <div className="prompt-composer">
      <div className="prompt-picker-bar">
        <TemplatePicker />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Optional template constraint
        </span>
      </div>

      <textarea
        ref={textareaRef}
        className="prompt-textarea"
        value={state.prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Draft an offer letter for Priya Nair, Software Engineer, starting 1 Nov, salary 18 LPA"
        aria-label="Document description prompt"
        disabled={state.isGenerating}
        rows={4}
      />

      <div className="prompt-actions-bar">
        <div className="keyboard-hint">
          Press <kbd className="keyboard-kbd">Ctrl</kbd> + <kbd className="keyboard-kbd">Enter</kbd> to generate
        </div>

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isPromptEmpty || state.isGenerating}
          isLoading={state.isGenerating}
        >
          {state.isGenerating ? 'Generating...' : 'Generate document'}
        </Button>
      </div>
    </div>
  );
};
