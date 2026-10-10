import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { useDocumentStore } from '../../state';
import { IconUpload } from '../common/Icons';

interface AddTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTemplateDrawer: React.FC<AddTemplateDrawerProps> = ({ isOpen, onClose }) => {
  const { uploadDotxTemplate } = useDocumentStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    if (!selected.name.toLowerCase().endsWith('.dotx')) {
      setError('Only Microsoft Word template files (.dotx format) are supported.');
      setFile(null);
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (selected.size > MAX_SIZE) {
      setError('File size exceeds the 15MB limit.');
      setFile(null);
      return;
    }

    setFile(selected);
    if (!name.trim()) {
      // Auto-populate name from filename
      const stem = selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setName(stem.charAt(0).toUpperCase() + stem.slice(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a .dotx Word template file.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await uploadDotxTemplate(file, name.trim(), description.trim());
      setName('');
      setDescription('');
      setFile(null);
      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to upload template.');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Word Template (.dotx)"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting || !file}
            icon={<IconUpload size={14} />}
          >
            Upload & Continue to Prompt
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        {error && (
          <div className="banner banner-error" role="alert" style={{ padding: '0.65rem 0.85rem' }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="template-file">
            Template File (.dotx only) <span style={{ color: 'var(--danger-primary)' }}>*</span>
          </label>
          <input
            id="template-file"
            type="file"
            accept=".dotx"
            onChange={handleFileChange}
            className="form-input"
            style={{ fontSize: 'var(--text-xs)' }}
            required
          />
          <small style={{ color: 'var(--text-muted)' }}>
            Must be a Microsoft Word Template file with a <code>.dotx</code> extension.
          </small>
          {file && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', fontWeight: 500, marginTop: '0.25rem' }}>
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="template-name">
            Template Display Name
          </label>
          <input
            id="template-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Leave Application"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="template-desc">
            Short Description
          </label>
          <input
            id="template-desc"
            type="text"
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Department leave request"
          />
        </div>
      </form>
    </Drawer>
  );
};
