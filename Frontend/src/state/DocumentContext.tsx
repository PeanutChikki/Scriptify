import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { api, Template, DownloadFormat } from '../api';

export type AppScreen =
  | 'screen1_library'
  | 'screen2_prompt'
  | 'screen3_placeholders'
  | 'screen4_preview';

export interface AppState {
  currentScreen: AppScreen;
  templates: Template[];
  isTemplatesLoading: boolean;
  selectedTemplateId: string | null;
  selectedTemplateName: string;
  prompt: string;

  // Inference & Processing
  isProcessing: boolean;
  processStage: string;
  error: string | null;
  ollamaStatus: { ready: boolean; message: string } | null;
  manualSelectionRequired: boolean;

  // Placeholders
  placeholders: string[];
  filledValues: Record<string, string>;
  missingPlaceholders: string[];

  // Output Preview & Revisions
  outputDocumentText: string;
  version: number;
  revisionHistory: Array<{ version: string; instruction: string; content: string }>;
  isRevising: boolean;

  // Download status
  downloadSuccessMessage: string | null;

  // Backwards compatibility properties
  isGenerating?: boolean;
  generationStage?: string;
  incompleteBanner?: { missingFields: string[]; message: string } | null;
  errorBanner?: { code?: string; message: string } | null;
  currentDocument?: any;
  activeVersionNumber?: number;
  isPreviewLoading?: boolean;
  previewError?: { code?: string; message: string; missingFields?: string[] } | null;
}

type Action =
  | { type: 'SET_SCREEN'; payload: AppScreen }
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_SELECTED_TEMPLATE'; payload: { id: string | null; name?: string } }
  | { type: 'FETCH_TEMPLATES_START' }
  | { type: 'FETCH_TEMPLATES_SUCCESS'; payload: Template[] }
  | { type: 'FETCH_TEMPLATES_ERROR'; payload: string }
  | { type: 'SET_OLLAMA_STATUS'; payload: { ready: boolean; message: string } }
  | { type: 'START_PROCESSING'; payload: string }
  | { type: 'UPDATE_STAGE'; payload: string }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_ERROR'; payload: string | null }
  | {
      type: 'TEMPLATE_SELECTED_RESULT';
      payload: {
        templateId: string;
        templateName: string;
        placeholders: string[];
        filled: Record<string, string>;
        missing: string[];
      };
    }
  | { type: 'MANUAL_SELECTION_REQUIRED'; payload: boolean }
  | {
      type: 'UPDATE_PLACEHOLDERS';
      payload: {
        filled: Record<string, string>;
        missing: string[];
      };
    }
  | {
      type: 'DOCUMENT_GENERATED';
      payload: {
        content: string;
        templateName: string;
        version: number;
      };
    }
  | { type: 'START_REVISING' }
  | {
      type: 'REVISION_SUCCESS';
      payload: {
        content: string;
        version: number;
        instruction: string;
      };
    }
  | { type: 'REVISION_ERROR'; payload: string }
  | { type: 'SET_DOWNLOAD_SUCCESS'; payload: string | null }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  currentScreen: 'screen1_library',
  templates: [],
  isTemplatesLoading: false,
  selectedTemplateId: null,
  selectedTemplateName: '',
  prompt: '',

  isProcessing: false,
  processStage: '',
  error: null,
  ollamaStatus: null,
  manualSelectionRequired: false,

  placeholders: [],
  filledValues: {},
  missingPlaceholders: [],

  outputDocumentText: '',
  version: 1,
  revisionHistory: [],
  isRevising: false,

  downloadSuccessMessage: null,

  // Compatibility defaults
  isGenerating: false,
  generationStage: '',
  incompleteBanner: null,
  errorBanner: null,
  currentDocument: null,
  activeVersionNumber: 1,
  isPreviewLoading: false,
  previewError: null
};

function documentReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, currentScreen: action.payload, error: null };

    case 'SET_PROMPT':
      return { ...state, prompt: action.payload, error: null };

    case 'SET_SELECTED_TEMPLATE':
      return {
        ...state,
        selectedTemplateId: action.payload.id,
        selectedTemplateName: action.payload.name || ''
      };

    case 'FETCH_TEMPLATES_START':
      return { ...state, isTemplatesLoading: true, error: null };

    case 'FETCH_TEMPLATES_SUCCESS':
      return { ...state, isTemplatesLoading: false, templates: action.payload };

    case 'FETCH_TEMPLATES_ERROR':
      return { ...state, isTemplatesLoading: false, error: action.payload };

    case 'SET_OLLAMA_STATUS':
      return { ...state, ollamaStatus: action.payload };

    case 'START_PROCESSING':
      return { ...state, isProcessing: true, processStage: action.payload, error: null };

    case 'UPDATE_STAGE':
      return { ...state, processStage: action.payload };

    case 'STOP_PROCESSING':
      return { ...state, isProcessing: false, processStage: '' };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isProcessing: false };

    case 'MANUAL_SELECTION_REQUIRED':
      return {
        ...state,
        manualSelectionRequired: action.payload,
        isProcessing: false,
        processStage: ''
      };

    case 'TEMPLATE_SELECTED_RESULT':
      return {
        ...state,
        selectedTemplateId: action.payload.templateId,
        selectedTemplateName: action.payload.templateName,
        placeholders: action.payload.placeholders,
        filledValues: action.payload.filled,
        missingPlaceholders: action.payload.missing,
        manualSelectionRequired: false,
        error: null
      };

    case 'UPDATE_PLACEHOLDERS':
      return {
        ...state,
        filledValues: action.payload.filled,
        missingPlaceholders: action.payload.missing,
        error: null
      };

    case 'DOCUMENT_GENERATED':
      return {
        ...state,
        outputDocumentText: action.payload.content,
        selectedTemplateName: action.payload.templateName || state.selectedTemplateName,
        version: action.payload.version,
        revisionHistory: [
          {
            version: '1',
            instruction: 'Initial generation',
            content: action.payload.content
          }
        ],
        currentScreen: 'screen4_preview',
        isProcessing: false,
        processStage: '',
        error: null
      };

    case 'START_REVISING':
      return { ...state, isRevising: true, error: null };

    case 'REVISION_SUCCESS':
      return {
        ...state,
        isRevising: false,
        outputDocumentText: action.payload.content,
        version: action.payload.version,
        revisionHistory: [
          ...state.revisionHistory,
          {
            version: String(action.payload.version),
            instruction: action.payload.instruction,
            content: action.payload.content
          }
        ],
        error: null
      };

    case 'REVISION_ERROR':
      return { ...state, isRevising: false, error: action.payload };

    case 'SET_DOWNLOAD_SUCCESS':
      return { ...state, downloadSuccessMessage: action.payload };

    case 'RESET_STATE':
      return {
        ...initialState,
        templates: state.templates,
        ollamaStatus: state.ollamaStatus
      };

    default:
      return state;
  }
}

interface DocumentContextValue {
  state: AppState;
  setScreen: (screen: AppScreen) => void;
  setPrompt: (text: string) => void;
  selectTemplate: (id: string | null, name?: string) => void;
  loadTemplates: () => Promise<void>;
  uploadDotxTemplate: (file: File, name?: string, description?: string) => Promise<Template>;
  proceedToScreen2: (templateId?: string | null) => void;
  startDocumentFlow: () => Promise<void>;
  submitPlaceholderAnswers: (answers: Record<string, string>, extraContext?: string) => Promise<void>;
  reviseDocument: (instruction: string) => Promise<void>;
  downloadDocument: (format: DownloadFormat) => Promise<void>;
  resetAll: () => Promise<void>;
  dismissError: () => void;
  dismissDownloadSuccess: () => void;

  // Backwards compatibility methods
  setSelectedTemplateId: (id: string | null) => void;
  removeTemplate: (id: string) => Promise<void>;
  createTemplate: (payload: any) => Promise<Template>;
  generate: () => Promise<{ success: boolean; documentId?: string }>;
  cancelGeneration: () => void;
  loadPreview: (documentId: string) => Promise<void>;
  setActiveVersion: (versionNumber: number) => void;
  revise: (instruction: string) => Promise<boolean>;
  dismissIncompleteBanner: () => void;
  dismissErrorBanner: () => void;
  dismissPreviewError: () => void;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(documentReducer, initialState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadTemplates = useCallback(async () => {
    dispatch({ type: 'FETCH_TEMPLATES_START' });
    try {
      const templates = await api.listTemplates();
      dispatch({ type: 'FETCH_TEMPLATES_SUCCESS', payload: templates });
    } catch (err: unknown) {
      dispatch({
        type: 'FETCH_TEMPLATES_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to load template library.'
      });
    }
  }, []);

  const checkHealth = useCallback(async () => {
    const health = await api.checkHealth();
    dispatch({
      type: 'SET_OLLAMA_STATUS',
      payload: { ready: health.ollama_ready, message: health.message }
    });
  }, []);

  useEffect(() => {
    loadTemplates();
    checkHealth();
  }, [loadTemplates, checkHealth]);

  const setScreen = useCallback((screen: AppScreen) => {
    dispatch({ type: 'SET_SCREEN', payload: screen });
  }, []);

  const setPrompt = useCallback((text: string) => {
    dispatch({ type: 'SET_PROMPT', payload: text });
  }, []);

  const selectTemplate = useCallback((id: string | null, name?: string) => {
    dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: { id, name } });
  }, []);

  const uploadDotxTemplate = useCallback(
    async (file: File, name?: string, description?: string): Promise<Template> => {
      dispatch({ type: 'START_PROCESSING', payload: 'Validating and saving .dotx template...' });
      try {
        const created = await api.addTemplate({ file, name, description });
        await loadTemplates();
        dispatch({ type: 'STOP_PROCESSING' });
        // Automatically select the new template and continue to Screen 2
        dispatch({
          type: 'SET_SELECTED_TEMPLATE',
          payload: { id: created.id, name: created.name }
        });
        dispatch({ type: 'SET_SCREEN', payload: 'screen2_prompt' });
        return created;
      } catch (err: unknown) {
        dispatch({ type: 'STOP_PROCESSING' });
        const msg = err instanceof Error ? err.message : 'Template upload failed.';
        dispatch({ type: 'SET_ERROR', payload: msg });
        throw err;
      }
    },
    [loadTemplates]
  );

  const proceedToScreen2 = useCallback((templateId?: string | null) => {
    if (templateId !== undefined) {
      const tpl = state.templates.find(t => t.id === templateId);
      dispatch({
        type: 'SET_SELECTED_TEMPLATE',
        payload: { id: templateId, name: tpl?.name || '' }
      });
    }
    dispatch({ type: 'SET_SCREEN', payload: 'screen2_prompt' });
  }, [state.templates]);

  // Step 3 & 4 execution triggered from Screen 2
  const startDocumentFlow = useCallback(async () => {
    if (!state.prompt.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a description for your document.' });
      return;
    }

    dispatch({ type: 'START_PROCESSING', payload: 'Analyzing request and selecting template...' });

    try {
      const numericId = state.selectedTemplateId ? parseInt(state.selectedTemplateId, 10) : null;
      const selectResult = await api.selectTemplate(state.prompt, numericId);

      if (selectResult.status === 'manual_selection_required') {
        dispatch({ type: 'MANUAL_SELECTION_REQUIRED', payload: true });
        dispatch({
          type: 'SET_ERROR',
          payload: 'Could not automatically identify a template. Please pick one from the list below.'
        });
        return;
      }

      if (selectResult.status === 'error' || !selectResult.templateId) {
        dispatch({
          type: 'SET_ERROR',
          payload: selectResult.message || 'Failed to select template.'
        });
        return;
      }

      dispatch({
        type: 'TEMPLATE_SELECTED_RESULT',
        payload: {
          templateId: selectResult.templateId,
          templateName: selectResult.templateName || 'Document',
          placeholders: selectResult.placeholders || [],
          filled: selectResult.filled || {},
          missing: selectResult.missing || []
        }
      });

      // If placeholders are missing -> go to Screen 3 (Filling Placeholders loop)
      if (selectResult.missing && selectResult.missing.length > 0) {
        dispatch({ type: 'STOP_PROCESSING' });
        dispatch({ type: 'SET_SCREEN', payload: 'screen3_placeholders' });
        return;
      }

      // If all placeholders are already satisfied -> proceed to Step 5 (Document Generation)
      dispatch({ type: 'UPDATE_STAGE', payload: 'Generating final document text...' });
      const genResult = await api.generateDocument();

      if (genResult.status === 'error') {
        dispatch({
          type: 'SET_ERROR',
          payload: genResult.message || 'Failed to generate document text.'
        });
        return;
      }

      dispatch({
        type: 'DOCUMENT_GENERATED',
        payload: {
          content: genResult.content,
          templateName: selectResult.templateName || 'Document',
          version: genResult.version || 1
        }
      });
    } catch (err: unknown) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'An error occurred during document generation.'
      });
    }
  }, [state.prompt, state.selectedTemplateId]);

  // Screen 3: User answers missing placeholders
  const submitPlaceholderAnswers = useCallback(
    async (answers: Record<string, string>, extraContext?: string) => {
      dispatch({ type: 'START_PROCESSING', payload: 'Checking placeholder values...' });

      try {
        const fillResult = await api.fillPlaceholders(answers, extraContext);

        if (fillResult.status === 'error') {
          dispatch({
            type: 'SET_ERROR',
            payload: fillResult.message || 'Failed to update missing fields.'
          });
          return;
        }

        dispatch({
          type: 'UPDATE_PLACEHOLDERS',
          payload: {
            filled: fillResult.filled,
            missing: fillResult.missing
          }
        });

        // Loop until EVERY placeholder has a value
        if (!fillResult.isComplete && fillResult.missing.length > 0) {
          dispatch({ type: 'STOP_PROCESSING' });
          // Stay on Screen 3 until all fields are answered
          return;
        }

        // All placeholders filled! Proceed to Step 5: Document Generation
        dispatch({ type: 'UPDATE_STAGE', payload: 'Generating document text from template...' });
        const genResult = await api.generateDocument();

        if (genResult.status === 'error') {
          dispatch({
            type: 'SET_ERROR',
            payload: genResult.message || 'Failed to generate document text.'
          });
          return;
        }

        dispatch({
          type: 'DOCUMENT_GENERATED',
          payload: {
            content: genResult.content,
            templateName: state.selectedTemplateName || 'Document',
            version: genResult.version || 1
          }
        });
      } catch (err: unknown) {
        dispatch({
          type: 'SET_ERROR',
          payload: err instanceof Error ? err.message : 'Failed to update placeholder information.'
        });
      }
    },
    [state.selectedTemplateName]
  );

  // Screen 4: Revision loop
  const reviseDocument = useCallback(async (instruction: string) => {
    if (!instruction.trim()) return;
    dispatch({ type: 'START_REVISING' });

    try {
      const res = await api.reviseDocument(instruction);
      if (res.status !== 'ok' || !res.content) {
        const errMsg = (res as any).message || 'Failed to update document.';
        dispatch({
          type: 'REVISION_ERROR',
          payload: errMsg
        });
        return;
      }

      dispatch({
        type: 'REVISION_SUCCESS',
        payload: {
          content: res.content,
          version: res.version || state.version + 1,
          instruction
        }
      });
    } catch (err: unknown) {
      dispatch({
        type: 'REVISION_ERROR',
        payload: err instanceof Error ? err.message : 'Failed to apply revision.'
      });
    }
  }, [state.version]);

  // Screen 5: Download and reset session
  const downloadDocument = useCallback(
    async (format: DownloadFormat) => {
      dispatch({ type: 'START_PROCESSING', payload: `Preparing ${format.toUpperCase()} file...` });

      try {
        const blob = await api.downloadDocument(format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (state.selectedTemplateName || 'document')
          .toLowerCase()
          .replace(/\s+/g, '_');
        a.download = `${safeName}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show downloaded successfully message
        dispatch({ type: 'STOP_PROCESSING' });
        dispatch({
          type: 'SET_DOWNLOAD_SUCCESS',
          payload: `Downloaded ${format.toUpperCase()} successfully!`
        });

        // Reset backend session and return to Screen 1
        await api.resetSession();
        setTimeout(() => {
          if (isMountedRef.current) {
            dispatch({ type: 'RESET_STATE' });
            dispatch({ type: 'SET_SCREEN', payload: 'screen1_library' });
          }
        }, 1200);
      } catch (err: unknown) {
        dispatch({ type: 'STOP_PROCESSING' });
        dispatch({
          type: 'SET_ERROR',
          payload: err instanceof Error ? err.message : `Failed to download ${format.toUpperCase()}.`
        });
      }
    },
    [state.selectedTemplateName]
  );

  const resetAll = useCallback(async () => {
    await api.resetSession();
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const dismissError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const dismissDownloadSuccess = useCallback(() => {
    dispatch({ type: 'SET_DOWNLOAD_SUCCESS', payload: null });
  }, []);

  const setSelectedTemplateId = useCallback((id: string | null) => {
    selectTemplate(id);
  }, [selectTemplate]);

  const removeTemplate = useCallback(
    async (id: string) => {
      try {
        await api.deleteTemplate(id);
        await loadTemplates();
        if (state.selectedTemplateId === id) {
          dispatch({
            type: 'SET_SELECTED_TEMPLATE',
            payload: { id: null, name: '' }
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete template.';
        dispatch({ type: 'SET_ERROR', payload: msg });
        throw err;
      }
    },
    [loadTemplates, state.selectedTemplateId]
  );

  const createTemplate = useCallback(async (payload: any): Promise<Template> => {
    if (payload.file) {
      return uploadDotxTemplate(payload.file, payload.name, payload.description);
    }
    throw new Error('A .dotx template file is required.');
  }, [uploadDotxTemplate]);

  const generate = useCallback(async () => {
    await startDocumentFlow();
    return { success: true, documentId: 'active' };
  }, [startDocumentFlow]);

  const cancelGeneration = useCallback(() => {}, []);
  const loadPreview = useCallback(async (_id: string) => {}, []);
  const setActiveVersion = useCallback((_v: number) => {}, []);

  const revise = useCallback(async (instruction: string) => {
    await reviseDocument(instruction);
    return true;
  }, [reviseDocument]);

  const dismissIncompleteBanner = useCallback(() => {}, []);
  const dismissErrorBanner = useCallback(() => dismissError(), [dismissError]);
  const dismissPreviewError = useCallback(() => dismissError(), [dismissError]);

  const value: DocumentContextValue = {
    state: {
      ...state,
      isGenerating: state.isProcessing,
      generationStage: state.processStage,
      isPreviewLoading: state.isProcessing,
      activeVersionNumber: state.version,
      currentDocument: state.outputDocumentText
        ? {
            documentId: 'active',
            templateId: state.selectedTemplateId || '1',
            templateName: state.selectedTemplateName || 'Document',
            prompt: state.prompt,
            currentVersion: state.version,
            versions: state.revisionHistory.map((r, i) => ({
              versionId: `v-${i + 1}`,
              versionNumber: i + 1,
              instruction: r.instruction,
              createdAt: '2026-10-10T10:00:00Z',
              htmlContent: `<pre>${r.content}</pre>`,
              fields: state.filledValues
            })),
            fields: state.filledValues
          }
        : null
    },
    setScreen,
    setPrompt,
    selectTemplate,
    loadTemplates,
    uploadDotxTemplate,
    proceedToScreen2,
    startDocumentFlow,
    submitPlaceholderAnswers,
    reviseDocument,
    downloadDocument,
    resetAll,
    dismissError,
    dismissDownloadSuccess,
    setSelectedTemplateId,
    removeTemplate,
    createTemplate,
    generate,
    cancelGeneration,
    loadPreview,
    setActiveVersion,
    revise,
    dismissIncompleteBanner,
    dismissErrorBanner,
    dismissPreviewError
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
};

export function useDocumentStore(): DocumentContextValue {
  const ctx = useContext(DocumentContext);
  if (!ctx) {
    throw new Error('useDocumentStore must be used within a DocumentProvider');
  }
  return ctx;
}
