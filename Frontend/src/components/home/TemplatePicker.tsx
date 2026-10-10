import React, { useState, useRef, useEffect } from 'react';
import { useDocumentStore } from '../../state';
import { IconChevronDown, IconClose, IconCheck } from '../common/Icons';

export const TemplatePicker: React.FC = () => {
  const { state, setSelectedTemplateId } = useDocumentStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTemplate = state.templates.find(t => t.id === state.selectedTemplateId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="picker-container" ref={containerRef}>
      <button
        type="button"
        className={`picker-trigger ${selectedTemplate ? 'selected' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ color: 'var(--text-muted)' }}>Template:</span>
        <span style={{ fontWeight: 500 }}>
          {selectedTemplate ? selectedTemplate.name : 'Auto-select (let model choose)'}
        </span>
        {selectedTemplate ? (
          <span
            className="picker-clear-btn"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTemplateId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setSelectedTemplateId(null);
              }
            }}
            title="Reset to automatic selection"
          >
            <IconClose size={12} />
          </span>
        ) : (
          <IconChevronDown size={13} />
        )}
      </button>

      {isOpen && (
        <div className="picker-menu" role="listbox">
          <button
            type="button"
            className={`picker-item ${state.selectedTemplateId === null ? 'active' : ''}`}
            onClick={() => {
              setSelectedTemplateId(null);
              setIsOpen(false);
            }}
            role="option"
            aria-selected={state.selectedTemplateId === null}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="picker-item-title">Auto-select</span>
              {state.selectedTemplateId === null && <IconCheck size={13} />}
            </div>
            <span className="picker-item-desc">Let the model inspect the prompt and choose the closest template</span>
          </button>

          <div style={{ height: '1px', backgroundColor: 'var(--border-hairline)', margin: '0.25rem 0' }} />

          {state.templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              className={`picker-item ${state.selectedTemplateId === tpl.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedTemplateId(tpl.id);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={state.selectedTemplateId === tpl.id}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="picker-item-title">{tpl.name}</span>
                {state.selectedTemplateId === tpl.id && <IconCheck size={13} />}
              </div>
              <span className="picker-item-desc">{tpl.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
