import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentStore } from '../../state';
import { Button } from '../common/Button';
import { IconPlus, IconFileText, IconCheck } from '../common/Icons';
import { AddTemplateDrawer } from '../templates/AddTemplateDrawer';

export const TemplateSidebarList: React.FC = () => {
  const { state, setSelectedTemplateId } = useDocumentStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return '';
    }
  };

  return (
    <>
      <aside className="home-sidebar" aria-label="Template Library">
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="sidebar-title">Templates</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              ({state.templates.length})
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAddOpen(true)}
            icon={<IconPlus size={13} />}
          >
            Add
          </Button>
        </div>

        <div className="sidebar-body">
          {state.templates.length === 0 ? (
            <div className="empty-state-panel">
              <IconFileText size={28} className="empty-state-icon" />
              <p className="empty-state-text">No templates saved yet.</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsAddOpen(true)}
                icon={<IconPlus size={12} />}
              >
                Add template
              </Button>
            </div>
          ) : (
            state.templates.map(tpl => {
              const isSelected = state.selectedTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  className={`template-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplateId(isSelected ? null : tpl.id)}
                  title={isSelected ? 'Click to deselect (revert to auto)' : 'Click to select this template'}
                >
                  <div className="template-item-header">
                    <span className="template-item-name">{tpl.name}</span>
                    {isSelected && <IconCheck size={13} style={{ color: 'var(--accent-primary)' }} />}
                  </div>
                  <span className="template-item-desc">{tpl.description}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                    <span className="template-item-date">{formatDate(tpl.createdAt)}</span>
                    {tpl.filename && (
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {tpl.filename}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <Link to="/templates" style={{ fontSize: 'var(--text-xs)' }}>
            View all templates &rarr;
          </Link>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {state.selectedTemplateId ? '1 selected' : 'Auto-select active'}
          </span>
        </div>
      </aside>

      <AddTemplateDrawer
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
};
