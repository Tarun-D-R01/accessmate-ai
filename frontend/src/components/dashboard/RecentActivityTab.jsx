import React from 'react';
import {
  Clock,
  FileText,
  Languages,
  Eye,
  HelpCircle,
  Sparkles,
  Trash2,
  BookOpen,
  Mic,
} from 'lucide-react';
import api from '../../services/api';
import { ListenButton } from '../ListenButton';
import { useAccessibility } from '../../context/AccessibilityContext';

const ACTIVITY_BADGE = {
  DOCUMENT_ANALYZE: {
    label: 'Document Simplified',
    icon: FileText,
    color: 'bg-indigo-100 text-[#4338CA]',
  },
  DOCUMENT_QA: {
    label: 'Document Q&A',
    icon: HelpCircle,
    color: 'bg-blue-100 text-[#2563EB]',
  },
  TRANSLATE: {
    label: 'Language Translation',
    icon: Languages,
    color: 'bg-teal-100 text-[#0D9488]',
  },
  IMAGE_DESCRIBE: {
    label: 'Vision Description',
    icon: Eye,
    color: 'bg-purple-100 text-purple-800',
  },
  ASSISTANT_CHAT: {
    label: 'Voice Assistant',
    icon: Mic,
    color: 'bg-emerald-100 text-emerald-800',
  },
  AUTH_DEMO: {
    label: 'Demo Workspace',
    icon: Sparkles,
    color: 'bg-amber-100 text-amber-800',
  },
};

export const RecentActivityTab = ({
  documents,
  activities,
  stats,
  onOpenDocumentInReader,
  onSendToTranslator,
  onRefresh,
}) => {
  const { announce } = useAccessibility();

  const handleDeleteDocument = async (id, title) => {
    try {
      await api.delete(`/documents/${id}`);
      announce(`Deleted document ${title}`);
      if (onRefresh) onRefresh();
    } catch {
      announce('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Summary Stats */}
      <section aria-label="Workspace Statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Saved Documents',
            value: stats?.totalDocuments ?? documents.length,
            color: 'text-[#4338CA]',
          },
          {
            label: 'Total AI Actions',
            value: stats?.totalActivities ?? activities.length,
            color: 'text-[#2563EB]',
          },
          {
            label: 'Translations Run',
            value: stats?.translationsCount ?? 0,
            color: 'text-[#0D9488]',
          },
          {
            label: 'Images Described',
            value: stats?.imageDescriptionsCount ?? 0,
            color: 'text-purple-700',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hc-card"
          >
            <div className={`text-2xl sm:text-3xl font-extrabold ${stat.color} hc-muted`}>
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-1 hc-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saved Documents Library */}
        <section
          aria-labelledby="activity-docs-heading"
          className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hc-card"
        >
          <div className="flex items-center justify-between">
            <h2
              id="activity-docs-heading"
              className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <BookOpen className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
              <span>Saved Accessible Documents ({documents.length})</span>
            </h2>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center hc-muted">
              No saved documents yet. Analyze a document in Tab 1 to save it here.
            </p>
          ) : (
            <ul className="space-y-3" aria-label="Saved Documents">
              {documents.map((doc) => (
                <li
                  key={doc._id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hc-surface"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-[#0F172A] hc-muted">
                          {doc.title}
                        </h3>
                        {doc.isSample && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-teal-100 text-teal-800">
                            Pre-Seeded Sample
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 hc-muted">
                        {doc.fileName} •{' '}
                        {new Date(doc.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc._id, doc.title)}
                      aria-label={`Delete ${doc.title}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 line-clamp-2 hc-muted">
                    {doc.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenDocumentInReader(doc)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#4338CA] text-white hover:bg-indigo-800 transition-colors hc-accent"
                    >
                      Open in Reader
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendToTranslator(doc.simplifiedText)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] text-white hover:bg-blue-700 transition-colors"
                    >
                      Translate
                    </button>
                    <ListenButton
                      text={`${doc.title}. ${doc.summary}`}
                      speechId={`act-doc-${doc._id}`}
                      label="Listen Summary"
                      size="sm"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Past Activity Timeline */}
        <section
          aria-labelledby="activity-timeline-heading"
          className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hc-card"
        >
          <div className="flex items-center justify-between">
            <h2
              id="activity-timeline-heading"
              className="text-lg font-bold text-[#0F172A] flex items-center gap-2 hc-muted"
            >
              <Clock className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
              <span>Recent Accessibility Activity ({activities.length})</span>
            </h2>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center hc-muted">
              Your recent actions will appear here as you simplify documents, translate text, or
              describe images.
            </p>
          ) : (
            <ol className="space-y-3" aria-label="Chronological Activity Log">
              {activities.map((act) => {
                const badge = ACTIVITY_BADGE[act.type] || ACTIVITY_BADGE.DOCUMENT_ANALYZE;
                const IconComponent = badge.icon;
                return (
                  <li
                    key={act._id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hc-surface"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color}`}
                      >
                        <IconComponent className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{badge.label}</span>
                      </span>
                      <time className="text-xs text-slate-500 hc-muted">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>

                    <div className="font-bold text-sm text-[#0F172A] hc-muted">{act.title}</div>

                    {act.summary && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed hc-muted">
                        {act.summary}
                      </p>
                    )}

                    {act.summary && (
                      <div className="pt-1 flex justify-end">
                        <ListenButton
                          text={`${act.title}. ${act.summary}`}
                          language={act.metadata?.targetLanguage || 'English'}
                          speechId={`act-item-${act._id}`}
                          label="Listen"
                          size="sm"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};
