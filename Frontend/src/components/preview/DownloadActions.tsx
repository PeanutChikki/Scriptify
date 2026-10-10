import React, { useState } from 'react';
import { api, DownloadFormat } from '../../api';
import { Button } from '../common/Button';
import { IconDownload, IconRefresh } from '../common/Icons';

interface DownloadActionsProps {
  documentId: string;
  templateName: string;
}

export const DownloadActions: React.FC<DownloadActionsProps> = ({ documentId, templateName }) => {
  const [loadingFormat, setLoadingFormat] = useState<DownloadFormat | null>(null);
  const [errorFormat, setErrorFormat] = useState<DownloadFormat | null>(null);

  const handleDownload = async (format: DownloadFormat) => {
    setLoadingFormat(format);
    setErrorFormat(null);

    try {
      const blob = await api.downloadDocument(documentId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedName = templateName.toLowerCase().replace(/\s+/g, '_');
      a.download = `${sanitizedName}_${documentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLoadingFormat(null);
    } catch (err: unknown) {
      console.error(`Download failed:`, err);
      setLoadingFormat(null);
      setErrorFormat(format);
    }
  };

  return (
    <div className="preview-download-actions">
      {errorFormat && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-primary)', marginRight: '0.25rem' }}>
          Failed to download {errorFormat.toUpperCase()}.
        </span>
      )}

      {errorFormat === 'docx' ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleDownload('docx')}
          icon={<IconRefresh size={13} />}
        >
          Retry DOCX
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleDownload('docx')}
          isLoading={loadingFormat === 'docx'}
          disabled={loadingFormat !== null}
          icon={<IconDownload size={13} />}
        >
          Download DOCX
        </Button>
      )}

      {errorFormat === 'pdf' ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleDownload('pdf')}
          icon={<IconRefresh size={13} />}
        >
          Retry PDF
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          onClick={() => handleDownload('pdf')}
          isLoading={loadingFormat === 'pdf'}
          disabled={loadingFormat !== null}
          icon={<IconDownload size={13} />}
        >
          Download PDF
        </Button>
      )}
    </div>
  );
};
