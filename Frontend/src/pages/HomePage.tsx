import React, { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '../state';
import { Button } from '../components/common/Button';
import {
  IconPlus,
  IconCheck,
  IconDownload,
  IconRefresh,
  IconArrowLeft,
  IconClose,
  IconAlertCircle,
  IconSpinner,
  IconTrash
} from '../components/common/Icons';
import { AddTemplateDrawer } from '../components/templates/AddTemplateDrawer';
import { DeleteConfirmModal } from '../components/templates/DeleteConfirmModal';
import { DocumentPaper } from '../components/preview/DocumentPaper';
import { Template } from '../api';

export const HomePage: React.FC = () => {
  const {
    state,
    setScreen,
    setPrompt,
    selectTemplate,
    proceedToScreen2,
    startDocumentFlow,
    submitPlaceholderAnswers,
    reviseDocument,
    downloadDocument,
    dismissError,
    dismissDownloadSuccess,
    removeTemplate
  } = useDocumentStore();

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [missingFieldInputs, setMissingFieldInputs] = useState<Record<string, string>>({});
  const [extraMissingText, setExtraMissingText] = useState('');
  const [revisionInput, setRevisionInput] = useState('');

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const revisionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize missing inputs when missing placeholders change
  useEffect(() => {
    if (state.missingPlaceholders && state.missingPlaceholders.length > 0) {
      const initial: Record<string, string> = {};
      state.missingPlaceholders.forEach(ph => {
        initial[ph] = missingFieldInputs[ph] || '';
      });
      setMissingFieldInputs(initial);
    }
  }, [state.missingPlaceholders]);

  // Handle prompt submission from Screen 2
  const handlePromptSubmit = async () => {
    if (!state.prompt.trim() || state.isProcessing) return;
    await startDocumentFlow();
  };

  // Handle placeholder form submission on Screen 3
  const handlePlaceholderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPlaceholderAnswers(missingFieldInputs, extraMissingText);
    setExtraMissingText('');
  };

  // Handle revision submission on Screen 4
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionInput.trim() || state.isRevising) return;
    const text = revisionInput.trim();
    setRevisionInput('');
    await reviseDocument(text);
  };

  // Handle download selection on Screen 5
  const handleDownloadChoice = async (fmt: 'pdf' | 'docx') => {
    await downloadDocument(fmt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 54px)', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Step Navigator Bar */}
      <nav className="screen-step-nav" aria-label="Application Progress">
        <span
          className={`screen-step-pill ${state.currentScreen === 'screen1_library' ? 'active' : ''}`}
          onClick={() => setScreen('screen1_library')}
          style={{ cursor: 'pointer' }}
        >
          1. Template Library
        </span>
        <span>&rsaquo;</span>
        <span
          className={`screen-step-pill ${state.currentScreen === 'screen2_prompt' ? 'active' : ''}`}
          onClick={() => setScreen('screen2_prompt')}
          style={{ cursor: 'pointer' }}
        >
          2. Document Prompt
        </span>
        <span>&rsaquo;</span>
        <span
          className={`screen-step-pill ${state.currentScreen === 'screen3_placeholders' ? 'active' : ''}`}
        >
          3. Missing Information
        </span>
        <span>&rsaquo;</span>
        <span
          className={`screen-step-pill ${state.currentScreen === 'screen4_preview' ? 'active' : ''}`}
        >
          4. Preview & Revisions
        </span>
      </nav>

      {/* Global Alerts & Banners */}
      {state.error && (
        <div className="banner banner-error" role="alert" style={{ margin: '1rem 2rem 0' }}>
          <div className="banner-content">
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Action Needed</span>
            <p style={{ fontSize: 'var(--text-xs)', marginTop: '0.2rem' }}>{state.error}</p>
          </div>
          <button type="button" className="banner-close-btn" onClick={dismissError} aria-label="Close error">
            <IconClose size={14} />
          </button>
        </div>
      )}

      {state.downloadSuccessMessage && (
        <div
          className="banner"
          role="status"
          style={{
            margin: '1rem 2rem 0',
            backgroundColor: 'var(--success-subtle)',
            borderColor: 'var(--success-border)',
            color: 'var(--success-primary)'
          }}
        >
          <div className="banner-content" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconCheck size={16} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{state.downloadSuccessMessage}</span>
          </div>
          <button type="button" className="banner-close-btn" onClick={dismissDownloadSuccess} aria-label="Close message">
            <IconClose size={14} />
          </button>
        </div>
      )}

      {/* Global Processing Card */}
      {state.isProcessing && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '2rem',
            zIndex: 100,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-modal)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <IconSpinner size={18} />
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{state.processStage || 'Processing with Qwen...'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Local Ollama inference active</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: TEMPLATE LIBRARY                                                */}
      {/* ========================================================================= */}
      {state.currentScreen === 'screen1_library' && (
        <main className="templates-container" style={{ paddingBottom: '3rem' }}>
          <div className="templates-header-row" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2>Template Library</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Choose an existing document template or upload a new Word template (.dotx only).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                onClick={() => setIsAddDrawerOpen(true)}
                icon={<IconPlus size={14} />}
              >
                Add New (.dotx)
              </Button>
              <Button
                variant="primary"
                onClick={() => proceedToScreen2()}
              >
                Use Existing &rarr;
              </Button>
            </div>
          </div>

          {state.isTemplatesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <IconSpinner size={24} />
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                Loading templates from database...
              </p>
            </div>
          ) : (
            <div className="templates-grid">
              {state.templates.map(tpl => {
                const isSelected = state.selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className={`template-full-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectTemplate(isSelected ? null : tpl.id, tpl.name)}
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-hairline)',
                      boxShadow: isSelected ? '0 0 0 1px var(--accent-primary)' : undefined
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{tpl.name}</h3>
                        {isSelected && (
                          <span className="env-tag" style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-border)' }}>
                            <IconCheck size={11} style={{ marginRight: '3px' }} /> Selected
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                        {tpl.description}
                      </p>

                      {tpl.placeholders && tpl.placeholders.length > 0 && (
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                            Parameters ({tpl.placeholders.length}):
                          </span>
                          <div className="missing-tags-list">
                            {tpl.placeholders.slice(0, 4).map((ph, idx) => (
                              <span key={idx} className="env-tag" style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-canvas)' }}>
                                {ph}
                              </span>
                            ))}
                            {tpl.placeholders.length > 4 && (
                              <span className="env-tag" style={{ fontSize: '0.68rem' }}>
                                +{tpl.placeholders.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="template-card-actions" style={{ justifyContent: 'space-between', marginTop: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {tpl.filename || 'standard template'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateToDelete(tpl);
                          }}
                          aria-label={`Delete ${tpl.name}`}
                          title="Delete template"
                          style={{ color: 'var(--danger-primary)', padding: '0.35rem 0.5rem' }}
                        >
                          <IconTrash size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectTemplate(tpl.id, tpl.name);
                            proceedToScreen2(tpl.id);
                          }}
                        >
                          {isSelected ? 'Continue' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: PROMPT INPUT                                                    */}
      {/* ========================================================================= */}
      {state.currentScreen === 'screen2_prompt' && (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem 10rem' }}>
          <div style={{ maxWidth: '780px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2>Describe what you need</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  State the type of document, requirements, and content. Qwen will identify the template and extract fields.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScreen('screen1_library')}
                icon={<IconArrowLeft size={13} />}
              >
                Back to Templates
              </Button>
            </div>

            {/* Template indicator badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.85rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontSize: 'var(--text-xs)'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Template Mode:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                {state.selectedTemplateName ? `Selected: ${state.selectedTemplateName}` : 'Auto-select (let local Qwen choose)'}
              </span>
              {state.selectedTemplateId && (
                <button
                  type="button"
                  className="picker-clear-btn"
                  onClick={() => selectTemplate(null, '')}
                  title="Switch to automatic selection"
                  style={{ marginLeft: '0.25rem' }}
                >
                  <IconClose size={12} />
                </button>
              )}
            </div>

            {/* Fallback manual picker if Qwen failed selection after retry */}
            {state.manualSelectionRequired && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--warning-subtle)',
                  border: '1px solid var(--warning-border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning-primary)', marginBottom: '0.5rem' }}>
                  <IconAlertCircle size={16} />
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>Manual Template Selection Required</span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', marginBottom: '0.75rem' }}>
                  The local model could not automatically match your prompt to a template. Please select one manually:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {state.templates.map(tpl => (
                    <Button
                      key={tpl.id}
                      size="sm"
                      variant={state.selectedTemplateId === tpl.id ? 'primary' : 'secondary'}
                      onClick={() => selectTemplate(tpl.id, tpl.name)}
                    >
                      {tpl.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', padding: '1.25rem', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              <strong>Prompt Tip:</strong> Include details such as names, dates, amounts, reason, and purpose. Any missing details will be asked in the next step.
            </div>
          </div>

          {/* Text box fixed at the bottom center */}
          <div className="bottom-fixed-box">
            <textarea
              ref={promptTextareaRef}
              className="prompt-textarea"
              rows={3}
              value={state.prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handlePromptSubmit();
                }
              }}
              placeholder="e.g. Leave application for Alex Morgan from Computer Science dept for 3 days starting 12 Oct 2026 due to personal reasons. Submitting to Principal Dr. Smith at ABC College."
              disabled={state.isProcessing}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Press <kbd className="keyboard-kbd">Ctrl</kbd> + <kbd className="keyboard-kbd">Enter</kbd> to submit
              </span>
              <Button
                variant="primary"
                onClick={handlePromptSubmit}
                isLoading={state.isProcessing}
                disabled={!state.prompt.trim() || state.isProcessing}
              >
                {state.isProcessing ? 'Processing with Qwen...' : 'Generate Document →'}
              </Button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: FILLING PLACEHOLDERS (MISSING-INFORMATION LOOP)                 */}
      {/* ========================================================================= */}
      {state.currentScreen === 'screen3_placeholders' && (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem 4rem' }}>
          <div style={{ maxWidth: '780px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2>Complete missing information</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Template: <strong>{state.selectedTemplateName}</strong>. Please provide values for the required parameters.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScreen('screen2_prompt')}
                icon={<IconArrowLeft size={13} />}
              >
                Back to Prompt
              </Button>
            </div>

            <form onSubmit={handlePlaceholderSubmit}>
              {/* Missing Fields Section */}
              {state.missingPlaceholders.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--warning-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Missing Fields ({state.missingPlaceholders.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                    {state.missingPlaceholders.map((ph, idx) => (
                      <div key={idx} className="missing-field-card missing">
                        <label className="form-label" htmlFor={`ph-${idx}`} style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {idx + 1}. {ph} <span style={{ color: 'var(--danger-primary)' }}>*</span>
                        </label>
                        <input
                          id={`ph-${idx}`}
                          type="text"
                          className="form-input"
                          value={missingFieldInputs[ph] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMissingFieldInputs(prev => ({ ...prev, [ph]: val }));
                          }}
                          placeholder={`Enter value for ${ph}...`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already Filled Fields Section */}
              {Object.keys(state.filledValues).length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--success-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Identified Fields ({Object.keys(state.filledValues).length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(state.filledValues).map(([ph, val], idx) => (
                      <div key={idx} className="missing-field-card filled">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ph}</span>
                          <span className="env-tag" style={{ color: 'var(--success-primary)' }}>
                            <IconCheck size={10} style={{ marginRight: '2px' }} /> Found
                          </span>
                        </div>
                        <input
                          type="text"
                          className="form-input"
                          value={missingFieldInputs[ph] !== undefined ? missingFieldInputs[ph] : val}
                          onChange={(e) => {
                            const updated = e.target.value;
                            setMissingFieldInputs(prev => ({ ...prev, [ph]: updated }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra context or chat-style additions */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="extra-context">
                  Or describe remaining details in plain words (optional):
                </label>
                <textarea
                  id="extra-context"
                  className="form-textarea"
                  rows={2}
                  value={extraMissingText}
                  onChange={(e) => setExtraMissingText(e.target.value)}
                  placeholder="e.g. My contact number is 9876543210 and destination is Mumbai."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={state.isProcessing}
                  disabled={state.isProcessing}
                >
                  Save & Generate Document →
                </Button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: PREVIEW AND REVISIONS ("ANY CHANGES?")                          */}
      {/* ========================================================================= */}
      {state.currentScreen === 'screen4_preview' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top action bar */}
          <nav className="preview-top-bar" aria-label="Document Toolbar">
            <div className="preview-top-left">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setScreen('screen2_prompt')}
              >
                <IconArrowLeft size={14} /> Back to Prompt
              </button>
              <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-hairline)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {state.selectedTemplateName || 'Document Draft'}
              </span>
              <span className="preview-badge">
                Version {state.version}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownloadChoice('docx')}
                icon={<IconDownload size={13} />}
              >
                Word (.docx)
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownloadChoice('pdf')}
                icon={<IconDownload size={13} />}
              >
                PDF
              </Button>
            </div>
          </nav>

          {/* Document Preview Stage */}
          <div className="preview-layout" style={{ paddingBottom: '9rem' }}>
            <main className="preview-paper-stage">
              <DocumentPaper
                content={state.outputDocumentText}
                templateName={state.selectedTemplateName}
                version={state.version}
              />
            </main>

            <aside className="preview-controls-panel">
              <div className="preview-section">
                <div className="preview-section-title">Version History</div>
                <div className="history-list">
                  {state.revisionHistory.map((rev, i) => (
                    <div
                      key={i}
                      className="history-item"
                      style={{ cursor: 'default' }}
                    >
                      <div className="history-item-top">
                        <span className="history-version-badge">v{rev.version}</span>
                        {i === state.revisionHistory.length - 1 && (
                          <span className="env-tag" style={{ color: 'var(--success-primary)' }}>Current</span>
                        )}
                      </div>
                      <span className="history-instruction">{rev.instruction}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preview-section">
                <div className="preview-section-title">Parameters Applied</div>
                <div className="fields-dl">
                  {Object.entries(state.filledValues).map(([k, v]) => (
                    <div key={k} className="field-row">
                      <span className="field-label">{k}</span>
                      <span className="field-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          {/* Revisions Box: Fixed at the bottom center */}
          <div className="bottom-fixed-box">
            <form onSubmit={handleRevisionSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label className="form-label" htmlFor="revision-input" style={{ margin: 0, fontWeight: 600 }}>
                  Do you want any changes?
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Qwen will rewrite output.txt with your adjustments
                </span>
              </div>
              <textarea
                id="revision-input"
                ref={revisionTextareaRef}
                className="form-textarea"
                rows={2}
                value={revisionInput}
                onChange={(e) => setRevisionInput(e.target.value)}
                placeholder="e.g. Change the start date to 15th October, or make the letter more formal"
                disabled={state.isRevising}
                style={{ width: '100%', marginBottom: '0.4rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={state.isRevising}
                  disabled={!revisionInput.trim() || state.isRevising}
                  icon={<IconRefresh size={13} />}
                >
                  {state.isRevising ? 'Updating document...' : 'Apply Revision'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Template (.dotx only) Drawer */}
      <AddTemplateDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
      />

      {/* Delete Template Confirmation Modal */}
      <DeleteConfirmModal
        template={templateToDelete}
        isOpen={templateToDelete !== null}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={removeTemplate}
      />
    </div>
  );
};
