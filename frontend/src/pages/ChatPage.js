import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2, UserCog, Briefcase, Sparkles, X, Plus, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import DocumentHistory from '../components/DocumentHistory';

const ChatInterface = ({ documentId, token, documents = [], onSelectDocument }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState('Technical'); // 'Technical' or 'Business'
  const [sidebarWidth, setSidebarWidth] = useState(240); // Reduced from 280 for better horizontal room
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Resizing
  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e) => {
    if (isResizing) {
      const newWidth = e.clientX - 20; // 20 is padding adjustment
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_id: documentId,
          question: inputValue,
          explanation_mode: mode,
          session_id: window.globalSessionId || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Chat failed');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content += data.text;
                  return newMsgs;
                });
              } else if (data.session_id) {
                window.globalSessionId = data.session_id;
              } else if (data.error) {
                 throw new Error(data.error);
              }
            } catch (e) {
               // ignore split-line JSON parsing errors naturally
            }
          }
        }
      }

    } catch (err) {
      console.error("Chat Error Detail:", err);
      
      let detail = err.message;
      const errorMessage = (detail && (detail.includes('quota') || detail.includes('429')))
        ? "Google Gemini Rate Limit: You have exceeded the 5 requests-per-minute quota on your free tier API key. Please wait 60 seconds."
        : "Support currently unavailable: " + detail;
        
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage, isError: true }]);
    } finally {
      setSending(false);
    }
  };

  const currentDoc = documents.find(d => (d.id === documentId || d._id === documentId));

  return (
    <div className="h-full flex flex-col relative">
      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-8 h-8 bg-white border border-slate-100 rounded-full shadow-lg flex items-center justify-center hover:bg-primary hover:text-white transition-all group"
        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>

      <div className="hero-header">
        <div className="hero-header-content">
          <div className="hero-header-icon">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="hero-header-title">
            <h1>{documentId ? 'Contextual AI' : 'Global Assistant'}</h1>
            <p>{documentId ? `Analysis Scope: ${currentDoc?.filename}` : 'Cognitive Synthesis Mode'}</p>
          </div>
        </div>
        
        <div className="hero-header-badge-container">
          <button 
            onClick={() => setMode('Technical')}
            className={`hero-header-badge transition-all ${
              mode === 'Technical' 
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent shadow-none'
            }`}
            title="Detailed, data-driven analysis"
          >
            <UserCog className="w-4 h-4" /> Technical
          </button>
          <button 
            onClick={() => setMode('Business')}
            className={`hero-header-badge transition-all ${
              mode === 'Business' 
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'text-slate-400 hover:text-slate-600 border-transparent bg-transparent shadow-none'
            }`}
            title="High-level value & executive summary"
          >
            <Briefcase className="w-4 h-4" /> Executive
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0 gap-4">
        {/* Sidebar */}
        <div 
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
          className={`hidden md:flex flex-shrink-0 lg:h-full overflow-hidden flex-col transition-all duration-300 ease-in-out ${!isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <DocumentHistory 
            documents={documents}
            activeId={documentId}
            onSelect={onSelectDocument}
            token={token}
          />
        </div>

        {/* Resizer Handle (Desktop Only) */}
        {isSidebarOpen && (
          <div 
            onMouseDown={startResizing}
            className="hidden lg:block w-1 hover:w-1.5 bg-slate-100/50 hover:bg-primary/20 cursor-col-resize transition-all rounded-full h-1/2 self-center active:bg-primary/40"
          />
        )}

        <div className="flex-1 h-full flex flex-col min-h-[400px]">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                     <Sparkles className="w-8 h-8 text-primary opacity-50" />
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">AI Financial Assistant</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Intelligence Context</p>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed mt-4">
                     {documentId 
                      ? <>Query extraction nuances, verify financial logic, or generate an executive summary for <strong>{currentDoc?.filename}</strong>.</>
                      : "The global assistant is ready to analyze your financial patterns across multiple documents."
                     }
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                   <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start animate-in slide-in-from-left-2 duration-300'}`}>
                    <div className={`max-w-[90%] sm:max-w-[80%] px-4 py-3 rounded-[20px] text-sm leading-relaxed shadow-sm transition-all ${
                      msg.isError ? 'bg-red-50 text-red-700 border border-red-100' :
                      msg.role === 'user' 
                      ? 'bg-gradient-to-br from-primary to-primary-600 text-white rounded-tr-none shadow-primary/20 hover:scale-[1.01]' 
                      : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none font-medium hover:scale-[1.01]'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest text-slate-300 mt-1 ${msg.role === 'user' ? 'mr-2' : 'ml-2'}`}>
                      {msg.role === 'user' ? 'You' : 'Invoicelytics AI Agent'}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                     <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase tracking-widest rounded-xl rounded-tl-none border border-slate-100 italic text-slate-400">
                     Agent is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Module - Pinned to Bottom */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={documentId ? `Ask about ${currentDoc?.filename}...` : "Select a document to begin..."}
                  className="w-full pr-14 py-3 px-4 rounded-[20px] border border-slate-200 shadow-inner bg-white text-sm font-medium outline-none focus:border-primary/50 transition-all"
                  disabled={sending}
                />
                <button 
                  type="submit"
                  disabled={sending || !inputValue.trim()}
                  className="absolute right-2 p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
              {!documentId && (
                <p className="text-center text-xs font-black uppercase text-slate-400 tracking-widest mt-4 animate-pulse">
                  Please select a document from the queue to enable context
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
