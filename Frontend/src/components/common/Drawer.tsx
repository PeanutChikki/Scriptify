import React, { useEffect } from 'react';
import { IconClose } from './Icons';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="sidebar-header">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{title}</h3>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close drawer"
            style={{ padding: '0.2rem', borderRadius: '3px' }}
          >
            <IconClose size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>{children}</div>
        {footer && <div className="sidebar-footer">{footer}</div>}
      </div>
    </div>
  );
};
