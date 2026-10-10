import React from 'react';
import { IconClose, IconRefresh } from './Icons';
import { Button } from './Button';

interface IncompleteBannerProps {
  missingFields: string[];
  message: string;
  onDismiss: () => void;
}

export const IncompleteBanner: React.FC<IncompleteBannerProps> = ({
  missingFields,
  message,
  onDismiss
}) => {
  return (
    <div className="banner banner-incomplete" role="alert" aria-live="assertive">
      <div className="banner-content">
        <div className="banner-title">Missing required details</div>
        <p className="banner-message">{message}</p>
        <p className="banner-message" style={{ marginBottom: '0.25rem', fontWeight: 500 }}>
          Please add the following information to your prompt and generate again:
        </p>
        <div className="missing-tags-list">
          {missingFields.map((field, idx) => (
            <span key={idx} className="missing-tag">
              {field}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="banner-close-btn"
        onClick={onDismiss}
        aria-label="Dismiss missing information notification"
      >
        <IconClose size={15} />
      </button>
    </div>
  );
};

interface ErrorBannerProps {
  code?: string;
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  code,
  message,
  onDismiss,
  onRetry
}) => {
  return (
    <div className="banner banner-error" role="alert" aria-live="assertive">
      <div className="banner-content">
        <div className="banner-title">
          {code ? `Generation Error (${code})` : 'Unable to complete request'}
        </div>
        <p className="banner-message">{message}</p>
        {onRetry && (
          <div style={{ marginTop: '0.4rem' }}>
            <Button size="sm" variant="secondary" onClick={onRetry} icon={<IconRefresh size={12} />}>
              Try again
            </Button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="banner-close-btn"
        onClick={onDismiss}
        aria-label="Dismiss error notification"
      >
        <IconClose size={15} />
      </button>
    </div>
  );
};
