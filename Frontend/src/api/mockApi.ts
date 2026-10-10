import {
  Template,
  AddTemplatePayload,
  DocumentDetail,
  DocumentVersion,
  GenerateParams,
  GenerateResult,
  ReviseParams,
  ReviseResult,
  DownloadFormat
} from './types';

// Initial built-in templates matching Database/temp_index.json
let mockTemplates: Template[] = [
  {
    id: 'tpl-1',
    name: 'Leave Application',
    description: 'Academic and workplace leave request form with roll/employee number and date range.',
    filename: 'leave_application.docx',
    createdAt: '2026-10-01T10:00:00Z',
    placeholders: ['Applicant Name', 'Department', 'Roll / Employee ID', 'From Date', 'To Date', 'Reason', 'Contact Number']
  },
  {
    id: 'tpl-2',
    name: 'Event Budget Request',
    description: 'Itemized event budget proposal for college or corporate department sanction.',
    filename: 'event_budget.docx',
    createdAt: '2026-10-02T11:30:00Z',
    placeholders: ['Event Name', 'Organizing Body', 'Tentative Date', 'Expected Attendees', 'Estimated Budget', 'Faculty In-Charge']
  },
  {
    id: 'tpl-3',
    name: 'Expense Report',
    description: 'Itemized expense reimbursement claim with category breakdown and receipt references.',
    filename: 'expense_report.docx',
    createdAt: '2026-10-03T09:15:00Z',
    placeholders: ['Employee Name', 'Expense Period', 'Total Amount', 'Department', 'Manager Approval']
  },
  {
    id: 'tpl-4',
    name: 'Purchase Order',
    description: 'Vendor procurement authorization for lab hardware, books, or office assets.',
    filename: 'purchase_order.docx',
    createdAt: '2026-10-03T14:45:00Z',
    placeholders: ['Vendor Name', 'PO Number', 'Delivery Address', 'Line Items', 'Payment Terms']
  },
  {
    id: 'tpl-5',
    name: 'Travel Request',
    description: 'Official conference or fieldwork travel clearance with allowance estimate.',
    filename: 'travel_request.docx',
    createdAt: '2026-10-04T16:20:00Z',
    placeholders: ['Traveler Name', 'Destination', 'Departure Date', 'Return Date', 'Purpose', 'Estimated Cost']
  },
  {
    id: 'tpl-6',
    name: 'Tax Invoice',
    description: 'Standard consulting and deliverables invoice with GST/VAT breakdown and bank coordinates.',
    filename: 'invoice.docx',
    createdAt: '2026-10-05T08:00:00Z',
    placeholders: ['Client Name', 'Invoice Date', 'Due Date', 'Service Description', 'Subtotal', 'Tax Amount', 'Total']
  },
  {
    id: 'tpl-7',
    name: 'Timesheet Summary',
    description: 'Bi-weekly contractor or intern timesheet with task log and milestone hours.',
    filename: 'timesheet.docx',
    createdAt: '2026-10-05T12:00:00Z',
    placeholders: ['Contractor Name', 'Period Ending', 'Total Hours', 'Project Code', 'Supervisor']
  },
  {
    id: 'tpl-8',
    name: 'Meeting Minutes',
    description: 'Executive committee or project standup minutes with attendees and decision log.',
    filename: 'meeting_minutes.docx',
    createdAt: '2026-10-06T15:30:00Z',
    placeholders: ['Meeting Title', 'Date & Time', 'Chairperson', 'Attendees', 'Key Discussions', 'Action Items']
  },
  {
    id: 'tpl-9',
    name: 'Project Proposal',
    description: 'Engineering scope of work, technical architecture overview, and phased milestones.',
    filename: 'project_proposal.docx',
    createdAt: '2026-10-06T18:45:00Z',
    placeholders: ['Project Title', 'Client / Sponsor', 'Lead Architect', 'Proposed Timeline', 'Estimated Budget']
  },
  {
    id: 'tpl-10',
    name: 'Performance Review',
    description: 'Semi-annual engineering appraisal review with KPI evaluations and next goals.',
    filename: 'performance_review.docx',
    createdAt: '2026-10-07T09:00:00Z',
    placeholders: ['Reviewee Name', 'Job Title', 'Review Period', 'Manager', 'Key Achievements', 'Rating']
  },
  {
    id: 'tpl-11',
    name: 'Employment Offer Letter',
    description: 'Official employment contract outlining role, compensation (CTC), and start date.',
    filename: 'offer_letter.docx',
    createdAt: '2026-10-07T14:10:00Z',
    placeholders: ['Candidate Name', 'Designation', 'Annual CTC', 'Joining Date', 'Work Location', 'Acceptance Deadline']
  }
];

// In-memory document storage
const mockDocuments = new Map<string, DocumentDetail>();

// Helper for delay with abort signal support
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted by user', 'AbortError'));
    }
    const timer = setTimeout(() => {
      resolve();
    }, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted by user', 'AbortError'));
    });
  });
}

function generateDocumentHtml(title: string, fields: Record<string, string | number>, versionNumber: number): string {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  if (title.toLowerCase().includes('offer')) {
    return `
      <div class="doc-header">
        <div class="doc-meta-right">Ref: SCR/HR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}<br>Date: ${dateStr}</div>
        <h1 class="doc-title">Letter of Employment Offer</h1>
        <p class="doc-subtitle">Scriptify Technologies Private Limited</p>
      </div>

      <div class="doc-body">
        <p>Dear <strong>${fields['Candidate Name'] || 'Candidate'}</strong>,</p>

        <p>We are delighted to extend an offer of employment for the position of <strong>${fields['Designation'] || 'Software Engineer'}</strong> at Scriptify Technologies. We believe your skills and passion will be instrumental in building our document-generation platform.</p>

        <table class="doc-table">
          <tbody>
            <tr>
              <td><strong>Designation</strong></td>
              <td>${fields['Designation'] || 'Software Engineer'}</td>
            </tr>
            <tr>
              <td><strong>Annual Compensation (CTC)</strong></td>
              <td>${fields['Annual CTC'] || '18 LPA'}</td>
            </tr>
            <tr>
              <td><strong>Commencement Date</strong></td>
              <td>${fields['Joining Date'] || '1 November 2026'}</td>
            </tr>
            <tr>
              <td><strong>Work Location</strong></td>
              <td>${fields['Work Location'] || 'Bangalore, India'}</td>
            </tr>
            <tr>
              <td><strong>Reporting Manager</strong></td>
              <td>${fields['Reporting Manager'] || 'Head of Engineering'}</td>
            </tr>
          </tbody>
        </table>

        <p>This offer is contingent upon successful verification of your credentials and prior employment references. Please review the employment handbook attached to this communication.</p>

        <p>To confirm your acceptance, kindly sign and return a duplicate copy of this letter prior to <strong>${fields['Acceptance Deadline'] || '25 October 2026'}</strong>.</p>

        <p>We look forward to welcoming you to the engineering division.</p>
      </div>

      <div class="doc-footer">
        <div class="doc-sign-block">
          <p class="doc-sign-name">Siddharth Varma</p>
          <p class="doc-sign-role">Vice President, Talent & People</p>
          <p class="doc-sign-org">Scriptify Technologies Pvt. Ltd.</p>
        </div>
        <div class="doc-version-tag">Draft Revision v${versionNumber}</div>
      </div>
    `;
  }

  if (title.toLowerCase().includes('leave')) {
    return `
      <div class="doc-header">
        <div class="doc-meta-right">Date: ${dateStr}</div>
        <h1 class="doc-title">Application for Formal Leave</h1>
        <p class="doc-subtitle">Academic & Institutional Records</p>
      </div>

      <div class="doc-body">
        <p>To,<br>The Head of Department,<br>Department of Artificial Intelligence,<br>Sardar Vallabhbhai Institute of Technology.</p>

        <p><strong>Subject: Request for leave permission — ${fields['Reason'] || 'Academic Event Participation'}</strong></p>

        <p>Respected Sir/Madam,</p>

        <p>I am writing to formally request leave of absence from academic activities from <strong>${fields['From Date'] || '15 October 2026'}</strong> to <strong>${fields['To Date'] || '17 October 2026'}</strong>.</p>

        <p>The leave is required for the following reason: <strong>${fields['Reason'] || 'Representing college in regional technical hackathon'}</strong>.</p>

        <table class="doc-table">
          <tbody>
            <tr>
              <td><strong>Applicant Name</strong></td>
              <td>${fields['Applicant Name'] || 'Aarav Mehta'}</td>
            </tr>
            <tr>
              <td><strong>ID / Roll Number</strong></td>
              <td>${fields['Roll / Employee ID'] || 'AI23B047'}</td>
            </tr>
            <tr>
              <td><strong>Department</strong></td>
              <td>${fields['Department'] || 'Artificial Intelligence'}</td>
            </tr>
            <tr>
              <td><strong>Contact Phone</strong></td>
              <td>${fields['Contact Number'] || '+91 98765 43210'}</td>
            </tr>
          </tbody>
        </table>

        <p>I undertake full responsibility to cover all coursework, lab assignments, and notes missed during this duration immediately upon my return.</p>

        <p>Thank you for your consideration.</p>
      </div>

      <div class="doc-footer">
        <div class="doc-sign-block">
          <p class="doc-sign-name">${fields['Applicant Name'] || 'Aarav Mehta'}</p>
          <p class="doc-sign-role">Student, B.Tech 3rd Semester</p>
        </div>
        <div class="doc-version-tag">Draft Revision v${versionNumber}</div>
      </div>
    `;
  }

  // Generic document template
  return `
    <div class="doc-header">
      <div class="doc-meta-right">Date: ${dateStr}</div>
      <h1 class="doc-title">${title}</h1>
      <p class="doc-subtitle">Scriptify Generated Record</p>
    </div>

    <div class="doc-body">
      <p>This document has been compiled based on your instructions and verified against the registered template structure.</p>

      <table class="doc-table">
        <thead>
          <tr>
            <th>Field Attribute</th>
            <th>Extracted Value</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(fields)
            .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`)
            .join('')}
        </tbody>
      </table>

      <p>All stipulations herein conform to standard formatting conventions. Modifications and parameter updates can be requested through the side revision pane.</p>
    </div>

    <div class="doc-footer">
      <div class="doc-sign-block">
        <p class="doc-sign-name">Authorized Signatory</p>
        <p class="doc-sign-role">Operations & Records Office</p>
      </div>
      <div class="doc-version-tag">Draft Revision v${versionNumber}</div>
    </div>
  `;
}

export const mockApi = {
  async listTemplates(): Promise<Template[]> {
    await delay(250);
    return [...mockTemplates];
  },

  async addTemplate(payload: AddTemplatePayload): Promise<Template> {
    await delay(400);
    const templateName = (payload.name || payload.file?.name?.replace(/\.[^/.]+$/, '') || 'Custom Template').trim();

    const newTemplate: Template = {
      id: `tpl-${Date.now()}`,
      name: templateName,
      description: payload.description?.trim() || 'Custom user template',
      filename: payload.file?.name || `${templateName.toLowerCase().replace(/\s+/g, '_')}.docx`,
      createdAt: new Date().toISOString(),
      placeholders: payload.content ? Array.from(payload.content.matchAll(/\{\{([^}]+)\}\}/g)).map(m => m[1]) : []
    };

    mockTemplates = [newTemplate, ...mockTemplates];
    return newTemplate;
  },

  async deleteTemplate(id: string): Promise<void> {
    await delay(300);
    const initialLen = mockTemplates.length;
    mockTemplates = mockTemplates.filter(t => t.id !== id);
    if (mockTemplates.length === initialLen) {
      throw new Error(`Template not found (id: ${id})`);
    }
  },

  async generateDocument(params: GenerateParams): Promise<GenerateResult> {
    const { prompt, templateId, signal } = params;
    const lowerPrompt = prompt.toLowerCase();

    // Latency simulation (abortable)
    await delay(1200, signal);

    // Explicit test triggers for testing error / incomplete flows
    if (lowerPrompt.includes('offline')) {
      return {
        status: 'error',
        code: 'BACKEND_OFFLINE',
        message: 'Could not connect to the Scriptify generation service. Verify that the backend and Ollama are reachable.'
      };
    }

    if (lowerPrompt.includes('timeout')) {
      return {
        status: 'error',
        code: 'LLM_TIMEOUT',
        message: 'The local model did not respond within the allocated timeframe (60s). Please try again with a more concise prompt.'
      };
    }

    if (lowerPrompt.includes('error') || lowerPrompt.includes('fail')) {
      return {
        status: 'error',
        code: 'LLM_INFERENCE_FAILED',
        message: 'Local Ollama process crashed during text extraction. Check system memory or model availability.'
      };
    }

    // Incomplete trigger: prompt explicitly has "incomplete" or lacks any specifics
    if (lowerPrompt.includes('incomplete') || prompt.trim().split(/\s+/).length < 4) {
      return {
        status: 'incomplete',
        missingFields: [
          'Candidate Name',
          'Designation / Role',
          'Annual CTC (Salary)',
          'Commencement / Start Date'
        ],
        message: 'The model identified the Employment Offer Letter template, but your prompt is missing essential parameters to populate it.'
      };
    }

    // Template selection: manual or automatic
    let matchedTemplate: Template;
    if (templateId) {
      const found = mockTemplates.find(t => t.id === templateId);
      if (!found) {
        return {
          status: 'error',
          code: 'TEMPLATE_NOT_FOUND',
          message: `The selected template (${templateId}) was not found in the library.`
        };
      }
      matchedTemplate = found;
    } else {
      // Auto-matching logic simulation
      if (lowerPrompt.includes('leave') || lowerPrompt.includes('absent') || lowerPrompt.includes('permission')) {
        matchedTemplate = mockTemplates.find(t => t.id === 'tpl-1') || mockTemplates[0];
      } else if (lowerPrompt.includes('budget') || lowerPrompt.includes('event')) {
        matchedTemplate = mockTemplates.find(t => t.id === 'tpl-2') || mockTemplates[0];
      } else if (lowerPrompt.includes('invoice') || lowerPrompt.includes('bill')) {
        matchedTemplate = mockTemplates.find(t => t.id === 'tpl-6') || mockTemplates[0];
      } else {
        // Default to Offer Letter for the standard demo prompt
        matchedTemplate = mockTemplates.find(t => t.id === 'tpl-11') || mockTemplates[0];
      }
    }

    // Field extraction simulation
    const fields: Record<string, string | number> = {};
    if (matchedTemplate.id === 'tpl-11' || matchedTemplate.name.toLowerCase().includes('offer')) {
      // Extract candidate name
      const nameMatch = prompt.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      fields['Candidate Name'] = nameMatch ? nameMatch[1] : 'Priya Nair';

      // Extract designation
      if (lowerPrompt.includes('engineer')) fields['Designation'] = 'Software Engineer';
      else if (lowerPrompt.includes('designer')) fields['Designation'] = 'Product Designer';
      else if (lowerPrompt.includes('manager')) fields['Designation'] = 'Product Manager';
      else fields['Designation'] = 'Software Engineer';

      // Extract salary
      const salaryMatch = prompt.match(/(\d+\s*(?:LPA|lpa|INR|lakhs))/i);
      fields['Annual CTC'] = salaryMatch ? salaryMatch[1].toUpperCase() : '18 LPA';

      // Extract date
      const dateMatch = prompt.match(/starting\s+([^,]+)/i);
      fields['Joining Date'] = dateMatch ? dateMatch[1].trim() : '1 November 2026';
      fields['Work Location'] = 'Bangalore, India';
      fields['Reporting Manager'] = 'Head of Engineering';
      fields['Acceptance Deadline'] = '25 October 2026';
    } else if (matchedTemplate.id === 'tpl-1' || matchedTemplate.name.toLowerCase().includes('leave')) {
      fields['Applicant Name'] = 'Aarav Mehta';
      fields['Roll / Employee ID'] = 'AI23B047';
      fields['Department'] = 'Artificial Intelligence';
      fields['From Date'] = '15 October 2026';
      fields['To Date'] = '17 October 2026';
      fields['Reason'] = 'TechNova Hackathon at NIT Surat';
      fields['Contact Number'] = '+91 98765 43210';
    } else {
      fields['Primary Subject'] = 'Standard Administrative Filing';
      fields['Effective Date'] = '10 October 2026';
      fields['Reference Department'] = 'Operations';
      fields['Status'] = 'Draft';
    }

    const documentId = `doc-${Date.now()}`;
    const htmlContent = generateDocumentHtml(matchedTemplate.name, fields, 1);

    const initialVersion: DocumentVersion = {
      versionId: `v-1`,
      versionNumber: 1,
      instruction: 'Initial document generated from prompt',
      createdAt: new Date().toISOString(),
      htmlContent,
      fields
    };

    const docDetail: DocumentDetail = {
      documentId,
      templateId: matchedTemplate.id,
      templateName: matchedTemplate.name,
      prompt,
      currentVersion: 1,
      versions: [initialVersion],
      fields
    };

    mockDocuments.set(documentId, docDetail);

    return {
      status: 'ok',
      documentId,
      templateId: matchedTemplate.id,
      templateName: matchedTemplate.name,
      fields,
      version: 1,
      htmlContent
    };
  },

  async reviseDocument(params: ReviseParams): Promise<ReviseResult> {
    const { documentId, instruction, signal } = params;
    await delay(1200, signal);

    const doc = mockDocuments.get(documentId);
    if (!doc) {
      return {
        status: 'error',
        code: 'DOCUMENT_NOT_FOUND',
        message: `Document ${documentId} not found.`
      };
    }

    const lowerInstr = instruction.toLowerCase();

    if (lowerInstr.includes('incomplete')) {
      return {
        status: 'incomplete',
        missingFields: ['Effective Adjustment Date', 'Authorized Signatory'],
        message: 'The revision model requires specific effective dates to calculate salary adjustments.'
      };
    }

    if (lowerInstr.includes('error') || lowerInstr.includes('fail')) {
      return {
        status: 'error',
        code: 'REVISION_FAILED',
        message: 'Failed to rewrite document parameters with local LLM. Previous version remains intact.'
      };
    }

    // Apply corrections to fields
    const updatedFields = { ...doc.fields };

    // Regex adjustments for compensation
    const salaryMatch = instruction.match(/(\d+\s*(?:LPA|lpa|INR|lakhs))/i);
    if (salaryMatch) {
      updatedFields['Annual CTC'] = salaryMatch[1].toUpperCase();
    }

    // Date adjustments
    const dateMatch = instruction.match(/(?:start|joining)(?:\s+date)?\s+(?:to\s+)?([0-9]{1,2}\s+[A-Za-z]+(?:\s+[0-9]{4})?)/i);
    if (dateMatch) {
      updatedFields['Joining Date'] = dateMatch[1];
    }

    // Role adjustments
    if (lowerInstr.includes('senior')) {
      updatedFields['Designation'] = `Senior ${updatedFields['Designation'] || 'Engineer'}`;
    } else if (lowerInstr.includes('lead')) {
      updatedFields['Designation'] = `Lead ${updatedFields['Designation'] || 'Engineer'}`;
    }

    // Generic note if instruction didn't match specific keys
    if (!salaryMatch && !dateMatch && !lowerInstr.includes('senior') && !lowerInstr.includes('lead')) {
      updatedFields['Revision Notes'] = instruction;
    }

    const nextVerNumber = doc.versions.length + 1;
    const newHtml = generateDocumentHtml(doc.templateName, updatedFields, nextVerNumber);

    const newVersion: DocumentVersion = {
      versionId: `v-${nextVerNumber}`,
      versionNumber: nextVerNumber,
      instruction,
      createdAt: new Date().toISOString(),
      htmlContent: newHtml,
      fields: updatedFields
    };

    doc.versions.push(newVersion);
    doc.currentVersion = nextVerNumber;
    doc.fields = updatedFields;
    mockDocuments.set(documentId, doc);

    return {
      status: 'ok',
      documentId,
      templateId: doc.templateId,
      templateName: doc.templateName,
      fields: updatedFields,
      version: nextVerNumber,
      htmlContent: newHtml
    };
  },

  async getPreview(documentId: string, signal?: AbortSignal): Promise<DocumentDetail> {
    await delay(200, signal);
    const doc = mockDocuments.get(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found.`);
    }
    return doc;
  },

  async getVersion(documentId: string, versionId: string, signal?: AbortSignal): Promise<DocumentVersion> {
    await delay(150, signal);
    const doc = mockDocuments.get(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found.`);
    }
    const ver = doc.versions.find(v => v.versionId === versionId);
    if (!ver) {
      throw new Error(`Version ${versionId} not found on document ${documentId}.`);
    }
    return ver;
  },

  async downloadDocument(documentId: string, format: DownloadFormat, signal?: AbortSignal): Promise<Blob> {
    await delay(600, signal);
    const doc = mockDocuments.get(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found.`);
    }

    const currentVer = doc.versions.find(v => v.versionNumber === doc.currentVersion) || doc.versions[0];
    const mime = format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
    const content = `Mock ${format.toUpperCase()} binary data for ${doc.templateName} (${currentVer.versionId})\n\n${currentVer.htmlContent}`;
    
    return new Blob([content], { type: mime });
  }
};
