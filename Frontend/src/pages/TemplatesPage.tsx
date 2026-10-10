import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../state';
import { Template } from '../api';
import { Button } from '../components/common/Button';
import { IconSearch, IconPlus, IconTrash, IconFileText, IconCheck } from '../components/common/Icons';
import { AddTemplateDrawer } from '../components/templates/AddTemplateDrawer';
import { DeleteConfirmModal } from '../components/templates/DeleteConfirmModal';

export const TemplatesPage: React.FC = () => {
  const { state, setSelectedTemplateId, removeTemplate } = useDocumentStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return state.templates;
    return state.templates.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.filename?.toLowerCase().includes(q) ||
        t.placeholders?.some(p => p.toLowerCase().includes(q))
    );
  }, [state.templates, searchQuery]);

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    navigate('/');
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="templates-container">
      <div className="templates-header-row">
        <div>
          <h2>Template Library</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Review registered schemas and templates available for automatic matching.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          icon={<IconPlus size={14} />}
        >
          Add template
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '360px' }}>
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by title or parameters..."
            style={{ paddingLeft: '2.1rem' }}
          />
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <IconSearch size={14} />
          </span>
        </div>

        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Showing {filteredTemplates.length} of {state.templates.length} templates
        </span>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="empty-state-panel" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
          <IconFileText size={32} />
          <p className="empty-state-text">
            {searchQuery ? `No templates found matching "${searchQuery}".` : 'No templates have been added yet.'}
          </p>
          {searchQuery ? (
            <Button size="sm" variant="secondary" onClick={() => setSearchQuery('')}>
              Clear search filter
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)} icon={<IconPlus size={13} />}>
              Add your first template
            </Button>
          )}
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map(tpl => {
            const isCurrentlySelected = state.selectedTemplateId === tpl.id;
            return (
              <div key={tpl.id} className="template-full-card">
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{tpl.name}</h3>
                    {isCurrentlySelected && (
                      <span className="env-tag" style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-border)' }}>
                        <IconCheck size={11} style={{ marginRight: '3px' }} /> Active
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                    {tpl.description}
                  </p>

                  {tpl.placeholders && tpl.placeholders.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Parameters:
                      </span>
                      <div className="missing-tags-list">
                        {tpl.placeholders.slice(0, 4).map((ph, idx) => (
                          <span
                            key={idx}
                            className="env-tag"
                            style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-canvas)' }}
                          >
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Added {formatDate(tpl.createdAt)}</span>
                    {tpl.filename && <span>&bull;</span>}
                    {tpl.filename && <span style={{ fontFamily: 'var(--font-mono)' }}>{tpl.filename}</span>}
                  </div>
                </div>

                <div className="template-card-actions">
                  <Button
                    size="sm"
                    variant={isCurrentlySelected ? 'secondary' : 'primary'}
                    onClick={() => handleUseTemplate(tpl.id)}
                  >
                    {isCurrentlySelected ? 'Preselected in Studio' : 'Use this template'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTemplateToDelete(tpl)}
                    aria-label={`Delete ${tpl.name}`}
                    title="Delete template"
                    style={{ color: 'var(--danger-primary)' }}
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTemplateDrawer
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      <DeleteConfirmModal
        template={templateToDelete}
        isOpen={templateToDelete !== null}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={removeTemplate}
      />
    </div>
  );
};
