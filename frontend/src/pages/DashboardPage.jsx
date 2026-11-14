import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Languages, Eye, Clock, Sparkles, Mic } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { DocumentReaderTab } from '../components/dashboard/DocumentReaderTab';
import { TranslatorTab } from '../components/dashboard/TranslatorTab';
import { ImageDescriberTab } from '../components/dashboard/ImageDescriberTab';
import { RecentActivityTab } from '../components/dashboard/RecentActivityTab';
import { VoiceAssistantTab } from '../components/dashboard/VoiceAssistantTab';

const WORKSPACE_TABS = [
  {
    id: 'reader',
    label: '1. AI Document Reader',
    shortLabel: 'Document Reader',
    icon: FileText,
    description: 'Extract text, plain-language summary, glossary & contextual Q&A',
  },
  {
    id: 'translator',
    label: '2. Multilingual Translator',
    shortLabel: 'Translator',
    icon: Languages,
    description: 'Translate into Kannada, Hindi, Tamil, Telugu, Malayalam & English',
  },
  {
    id: 'describer',
    label: '3. AI Image Describer',
    shortLabel: 'Image Describer',
    icon: Eye,
    description: 'Screen-reader scene descriptions separating visible facts from inferences',
  },
  {
    id: 'activity',
    label: '4. Recent Activity',
    shortLabel: 'Recent Activity',
    icon: Clock,
    description: 'Saved accessible documents and past actions',
  },
  {
    id: 'voice',
    label: '5. AI Voice Assistant',
    shortLabel: 'Voice Assistant',
    icon: Mic,
    description: 'Web Speech mic input + spoken replies grounded in your documents',
  },
];

export const DashboardPage = () => {
  const { user } = useAuth();
  const { announce } = useAccessibility();

  const [activeTab, setActiveTab] = useState('reader');
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [translatorInitialText, setTranslatorInitialText] = useState('');

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const { data } = await api.get('/activity');
      const docs = data?.documents || [];
      setDocuments(docs);
      setActivities(data?.activities || []);
      setStats(data?.stats || null);

      setSelectedDoc((prev) => {
        if (prev) {
          const updated = docs.find((d) => d._id === prev._id);
          return updated || docs[0] || null;
        }
        return docs[0] || null;
      });
    } catch {
      // Fallback to /documents if needed
      try {
        const { data } = await api.get('/documents');
        setDocuments(data?.documents || []);
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleSendToTranslator = (text) => {
    setTranslatorInitialText(text || '');
    setActiveTab('translator');
    announce('Switched to Multilingual Translator tab with selected text loaded.');
  };

  const handleOpenDocumentInReader = (doc) => {
    setSelectedDoc(doc);
    setActiveTab('reader');
    announce(`Opened ${doc.title} in AI Document Reader.`);
  };

  const handleTabKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = WORKSPACE_TABS[(index + 1) % WORKSPACE_TABS.length];
      setActiveTab(next.id);
      document.getElementById(`tab-btn-${next.id}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev =
        WORKSPACE_TABS[(index - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length];
      setActiveTab(prev.id);
      document.getElementById(`tab-btn-${prev.id}`)?.focus();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Workspace Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-[#1E1B4B] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-4 hc-surface">
        <div>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Unified Accessibility Workspace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
            Welcome, {user?.name || 'Explorer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5 hc-muted">
            Use Tab or Arrow keys to navigate tools, or click any Listen Aloud button for spoken
            output.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700">
            <span className="text-slate-400">Saved Docs: </span>
            <strong className="text-teal-300">{documents.length}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700">
            <span className="text-slate-400">Engine: </span>
            <strong className="text-indigo-300">Neural Multimodal AI</strong>
          </div>
        </div>
      </div>

      {/* Accessible 5-Tab Navigation Bar */}
      <div
        role="tablist"
        aria-label="Workspace Tools"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hc-card"
      >
        {WORKSPACE_TABS.map((tab, idx) => {
          const IconComponent = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                setActiveTab(tab.id);
                announce(`Switched to ${tab.label}`);
              }}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`p-3.5 rounded-xl text-left transition-all flex items-start gap-3 ${
                isSelected
                  ? 'bg-[#4338CA] text-white shadow-sm hc-accent'
                  : 'bg-slate-50 text-slate-800 hover:bg-indigo-50/60 border border-transparent hc-surface'
              }`}
            >
              <IconComponent
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isSelected ? 'text-teal-300' : 'text-[#4338CA]'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-extrabold text-sm truncate">{tab.label}</div>
                <div
                  className={`text-xs line-clamp-1 mt-0.5 ${
                    isSelected ? 'text-indigo-100' : 'text-slate-500 hc-muted'
                  }`}
                >
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-btn-${activeTab}`}
        className="focus:outline-none"
      >
        {activeTab === 'reader' && (
          <DocumentReaderTab
            documents={documents}
            selectedDoc={selectedDoc}
            setSelectedDoc={setSelectedDoc}
            onDocumentsChange={fetchWorkspaceData}
            onSendToTranslator={handleSendToTranslator}
          />
        )}

        {activeTab === 'translator' && (
          <TranslatorTab
            documents={documents}
            initialText={translatorInitialText}
            onTranslationComplete={fetchWorkspaceData}
          />
        )}

        {activeTab === 'describer' && (
          <ImageDescriberTab
            onSendToTranslator={handleSendToTranslator}
            onActivityLogged={fetchWorkspaceData}
          />
        )}

        {activeTab === 'activity' && (
          <RecentActivityTab
            documents={documents}
            activities={activities}
            stats={stats}
            onOpenDocumentInReader={handleOpenDocumentInReader}
            onSendToTranslator={handleSendToTranslator}
            onRefresh={fetchWorkspaceData}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceAssistantTab
            documents={documents}
            selectedDoc={selectedDoc}
            onActivityLogged={fetchWorkspaceData}
          />
        )}
      </div>

      {/* Floating Quick-Launch Button for AI Voice Assistant when on other tabs */}
      {activeTab !== 'voice' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('voice');
              announce('Opened AI Voice Assistant tab');
            }}
            aria-label="Open AI Voice Assistant"
            className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-gradient-to-r from-[#4338CA] to-[#0D9488] hover:from-indigo-700 hover:to-teal-600 text-white font-extrabold text-sm shadow-xl border-2 border-white/20 transition-all hc-accent"
          >
            <Mic className="w-5 h-5" aria-hidden="true" />
            <span>AI Voice Assistant</span>
          </button>
        </div>
      )}
    </div>
  );
};
