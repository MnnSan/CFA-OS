/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SearchResult } from '../types';
import { Search, Book, FileText, Calendar, Compass, ArrowRight, X, Terminal } from 'lucide-react';
import { assetSearchService } from '../services/AssetSearchService';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const { 
    subjects, 
    readings, 
    losList, 
    notes, 
    resources, 
    formulas,
    setActiveTab, 
    setSelectedSubjectId, 
    setSelectedReadingId,
    selectLOS,
    setSelectedNoteId,
    setSelectedResourceId,
    addNote,
    selectedSubjectId,
    selectedReadingId,
    selectedLOSId,
    commandRouter
  } = useApp();
  const [query, setQuery] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const isCommand = query.trim().startsWith('>');

  // Query unified Universal Search Index
  const results = (!isCommand && query.trim().length > 1) ? assetSearchService.search(query) : [];

  // Generate command palette options
  const getCommandOptions = () => {
    const rawCmd = query.trim().substring(1).trim();
    const parts = rawCmd.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    const options = [];

    // study command
    if (cmd === '' || 'study'.startsWith(cmd)) {
      options.push({
        id: 'cmd-study',
        type: 'command' as const,
        title: `> study ${arg || '[Reading Number]'}`,
        subtitle: 'Navigate directly to study a specific syllabus Reading',
        execute: () => {
          if (!arg) return alert('Please specify a reading number. Example: > study 12');
          // Dispatch through CommandRouter for EventBus auditing
          commandRouter.executeCommand(`study ${arg}`);
          const readingNum = parseInt(arg);
          const reading = readings.find(r => r.number === readingNum);
          if (reading) {
            setSelectedReadingId(reading.id);
            setSelectedSubjectId(reading.subjectId);
            setActiveTab('curriculum');
            onClose();
          } else {
            alert(`Reading number ${readingNum} not found in Level III syllabus.`);
          }
        }
      });
    }

    // note command
    if (cmd === '' || 'note'.startsWith(cmd)) {
      options.push({
        id: 'cmd-note',
        type: 'command' as const,
        title: `> note ${arg || '"[Note Title]"'}`,
        subtitle: 'Create a new study note instantly and edit it',
        execute: () => {
          if (!arg) return alert('Please specify a note title. Example: > note "Singer-Terhaar Model"');
          // Dispatch through CommandRouter for EventBus auditing
          commandRouter.executeCommand(`note ${arg}`);
          const noteTitle = arg.replace(/['"]/g, '');
          const newNoteId = addNote({
            title: noteTitle,
            content: `# ${noteTitle}\n\nAdd content here...`,
            linkedSubjectId: selectedSubjectId || undefined,
            linkedReadingId: selectedReadingId || undefined,
            linkedLOSId: selectedLOSId || undefined
          });
          setSelectedNoteId(newNoteId);
          setActiveTab('notes');
          onClose();
        }
      });
    }

    // resume command
    if (cmd === '' || 'resume'.startsWith(cmd)) {
      options.push({
        id: 'cmd-resume',
        type: 'command' as const,
        title: `> resume`,
        subtitle: 'Resume study flow or open current active focus session',
        execute: () => {
          commandRouter.executeCommand('resume');
          setActiveTab('dashboard');
          onClose();
        }
      });
    }

    // graph command
    if (cmd === '' || 'graph'.startsWith(cmd)) {
      options.push({
        id: 'cmd-graph',
        type: 'command' as const,
        title: `> graph`,
        subtitle: 'Navigate to Developer Tools to view graph analyzer telemetry',
        execute: () => {
          commandRouter.executeCommand('graph');
          setActiveTab('developer');
          onClose();
        }
      });
    }

    return options;
  };

  const commandOptions = isCommand ? getCommandOptions() : [];

  const handleResultClick = (res: SearchResult) => {
    if (res.type === 'subject') {
      setSelectedSubjectId(res.id);
      setSelectedReadingId(null);
      setActiveTab('curriculum');
    } else if (res.type === 'reading') {
      const rdObj = readings.find(r => r.id === res.id);
      if (rdObj) {
        setSelectedSubjectId(rdObj.subjectId);
        setSelectedReadingId(rdObj.id);
      }
      setActiveTab('curriculum');
    } else if (res.type === 'los') {
      const losObj = losList.find(l => l.id === res.id);
      if (losObj) {
        selectLOS(losObj.id);
      }
      setActiveTab('curriculum');
    } else if (res.type === 'note') {
      setSelectedNoteId(res.id);
      const noteObj = notes.find(n => n.id === res.id);
      if (noteObj && noteObj.linkedLOSId) {
        selectLOS(noteObj.linkedLOSId);
      }
      setActiveTab('notes');
    } else if (res.type === 'resource') {
      setSelectedResourceId(res.id);
      const resObj = resources.find(r => r.id === res.id);
      if (resObj && resObj.linkedReadingId) {
        setSelectedReadingId(resObj.linkedReadingId);
      }
      setActiveTab('resources');
    } else if (res.type === 'formula') {
      const formObj = formulas.find(f => f.id === res.id);
      if (formObj) {
        if (formObj.linkedSubjectId) setSelectedSubjectId(formObj.linkedSubjectId);
        if (formObj.linkedReadingId) setSelectedReadingId(formObj.linkedReadingId);
        if (formObj.linkedLOSId) selectLOS(formObj.linkedLOSId);
      }
      setActiveTab('curriculum');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh] backdrop-blur-xs">
      <div 
        ref={overlayRef}
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-slate-800/60 dark:bg-[#07080a]"
      >
        {/* Search Input Area */}
        <div className="flex items-center border-b border-neutral-100 px-4 py-3 dark:border-slate-800/60">
          <Search className="mr-3 h-5 w-5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-neutral-900 outline-hidden placeholder-neutral-400 dark:text-[#F8FAFC] font-mono"
            placeholder="Search, or prefix with '>' for commands (e.g. > study 12, > note 'ethics notes', > resume)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            onClick={onClose}
            className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500 dark:hover:bg-[#101116]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length <= 1 && !isCommand ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              <Compass className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
              Type at least 2 characters to search, or type '&gt;' to see Command Palette shortcuts.
            </div>
          ) : isCommand && commandOptions.length === 0 ? (
            <div className="py-8 text-center text-xs text-rose-500 font-mono">
              Unknown command. Try study, note, resume, graph
            </div>
          ) : !isCommand && results.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No results found matching "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {(isCommand ? commandOptions : results).map((res, i) => (
                <div
                  key={`${res.type}-${res.id}-${i}`}
                  onClick={() => {
                    if ('execute' in res) {
                      res.execute();
                    } else {
                      handleResultClick(res);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-md p-2.5 hover:bg-neutral-50 dark:hover:bg-[#101116]/50"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {res.type === 'command' ? (
                        <Terminal className="h-4 w-4 text-emerald-500" />
                      ) : res.type === 'subject' || res.type === 'reading' || res.type === 'los' ? (
                        <Book className="h-4 w-4 text-neutral-400" />
                      ) : res.type === 'note' ? (
                        <FileText className="h-4 w-4 text-neutral-400" />
                      ) : res.type === 'resource' ? (
                        <Compass className="h-4 w-4 text-neutral-400" />
                      ) : (
                        <Calendar className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-800 dark:text-[#F8FAFC] truncate">
                        {res.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-slate-500 truncate mt-0.5">
                        {res.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 pl-2">
                    <span className="rounded-sm bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-[#101116] dark:text-slate-400">
                      {res.type}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50/50 px-4 py-2 text-[10px] text-neutral-400 dark:border-slate-800/60 dark:bg-[#07080a]/60">
          <span>{isCommand ? 'Use commands to navigate, log notes, and control study timers' : 'Tip: Prefix with "&gt;" to trigger commands directly'}</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
