import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Template } from '../../api';

interface DeleteConfirmModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  template,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!template) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(template.id);
      setIsDeleting(false);
      onClose();
    } catch (err: unknown) {
      setIsDeleting(false);
      setError(err instanceof Error ? err.message : 'Failed to delete template.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete template"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            Delete permanently
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Are you sure you want to delete the template <strong>"{template.name}"</strong>?
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          This will remove it from the template registry and auto-selection pool.
        </p>

        {error && (
          <div className="banner banner-error" style={{ padding: '0.5rem 0.75rem' }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
