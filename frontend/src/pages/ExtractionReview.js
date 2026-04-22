import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  Store,
  DollarSign,
  Calendar,
  Save,
  X,
  FileText,
  User,
  Hash,
  Activity,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import DocumentViewer from '../components/DocumentViewer';

const ExtractionReview = ({ data, onSave, onCancel, filename, documentId, extractedText, token }) => {
  const [formData, setFormData] = useState(data || {});
  const [expandedSections, setExpandedSections] = useState({
    financials: true,
    vendor: true,
    metadata: true,
  });

  // Calculate Average Confidence
  const calculateAvgConfidence = () => {
    const fields = Object.values(formData).filter(f => f && typeof f.confidence === 'number');
    if (fields.length === 0) return 0;
    const sum = fields.reduce((acc, f) => acc + f.confidence, 0);
    return Math.round((sum / fields.length) * 100);
  };

  const avgConfidence = calculateAvgConfidence();
  const confidenceLabel = avgConfidence >= 80 ? 'High' : avgConfidence >= 50 ? 'Medium' : 'Low';
  const confidenceColor = avgConfidence >= 80 ? 'text-emerald-500' : avgConfidence >= 50 ? 'text-orange-500' : 'text-red-500';

  useEffect(() => {
    setFormData(data || {});
  }, [data]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...prev[field], value }
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const ConfidenceBadge = ({ score }) => {
    const isHigh = score >= 0.8;
    return (
      <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full border ${isHigh
          ? 'bg-green-50 text-green-600 border-green-100'
          : 'bg-red-50 text-red-600 border-red-100'
        }`}>
        {isHigh ? 'High Confidence' : 'Low Confidence'}
      </span>
    );
  };

  // Logical Sectioning for Hybrid Approach
  const sections = {
    financials: {
      title: 'Financial Details',
      icon: <DollarSign className="w-5 h-5 text-primary" />,
      fields: ['total_amount', 'subtotal', 'tax', 'currency', 'tax_amount']
    },
    vendor: {
      title: 'Vendor Information',
      icon: <Store className="w-5 h-5 text-primary" />,
      fields: ['vendor_name', 'vendor_address', 'vendor_contact', 'vendor_email', 'company_name']
    },
    metadata: {
      title: 'Document Metadata',
      icon: <Hash className="w-5 h-5 text-primary" />,
      fields: ['invoice_number', 'date', 'invoice_date', 'due_date', 'po_number', 'document_type']
    }
  };

  const getUnsectionedFields = () => {
    const sectionedFields = Object.values(sections).flatMap(s => s.fields);
    return Object.keys(formData).filter(key => !sectionedFields.includes(key));
  };

  const renderSection = (key, section) => {
    const relevantFields = section.fields.filter(f => formData[f]);
    if (relevantFields.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-4 transition-all">
        <div
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection(key)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">{section.icon}</div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{section.title}</h2>
          </div>
          {expandedSections[key] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>

        {expandedSections[key] && (
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 mt-4">
            {relevantFields.map(field => renderField(field, formData[field]))}
          </div>
        )}
      </div>
    );
  };

  const renderField = (key, fieldData) => {
    if (!fieldData) return null;
    const { value, confidence } = fieldData;
    const isLow = confidence < 0.7;

    return (
      <div key={key} className="space-y-2 group">
        <div className="flex justify-between items-center px-1">
          <label className="text-xs font-black uppercase text-slate-400 tracking-wider">
            {key.replace(/_/g, ' ')}
          </label>
          <ConfidenceBadge score={confidence} />
        </div>
        <div className="relative group">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className={`w-full bg-slate-50 border border-transparent p-3 rounded-2xl text-sm font-bold text-slate-800 transition-all focus:bg-white focus:ring-4 ${isLow
                ? 'focus:ring-red-500/5 border-red-100 group-hover:border-red-200'
                : 'focus:ring-primary/5 group-hover:border-slate-200'
              }`}
          />
          {isLow && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"><AlertTriangle className="w-4 h-4" /></div>}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="hero-header">
        <div className="hero-header-content">
          <div className="hero-header-icon">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="hero-header-title">
            <h1 className="text-lg">Review & Verify</h1>
            <p className="text-[8px]">Refining Data for {filename || 'New Document'}</p>
          </div>
        </div>

        <div className="hero-header-badge-container">
          <button
            onClick={onCancel}
            className="hero-header-badge text-slate-400 hover:text-red-500 border-transparent bg-transparent shadow-none"
          >
            <X className="w-4 h-4" /> Discard
          </button>
          <button
            onClick={() => onSave(formData)}
            className="hero-header-badge bg-primary text-white shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4" /> Finalize Extraction
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar Preview - LEFT PANEL */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-20 h-fit space-y-4">
           <div className="bg-[#0F172A] rounded-2xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden group min-h-[500px] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
              <div className="flex-1 bg-slate-800 rounded-2xl flex items-center justify-center relative z-10 border border-white/5 overflow-hidden">
                {documentId ? (
                  <iframe
                    src={`${process.env.REACT_APP_BACKEND_URL}/api/documents/${documentId}/file?token=${token}`}
                    className="w-full h-full border-none rounded-2xl min-h-[600px]"
                    title="Document Preview"
                  />
                ) : extractedText ? (
                  <div className="w-full h-full bg-slate-900 overflow-auto custom-scrollbar text-left p-4 min-h-[600px]">
                    <DocumentViewer extractedText={extractedText} filename={filename} />
                  </div>
                ) : (
                  <div className="w-full h-full bg-white/5 rounded-lg flex items-center justify-center relative backdrop-blur-sm p-8 min-h-[600px]">
                     <FileText className="w-20 h-20 text-white/20" />
                  </div>
                )}
              </div>
              <div className="relative z-10 pt-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Source Reference</p>
                <p className="text-xs font-bold text-white truncate px-4">{filename || 'Document Source'}</p>
              </div>
           </div>

           <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-primary/20 rounded-lg"><Activity className="w-4 h-4 text-primary" /></div>
                 <h3 className="text-xs font-black uppercase text-primary tracking-widest">Intelligence Check</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Extraction Confidence</span>
                    <span className={`text-sm font-black ${confidenceColor}`}>{confidenceLabel} ({avgConfidence}%)</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Document Class</span>
                    <span className="text-xs font-black uppercase bg-white px-3 py-1 rounded-full border border-slate-100 text-slate-900 shadow-sm">
                       {formData.document_type?.value || 'Invoice'}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Sections Panel - RIGHT PANEL */}
        <div className="w-full lg:w-1/2">
          {Object.keys(formData).length === 0 ? (
            <div className="bg-white rounded-[24px] border border-dashed border-slate-200 shadow-sm p-10 flex flex-col items-center justify-center text-center h-[350px]">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <ShieldCheck className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">No Extracted Data</h3>
              <p className="text-slate-500 font-medium max-w-sm text-xs">
                There is no structured data available to review for this document. Please go back to the Documents view and run "Initialize Intelligence" first.
              </p>
            </div>
          ) : (
            <>
              {renderSection('metadata', sections.metadata)}
              {renderSection('financials', sections.financials)}
              {renderSection('vendor', sections.vendor)}
              
              {/* Other Fields Section */}
              {getUnsectionedFields().length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                   <div className="p-5 flex items-center gap-3 border-b border-slate-50">
                      <div className="p-2.5 bg-slate-100 rounded-xl"><Activity className="w-5 h-5 text-slate-600" /></div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Additional Intelligence</h2>
                   </div>
                   <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     {getUnsectionedFields().map(field => renderField(field, formData[field]))}
                   </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtractionReview;
