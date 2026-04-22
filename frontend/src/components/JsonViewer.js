import React from 'react';
import { FileText, Calendar, DollarSign, User, Building2 } from 'lucide-react';

const JsonViewer = ({ data, documentId, onExtract, extracting }) => {
  if (!documentId) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-heading font-bold mb-4 tracking-tight" data-testid="json-viewer-title">
          Extracted Data
        </h2>
        <p className="text-text-secondary" data-testid="json-viewer-empty">Upload a document to extract structured data</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-heading font-bold tracking-tight" data-testid="json-viewer-title">
          Extracted Data
        </h2>
        {!data && (
          <button
            onClick={onExtract}
            disabled={extracting}
            className="button-primary text-sm"
            data-testid="extract-button"
          >
            {extracting ? 'Extracting...' : 'Extract Data'}
          </button>
        )}
      </div>

      {data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.invoice_number && (
              <div className="p-4 bg-surface border border-border" data-testid="field-invoice-number">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-primary-action" />
                  <span className="text-xs font-medium text-text-secondary">INVOICE NUMBER</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">{data.invoice_number}</p>
              </div>
            )}

            {data.date && (
              <div className="p-4 bg-surface border border-border" data-testid="field-date">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary-action" />
                  <span className="text-xs font-medium text-text-secondary">DATE</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">{data.date}</p>
              </div>
            )}

            {data.total_amount && (
              <div className="p-4 bg-surface border border-border" data-testid="field-total-amount">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary-action" />
                  <span className="text-xs font-medium text-text-secondary">TOTAL AMOUNT</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">{data.total_amount}</p>
              </div>
            )}

            {data.vendor_name && (
              <div className="p-4 bg-surface border border-border" data-testid="field-vendor-name">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary-action" />
                  <span className="text-xs font-medium text-text-secondary">VENDOR</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">{data.vendor_name}</p>
              </div>
            )}

            {data.customer_name && (
              <div className="p-4 bg-surface border border-border" data-testid="field-customer-name">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary-action" />
                  <span className="text-xs font-medium text-text-secondary">CUSTOMER</span>
                </div>
                <p className="text-lg font-semibold text-text-primary">{data.customer_name}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">RAW JSON</h3>
            <pre className="json-viewer" data-testid="json-output">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <p className="text-text-secondary" data-testid="json-viewer-placeholder">
          Click "Extract Data" to analyze the document
        </p>
      )}
    </div>
  );
};

export default JsonViewer;
