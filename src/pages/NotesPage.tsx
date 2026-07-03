/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StudyNote } from '../types';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Edit3, 
  Link2, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';

export const NotesPage: React.FC = () => {
  const { 
    notes, 
    addNote, 
    updateNote, 
    deleteNote, 
    subjects, 
    readings, 
    losList,
    resources,
    selectedNoteId,
    setSelectedNoteId
  } = useApp();

  const activeNoteId = selectedNoteId;
  const setActiveNoteId = setSelectedNoteId;
  
  // Editor State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedSubjectId, setLinkedSubjectId] = useState('');
  const [linkedReadingId, setLinkedReadingId] = useState('');
  const [linkedLOSId, setLinkedLOSId] = useState('');
  const [linkedResourceId, setLinkedResourceId] = useState('');
  
  const [isPreview, setIsPreview] = useState(false);

  // Sync editor fields with active note selection
  useEffect(() => {
    if (activeNoteId) {
      const activeNote = notes.find(n => n.id === activeNoteId);
      if (activeNote) {
        setTitle(activeNote.title);
        setContent(activeNote.content);
        setLinkedSubjectId(activeNote.linkedSubjectId || '');
        setLinkedReadingId(activeNote.linkedReadingId || '');
        setLinkedLOSId(activeNote.linkedLOSId || '');
        setLinkedResourceId(activeNote.linkedResourceId || '');
      }
    } else if (notes.length > 0) {
      setActiveNoteId(notes[0].id);
    } else {
      setTitle('');
      setContent('');
      setLinkedSubjectId('');
      setLinkedReadingId('');
      setLinkedLOSId('');
      setLinkedResourceId('');
    }
  }, [activeNoteId, notes]);

  const handleCreateNewNote = () => {
    const newId = addNote({
      title: 'Untitled Note',
      content: '# New Study Note\n\nBegin summarizing critical points for your upcoming review...',
    });
    setActiveNoteId(newId);
    setIsPreview(false);
  };

  const handleSaveNote = () => {
    if (!activeNoteId) return;
    updateNote(activeNoteId, title, content, {
      linkedSubjectId: linkedSubjectId || undefined,
      linkedReadingId: linkedReadingId || undefined,
      linkedLOSId: linkedLOSId || undefined,
      linkedResourceId: linkedResourceId || undefined
    });
  };

  const handleDeleteNote = () => {
    if (!activeNoteId) return;
    deleteNote(activeNoteId);
    setActiveNoteId(null);
  };

  // Safe and clean Markdown rendering helper
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Split lines
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // 1. Headers
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-1 mt-4 mb-2 dark:text-[#F8FAFC] dark:border-[#1e2026]">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xs font-bold text-neutral-800 mt-4 mb-1.5 dark:text-[#F8FAFC]">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs font-bold text-neutral-500 mt-3 mb-1 dark:text-slate-400">{line.slice(4)}</h3>;
      }
      
      // 2. Bullets
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="text-xs text-neutral-600 list-disc ml-4 leading-normal dark:text-slate-400">{line.slice(2)}</li>;
      }
      
      // 3. Blockquotes
      if (line.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-2 border-neutral-300 pl-3 py-1 my-2 text-xs italic text-neutral-500 dark:border-[#1e2026] dark:text-slate-400">{line.slice(2)}</blockquote>;
      }

      // 4. Code Blocks (simple representation)
      if (line.startsWith('```')) {
        return null; // Skip code fence markers
      }

      // Empty spacing
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      // Normal paragraph
      return <p key={idx} className="text-xs text-neutral-600 leading-normal dark:text-slate-400">{line}</p>;
    });
  };

  const getActiveNoteSubject = () => {
    if (!linkedSubjectId) return null;
    return subjects.find(s => s.id === linkedSubjectId);
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-fade-in">
      
      {/* Left Sidebar Pane: List of Notes */}
      <div className="space-y-3 md:col-span-1">
        <div className="rounded border border-slate-200 bg-white p-4 dark:border-[#1e2026] dark:bg-[#101116]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-[#1e2026]">
            <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-[#F8FAFC]">
              Study Notes ({notes.length})
            </h2>
            <button
              onClick={handleCreateNewNote}
              className="rounded bg-slate-900 p-1 text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-[#07080a]"
              title="Create note"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-1 max-h-[60vh] overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400 py-6">
                No personal summary notes in local storage database.
              </p>
            ) : (
              notes.map((note) => {
                const isSelected = note.id === activeNoteId;
                const subObj = subjects.find(s => s.id === note.linkedSubjectId);
                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      setIsPreview(false);
                    }}
                    className={`flex w-full flex-col text-left rounded p-2.5 transition-all duration-150 ${
                      isSelected 
                        ? 'bg-slate-100 text-slate-900 dark:bg-[#101116] dark:text-[#F8FAFC]' 
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-[#101116]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-[9px] uppercase tracking-wide opacity-75 truncate">
                        {subObj ? subObj.code : 'General Note'}
                      </span>
                      <span className="text-[9px] font-mono opacity-60">
                        {new Date(note.updatedTime).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs font-semibold mt-1 truncate w-full">
                      {note.title}
                    </span>
                    <span className={`text-[10px] mt-0.5 truncate w-full leading-normal ${isSelected ? 'text-slate-600' : 'text-slate-400'}`}>
                      {note.content.replace(/[#*`]/g, '').slice(0, 60)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Content Pane: Editor & Linkage Form */}
      <div className="md:col-span-2">
        {activeNoteId ? (
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4 dark:border-[#1e2026] dark:bg-[#101116]">
            
            {/* Editor Action Header */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 border-b border-slate-150 pb-3 dark:border-[#1e2026]">
              <input
                type="text"
                className="text-base font-semibold text-slate-900 bg-transparent outline-hidden w-full max-w-sm dark:text-[#F8FAFC]"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  updateNote(activeNoteId, e.target.value, content);
                }}
                onBlur={handleSaveNote}
                placeholder="Note Title"
              />
              
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setIsPreview(!isPreview)}
                  className="inline-flex items-center space-x-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors dark:border-[#1e2026] dark:text-slate-400"
                  title={isPreview ? "Switch to Editor Mode" : "Switch to Preview Mode"}
                >
                  {isPreview ? <Edit3 className="h-3.5 w-3.5 text-slate-450" /> : <Eye className="h-3.5 w-3.5 text-slate-450" />}
                  <span>{isPreview ? 'Edit' : 'Preview'}</span>
                </button>

                <button
                  onClick={handleSaveNote}
                  className="inline-flex items-center space-x-1 rounded bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-[#07080a]"
                  title="Manual synchronization"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Sync</span>
                </button>

                <button
                  onClick={handleDeleteNote}
                  className="rounded border border-slate-200 p-1.5 text-slate-400 hover:text-red-600 transition-colors dark:border-[#1e2026]"
                  title="Delete Note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Note Relation Linkage System (Relational database alignment) */}
            <div className="bg-slate-50/50 rounded p-3.5 grid gap-3 sm:grid-cols-2 text-xs border border-slate-100 dark:bg-[#07080a]/30 dark:border-[#1e2026]">
              
              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase">Link Curriculum Subject</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 p-1 bg-white text-slate-800 text-[11px] dark:bg-[#101116] dark:border-[#1e2026] dark:text-[#F8FAFC]"
                  value={linkedSubjectId}
                  onChange={(e) => {
                    setLinkedSubjectId(e.target.value);
                    // Clear deeper chains on parent reset
                    setLinkedReadingId('');
                    setLinkedLOSId('');
                  }}
                  onBlur={handleSaveNote}
                >
                  <option value="">-- No linked subject --</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>[{sub.code}] {sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase">Link Curriculum Reading</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 p-1 bg-white text-slate-800 text-[11px] dark:bg-[#101116] dark:border-[#1e2026] dark:text-[#F8FAFC]"
                  value={linkedReadingId}
                  disabled={!linkedSubjectId}
                  onChange={(e) => {
                    setLinkedReadingId(e.target.value);
                    setLinkedLOSId('');
                  }}
                  onBlur={handleSaveNote}
                >
                  <option value="">-- No linked reading --</option>
                  {readings.filter(r => r.subjectId === linkedSubjectId).map(rd => (
                    <option key={rd.id} value={rd.id}>Reading {rd.number}: {rd.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase">Link Learning Outcome Statement (LOS)</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 p-1 bg-white text-slate-800 text-[11px] dark:bg-[#101116] dark:border-[#1e2026] dark:text-[#F8FAFC]"
                  value={linkedLOSId}
                  disabled={!linkedReadingId}
                  onChange={(e) => setLinkedLOSId(e.target.value)}
                  onBlur={handleSaveNote}
                >
                  <option value="">-- No linked LOS --</option>
                  {losList.filter(l => l.readingId === linkedReadingId).map(los => (
                    <option key={los.id} value={los.id}>LOS {los.code} - {los.statement.slice(0, 50)}...</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase">Link Document Resource</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 p-1 bg-white text-slate-800 text-[11px] dark:bg-[#101116] dark:border-[#1e2026] dark:text-[#F8FAFC]"
                  value={linkedResourceId}
                  onChange={(e) => setLinkedResourceId(e.target.value)}
                  onBlur={handleSaveNote}
                >
                  <option value="">-- No linked resource --</option>
                  {resources.map(res => (
                    <option key={res.id} value={res.id}>[{res.category}] {res.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Editing / Preview Panel */}
            <div className="min-h-[30vh]">
              {isPreview ? (
                <div className="prose max-w-none p-2 space-y-2 dark:prose-invert">
                  {renderMarkdown(content)}
                </div>
              ) : (
                <textarea
                  className="w-full min-h-[30vh] p-2 bg-transparent outline-hidden text-xs text-slate-800 font-mono resize-y leading-relaxed dark:text-[#F8FAFC]"
                  placeholder="Supports standard markdown headers (#), bullet lists (-), quotes (>), and standard text..."
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    updateNote(activeNoteId, title, e.target.value);
                  }}
                  onBlur={handleSaveNote}
                />
              )}
            </div>

            {/* Linkage context badges */}
            {(linkedSubjectId || linkedResourceId) && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-slate-400 dark:border-[#1e2026]">
                <span className="font-mono flex items-center space-x-1">
                  <Link2 className="h-3 w-3 text-slate-400" />
                  <span>Linked Nodes:</span>
                </span>
                {linkedSubjectId && (
                  <span className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 dark:bg-[#101116]">
                    Subject: {subjects.find(s => s.id === linkedSubjectId)?.code}
                  </span>
                )}
                {linkedReadingId && (
                  <span className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 dark:bg-[#101116]">
                    Reading {readings.find(r => r.id === linkedReadingId)?.number}
                  </span>
                )}
                {linkedResourceId && (
                  <span className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 dark:bg-[#101116] truncate max-w-xs">
                    File: {resources.find(r => r.id === linkedResourceId)?.name}
                  </span>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="rounded border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-[#1e2026]">
            Click "Create note" on the sidebar panel to write your first syllabus summary sheet.
          </div>
        )}
      </div>

    </div>
  );
};
