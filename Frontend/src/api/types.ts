export type DownloadFormat = 'docx' | 'pdf';

export interface Template {
  id: string;
  index?: number;
  name: string;
  key?: string;
  description: string;
  filename?: string;
  createdAt: string;
  placeholders?: string[];
  content?: string;
}

export interface AddTemplatePayload {
  name?: string;
  description?: string;
  file?: File;
  content?: string;
}

export interface GenerateParams {
  prompt: string;
  templateId?: string | null;
  signal?: AbortSignal;
}

export type GenerateResult =
  | { status: 'ok'; documentId: string; templateId: string; templateName: string; fields: Record<string, any>; version: number; htmlContent?: string }
  | { status: 'incomplete'; missingFields: string[]; message: string }
  | { status: 'error'; code: string; message: string };

export interface ReviseParams {
  documentId: string;
  instruction: string;
  signal?: AbortSignal;
}

export interface DocumentVersion {
  versionId: string;
  versionNumber: number;
  instruction: string;
  createdAt: string;
  htmlContent: string;
  docxBlob?: Blob;
  fields: Record<string, string | number>;
}

export interface DocumentDetail {
  documentId: string;
  templateId: string;
  templateName: string;
  prompt: string;
  currentVersion: number;
  versions: DocumentVersion[];
  fields: Record<string, string | number>;
}

export interface SelectTemplateResult {
  status: 'ok' | 'manual_selection_required' | 'error';
  templateId?: string;
  templateName?: string;
  placeholders?: string[];
  filled?: Record<string, string>;
  missing?: string[];
  isComplete?: boolean;
  message?: string;
}

export interface FillPlaceholdersResult {
  status: 'ok' | 'error';
  filled: Record<string, string>;
  missing: string[];
  isComplete: boolean;
  message?: string;
}

export interface GenerateDocumentResult {
  status: 'ok' | 'error';
  content: string;
  templateName: string;
  version: number;
  message?: string;
}

export interface PreviewResult {
  status: 'ok' | 'error';
  content: string;
  templateName: string;
  version: number;
  history?: Array<{ version: string; instruction: string; content: string }>;
  message?: string;
}

export type ReviseResult =
  | {
      status: 'ok';
      documentId?: string;
      templateId?: string;
      templateName?: string;
      fields?: Record<string, any>;
      version?: number;
      htmlContent?: string;
      content?: string;
    }
  | {
      status: 'incomplete';
      missingFields?: string[];
      message?: string;
    }
  | {
      status: 'error';
      code?: string;
      message?: string;
      missingFields?: string[];
    };

export interface HealthResult {
  status: 'ok' | 'degraded';
  ollama_ready: boolean;
  message: string;
}
