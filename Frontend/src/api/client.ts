import {
  Template,
  AddTemplatePayload,
  SelectTemplateResult,
  FillPlaceholdersResult,
  GenerateDocumentResult,
  PreviewResult,
  ReviseResult,
  HealthResult,
  DownloadFormat
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  async checkHealth(): Promise<HealthResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) {
        return { status: 'degraded', ollama_ready: false, message: 'Backend unreachable.' };
      }
      return res.json();
    } catch {
      return { status: 'degraded', ollama_ready: false, message: 'Could not connect to backend server.' };
    }
  },

  async listTemplates(signal?: AbortSignal): Promise<Template[]> {
    const res = await fetch(`${API_BASE_URL}/templates`, { signal });
    if (!res.ok) {
      throw new Error(`Failed to list templates: ${res.statusText}`);
    }
    return res.json();
  },

  async addTemplate(payload: AddTemplatePayload, signal?: AbortSignal): Promise<Template> {
    const formData = new FormData();
    if (payload.file) {
      if (!payload.file.name.toLowerCase().endsWith('.dotx')) {
        throw new Error('Only Microsoft Word template files (.dotx) are permitted.');
      }
      formData.append('file', payload.file);
    } else {
      throw new Error('A .dotx template file is required.');
    }

    if (payload.name) formData.append('name', payload.name);
    if (payload.description) formData.append('description', payload.description);

    const res = await fetch(`${API_BASE_URL}/templates/upload`, {
      method: 'POST',
      body: formData,
      signal
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to upload .dotx template.');
    }
    return res.json();
  },

  async deleteTemplate(id: string, signal?: AbortSignal): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      signal
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.message || 'Failed to delete template.');
    }
    return res.json();
  },

  async selectTemplate(prompt: string, templateId?: number | null, signal?: AbortSignal): Promise<SelectTemplateResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/session/select-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          template_id: templateId || null
        }),
        signal
      });

      const data = await res.json();
      if (!res.ok && res.status !== 422) {
        return {
          status: 'error',
          message: data.detail || data.message || 'Failed to select template.'
        };
      }
      return data as SelectTemplateResult;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      return {
        status: 'error',
        message: 'Could not communicate with the document service.'
      };
    }
  },

  async fillPlaceholders(answers: Record<string, string>, extraContext?: string, signal?: AbortSignal): Promise<FillPlaceholdersResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/session/fill-placeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          extra_context: extraContext || null
        }),
        signal
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          status: 'error',
          filled: answers,
          missing: [],
          isComplete: false,
          message: data.detail || 'Failed to update placeholder values.'
        };
      }
      return data as FillPlaceholdersResult;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      return {
        status: 'error',
        filled: answers,
        missing: [],
        isComplete: false,
        message: 'Failed to communicate with placeholder service.'
      };
    }
  },

  async generateDocument(signal?: AbortSignal): Promise<GenerateDocumentResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/session/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          status: 'error',
          content: '',
          templateName: '',
          version: 1,
          message: data.detail || 'Document generation failed.'
        };
      }
      return data as GenerateDocumentResult;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      return {
        status: 'error',
        content: '',
        templateName: '',
        version: 1,
        message: 'Could not connect to document generation service.'
      };
    }
  },

  async getPreview(signal?: AbortSignal): Promise<PreviewResult> {
    const res = await fetch(`${API_BASE_URL}/session/preview`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Preview not found.');
    }
    return res.json();
  },

  async reviseDocument(instruction: string, signal?: AbortSignal): Promise<ReviseResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/session/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
        signal
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          status: 'error',
          message: data.detail || 'Document revision failed.'
        };
      }
      return data as ReviseResult;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      return {
        status: 'error',
        message: 'Could not communicate with revision service.'
      };
    }
  },

  async downloadDocument(formatOrDocId: string | DownloadFormat, maybeFormat?: DownloadFormat, signal?: AbortSignal): Promise<Blob> {
    const actualFormat = (maybeFormat || (formatOrDocId === 'pdf' || formatOrDocId === 'docx' ? formatOrDocId : 'pdf')) as DownloadFormat;
    const res = await fetch(`${API_BASE_URL}/session/download?format=${actualFormat}`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Failed to download ${actualFormat.toUpperCase()}.`);
    }
    return res.blob();
  },

  async resetSession(signal?: AbortSignal): Promise<void> {
    await fetch(`${API_BASE_URL}/session/reset`, { method: 'POST', signal }).catch(() => {});
  }
};
