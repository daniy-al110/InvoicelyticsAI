import React from 'react';
import { Sparkles, AlertTriangle, Info, HelpCircle } from 'lucide-react';

const AIInsightsPanel = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="w-64 flex-shrink-0 bg-white rounded-[32px] border border-slate-100 shadow-sm p-5 flex flex-col items-center justify-center text-center opacity-70">
        <Sparkles className="w-8 h-8 text-slate-300 mb-3" />
        <h3 className="text-sm font-black text-slate-700">No Insights Yet</h3>
        <p className="text-[10px] text-slate-400 font-medium mt-2">
          Initialize AI Extraction to generate intelligent insights.
        </p>
      </div>
    );
  }

  const renderIcon = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
         return null;
    }
  };

  const getCardStyle = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'border-red-100 bg-red-50/20';
      default:
        return 'border-slate-100 bg-white shadow-sm';
    }
  };

  const getTitleStyle = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'text-red-700 font-bold';
      default:
        return 'text-slate-800 font-black';
    }
  };

  // Helper to format unstructured string messages into stylized little blocks if they contain colons
  const formatMessageAsBlocks = (message) => {
    if (!message) return null;
    const lines = message.split('\n');
    
    // If it looks like KEY: VALUE pairs, render them nicely
    if (lines.length > 0 && lines[0].includes(':')) {
      return (
        <div className="space-y-2 mt-3">
          {lines.map((line, idx) => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const val = parts.slice(1).join(':').trim();
              return (
                <div key={idx} className="bg-[#f2f4fb] p-3 rounded-xl border border-[#e5e9f5]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#7a8bb0] mb-1">{key}</p>
                  <p className="text-sm font-bold text-[#1e293b]">{val}</p>
                </div>
              );
            }
            return <p key={idx} className="text-[13px] text-slate-600 leading-relaxed font-medium mt-3">{line}</p>;
          })}
        </div>
      );
    }
    
    // Fallback standard text rendering
    return <p className={`text-[13px] leading-relaxed font-medium mt-3 ${lines.length > 0 ? 'text-slate-600' : ''}`}>{message}</p>;
  };

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full bg-slate-50/50 rounded-[32px] overflow-hidden custom-scrollbar">
      <div className="p-5 flex items-center gap-3 shrink-0">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-[15px] font-black text-slate-900 tracking-tight">AI Insights</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 pt-0 space-y-4 custom-scrollbar">
        {insights.map((insight, idx) => {
           const TitleIcon = renderIcon(insight.priority);
           return (
            <div key={idx} className={`p-4 rounded-2xl border ${getCardStyle(insight.priority)} transition-all hover:shadow-md`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {TitleIcon}
                  <h3 className={`text-sm tracking-tight ${getTitleStyle(insight.priority)}`}>
                    {insight.category}
                  </h3>
                </div>
                <Info className="w-3.5 h-3.5 text-slate-300" />
              </div>
              
              {formatMessageAsBlocks(insight.message)}
              
              {/* Optional actionable footer for High priority items */}
              {(insight.priority?.toLowerCase() === 'high' || insight.priority?.toLowerCase() === 'critical') && (
                <button className="text-[10px] font-black uppercase tracking-widest text-red-600 mt-4 hover:text-red-700">
                  REVIEW CLAUSE
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIInsightsPanel;
