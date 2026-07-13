import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../../context/AppContext';
import { useLearningResources } from '../../../../context/LearningResourceRepositoryContext';
import { resourceLauncherService } from '../../../../services/ResourceLauncherService';
import { eventBus } from '../../../../services/EventBus';
import { Play, RotateCcw, Edit, Copy, CheckSquare as CheckSquareIcon, Search, FolderOpen } from 'lucide-react';
import { Subject, Chapter, Reading, LearningOutcomeStatement, Formula, Resource, StudyNote } from '../../../../types';
import { LearningResource } from '../../../../resources/types';
import {
  CheckCircle2,
  Circle,
  Star,
  BookOpen,
  FileText,
  Clock,
  Award,
  Plus,
  Trash2,
  Sliders,
  Check,
  AlertTriangle,
  Activity,
  Layers,
  Sparkles,
  Link,
  PlusCircle,
  Bookmark,
  Calendar,
  Eye,
  Settings,
  TrendingUp,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Save,
  CheckSquare,
  HelpCircle
} from 'lucide-react';

const ResourceCard: React.FC<{
  resource: LearningResource;
  lrRepo: any;
  onRefresh: () => void;
}> = ({ resource, lrRepo, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...resource });
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  useEffect(() => {
    setEditForm({ ...resource });
  }, [resource]);

  const handleLaunch = () => {
    if (resource.progress.minutesCompleted > 0) {
      resourceLauncherService.resume(resource);
    } else {
      resourceLauncherService.launch(resource);
    }
    lrRepo.markOpened(resource.id);
    onRefresh();
  };

  const handleToggleComplete = () => {
    lrRepo.toggleComplete(resource.id);
    onRefresh();
    eventBus.publish({
      type: 'ReadingProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'ReadingWorkspace',
      entityId: resource.readingId,
      payload: { readingId: resource.readingId }
    });
  };

  const handleReset = () => {
    lrRepo.resetProgress(resource.id);
    onRefresh();
    eventBus.publish({
      type: 'ReadingProgressUpdated',
      timestamp: new Date().toISOString(),
      source: 'ReadingWorkspace',
      entityId: resource.readingId,
      payload: { readingId: resource.readingId }
    });
  };

  const handleDuplicate = () => {
    lrRepo.duplicate(resource.id);
    onRefresh();
  };

  const handleArchive = () => {
    if (confirm('Archive this learning resource?')) {
      lrRepo.archive(resource.id);
      onRefresh();
    }
  };

  const handleSaveEdit = () => {
    lrRepo.update(resource.id, editForm);
    setIsEditing(false);
    onRefresh();
  };

  const handleGenerate = (type: 'Summary' | 'Quiz') => {
    setGeneratingType(type);
    setTimeout(() => {
      setGeneratingType(null);
      alert(`AI Coach has successfully generated a ${type} for "${resource.title}"!`);
    }, 1500);
  };

  const progressPercent = resource.duration > 0
    ? Math.min(100, Math.round((resource.progress.minutesCompleted / resource.duration) * 100))
    : 0;

  return (
    <div className="bg-[#101116] border border-[#1e2026] hover:border-slate-700/80 rounded-lg p-4 transition-all duration-200 space-y-3">
      {/* Header section (always visible) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start justify-between cursor-pointer gap-4 select-none"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-amber-500/80">[{resource.provider}]</span>
            <span className="text-xs font-bold text-slate-200 truncate">{resource.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 border border-[#2d313e]/30 font-semibold">{resource.resourceType}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-mono">
            <span>Duration: {resource.duration} min</span>
            <span>•</span>
            <span className={resource.progress.completed ? 'text-emerald-500 font-semibold' : ''}>
              {resource.progress.completed ? 'Completed' : progressPercent > 0 ? `In Progress (${resource.progress.minutesCompleted}m)` : 'Not Started'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-955 h-1.5 rounded-full overflow-hidden mt-2 border border-slate-900">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${resource.progress.completed ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            className="text-slate-505 hover:text-slate-300 p-1"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details section */}
      {isExpanded && (
        <div className="border-t border-[#1e2026] pt-4 mt-3 space-y-4 text-xs">
          {isEditing ? (
            /* Inline Edit Form */
            <div className="bg-[#0d0e12] border border-blue-900/30 rounded-lg p-4 space-y-4">
              <h5 className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-wider border-b border-slate-900 pb-1.5">
                Edit Learning Resource
              </h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Title</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Provider</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                    value={editForm.provider}
                    onChange={e => setEditForm({ ...editForm, provider: e.target.value as any })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Duration (min)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-955 border border-slate-850 rounded px-2.5 py-1.5 text-slate-202 focus:outline-none focus:border-blue-500 font-mono"
                    value={editForm.duration}
                    onChange={e => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Launch URL</label>
                  <input
                    type="text"
                    className="w-full bg-slate-955 border border-slate-850 rounded px-2.5 py-1.5 text-slate-202 focus:outline-none focus:border-blue-500"
                    value={editForm.launchUrl}
                    onChange={e => setEditForm({ ...editForm, launchUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Description</label>
                  <textarea
                    className="w-full bg-slate-955 border border-slate-855 rounded px-2.5 py-1.5 text-slate-202 focus:outline-none focus:border-blue-500"
                    rows={2}
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Linked LOS Codes (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-955 border border-slate-850 rounded px-2.5 py-1.5 text-slate-202 focus:outline-none focus:border-blue-500 font-mono"
                    value={editForm.losIds?.join(', ') || ''}
                    onChange={e => setEditForm({ ...editForm, losIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Linked Formula IDs (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-955 border border-slate-855 rounded px-2.5 py-1.5 text-slate-202 focus:outline-none focus:border-blue-500 font-mono"
                    value={editForm.resourceLinks?.join(', ') || ''}
                    onChange={e => setEditForm({ ...editForm, resourceLinks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-505 font-mono text-[9px] uppercase font-bold">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-955 border border-slate-850 rounded px-2.5 py-1.5 text-slate-202 focus:outline-none focus:border-blue-500"
                    value={editForm.tags?.join(', ') || ''}
                    onChange={e => setEditForm({ ...editForm, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 text-[10px] font-mono pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 border border-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 bg-blue-650 hover:bg-blue-550 text-white font-bold rounded cursor-pointer"
                >
                  SAVE
                </button>
              </div>
            </div>
          ) : (
            /* Card Details View */
            <div className="space-y-4">
              {resource.description && (
                <div className="text-slate-350 leading-relaxed font-sans">
                  <span className="text-slate-550 font-mono block mb-1">DESCRIPTION</span>
                  {resource.description}
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 border-t border-[#1e2026] pt-3 text-[10px] font-mono text-slate-400">
                <div>
                  <span className="text-slate-550 block mb-0.5">LINKED READING</span>
                  <span className="text-slate-202 font-bold block">{resource.readingId || 'N/A'}</span>
                </div>
                
                <div>
                  <span className="text-slate-550 block mb-0.5">LAST OPENED</span>
                  <span className="text-slate-202 font-bold block">
                    {resource.progress.lastOpenedAt 
                      ? new Date(resource.progress.lastOpenedAt).toLocaleString() 
                      : 'Never'
                    }
                  </span>
                </div>

                <div>
                  <span className="text-slate-550 block mb-0.5">LAUNCH URL</span>
                  <a 
                    href={resource.launchUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-blue-400 hover:underline truncate block max-w-full font-sans text-xs mt-0.5"
                    onClick={e => e.stopPropagation()}
                  >
                    {resource.launchUrl || 'None'}
                  </a>
                </div>

                {(resource.provider === 'Question Bank' || resource.provider === 'Personal') && (
                  <>
                    <div>
                      <span className="text-slate-550 block mb-0.5">COMPLETED</span>
                      <span className="text-slate-202 font-bold block">{resource.progress.completed ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-slate-550 block mb-0.5">DIFFICULTY</span>
                      <span className="text-slate-202 font-bold block">{resource.difficulty || 'Medium'}</span>
                    </div>
                    <div>
                      <span className="text-slate-555 block mb-0.5">QUESTIONS REMAINING</span>
                      <span className="text-slate-202 font-bold block">{resource.progress.completed ? 0 : resource.duration}</span>
                    </div>
                  </>
                )}
                
                {resource.losIds && resource.losIds.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-550 block mb-1">LINKED LOS CODES</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {resource.losIds.map(losId => (
                        <span key={losId} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-bold text-amber-500/80">
                          {losId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {resource.resourceLinks && resource.resourceLinks.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-550 block mb-1">LINKED FORMULAS</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {resource.resourceLinks.map(link => (
                        <span key={link} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-bold text-emerald-500">
                          {link}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {resource.tags && resource.tags.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-550 block mb-1">TAGS</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {resource.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 flex-wrap border-t border-[#1e2026] pt-3 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={handleLaunch}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer transition-colors"
                >
                  {resource.progress.minutesCompleted > 0 ? 'Resume' : 'Launch'}
                </button>
                
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`px-2.5 py-1.5 border rounded cursor-pointer transition-colors font-bold ${
                    resource.progress.completed 
                      ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' 
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {resource.progress.completed ? 'Mark Incomplete' : 'Mark Complete'}
                </button>
                
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded cursor-pointer transition-colors"
                  title="Reset progress to 0%"
                >
                  Reset Progress
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-blue-400 rounded cursor-pointer transition-colors"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-amber-500 rounded cursor-pointer transition-colors"
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  onClick={handleArchive}
                  className="px-2.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-rose-500 rounded cursor-pointer transition-colors"
                >
                  Archive
                </button>

                {/* NotebookLM Specific simulation actions */}
                {resource.provider === 'NotebookLM' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleGenerate('Summary')}
                      disabled={generatingType !== null}
                      className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-550 text-white font-bold rounded cursor-pointer transition-colors disabled:opacity-40"
                    >
                      {generatingType === 'Summary' ? 'Generating Summary...' : 'Generate Summary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate('Quiz')}
                      disabled={generatingType !== null}
                      className="px-2.5 py-1.5 bg-purple-650 hover:bg-purple-550 text-white font-bold rounded cursor-pointer transition-colors disabled:opacity-40"
                    >
                      {generatingType === 'Quiz' ? 'Generating Quiz...' : 'Generate Quiz'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const LinkedResourceCard: React.FC<{
  resource: Resource;
  onDelete: () => void;
}> = ({ resource, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[#101116] border border-[#1e2026] hover:border-slate-700/80 rounded-lg p-4 transition-all duration-200 space-y-3">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText size={15} className="text-blue-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-200 block truncate">{resource.name}</span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
              {resource.category} ({resource.fileType})
            </span>
          </div>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {isExpanded && (
        <div className="border-t border-[#1e2026] pt-3 text-[10px] font-mono text-slate-400 space-y-2">
          <div>
            <span className="text-slate-500 block">URL / FILE PATH</span>
            <a 
              href={resource.url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-400 hover:underline truncate block max-w-full font-sans text-xs mt-0.5"
              onClick={e => e.stopPropagation()}
            >
              {resource.url}
            </a>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 block">DATE ADDED</span>
              <span className="text-slate-202 font-bold mt-0.5 block">
                {resource.dateAdded ? new Date(resource.dateAdded).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">FILE SIZE</span>
              <span className="text-slate-202 font-bold mt-0.5 block">{resource.fileSize || 'N/A'}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#1e2026]/40">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900 border border-red-900/30 text-rose-450 hover:text-white rounded transition-colors text-[9px] font-bold uppercase tracking-wider"
            >
              Delete Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReadingWorkspaceProps {
  readingId: string;
}

export const ReadingWorkspace: React.FC<ReadingWorkspaceProps> = ({ readingId }) => {
  const {
    subjects,
    chapters,
    readings,
    losList,
    formulas,
    resources,
    notes,
    updateLOS,
    toggleLOSBookmark,
    curriculumService,
    curriculumTreeService,
    updateFormula,
    addNote,
    updateNote,
    addResource,
    deleteResource,
    plannerProgress,
    logVideoMinutes,
    recordEOCQCompleted,
    getReadingProgress,
    workspaceState,
    updateWorkspaceState,
    getResourcesByReading,
    markResourceOpened,
    markResourceCompleted,
    updateResourceProgress
  } = useApp();

  const lrRepo = useLearningResources();
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [selectedProviderTab, setSelectedProviderTab] = useState<'ssci' | 'cfai' | 'notebooklm' | 'qbank'>('ssci');

  useEffect(() => {
    const unsub = eventBus.subscribe('*', (event) => {
      if (
        event.type === 'StudySessionCompleted' ||
        event.type === 'ReadingProgressUpdated' ||
        event.type === 'LOSCompleted' ||
        event.type === 'FormulaMemorized' ||
        event.type === 'FormulaReviewed' ||
        event.type === 'ResourceLaunched' ||
        event.type === 'ResourceResumed' ||
        event.type === 'ResourceProgressUpdated' ||
        event.type === 'CurriculumBootstrapped' ||
        event.type === 'PhaseCompleted' ||
        event.type === 'PhaseUncompleted'
      ) {
        setUpdateTrigger(prev => prev + 1);
      }
    });
    return unsub;
  }, []);

  // Selected reading details
  const reading = useMemo(() => readings.find(r => r.id === readingId), [readings, readingId]);
  const parentChap = useMemo(() => chapters.find(c => c.id === reading?.chapterId), [chapters, reading]);
  const parentSub = useMemo(() => subjects.find(s => s.id === reading?.subjectId), [subjects, reading]);

  const activeTab = workspaceState.activeTab || 'los';

  // Sub-tabs configurations
  const subTabs = useMemo(() => [
    { id: 'overview', title: 'Overview', icon: Sliders },
    { id: 'notes', title: 'Notes', icon: Sparkles },
    { id: 'formulas', title: 'Formula Intelligence', icon: Link },
    { id: 'resources', title: 'Resources', icon: BookOpen }
  ] as const, []);

  // Forms state
  const [readingForm, setReadingForm] = useState<Partial<Reading>>({});
  const [newLOSCode, setNewLOSCode] = useState('');
  const [newLOSStatement, setNewLOSStatement] = useState('');
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  
  // Formula linking
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  
  // Resources addition
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceCategory, setNewResourceCategory] = useState('Curriculum PDFs');

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [existingNote, setExistingNote] = useState<StudyNote | null>(null);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable folders state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('reading_workspace_expanded_folders');
      return saved ? JSON.parse(saved) : {
        cfai: true,
        ssci: true,
        notebooklm: true,
        qbank: true,
        reference: true
      };
    } catch {
      return {
        cfai: true,
        ssci: true,
        notebooklm: true,
        qbank: true,
        reference: true
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('reading_workspace_expanded_folders', JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // LOS inline expansion mapping
  const [expandedLOSIds, setExpandedLOSIds] = useState<Record<string, boolean>>({});

  // LOS inline edit state
  const [editingLOSId, setEditingLOSId] = useState<string | null>(null);
  const [editLOSCode, setEditLOSCode] = useState('');
  const [editLOSStatement, setEditLOSStatement] = useState('');
  const [editLOSDifficulty, setEditLOSDifficulty] = useState<string>('');

  // Sync forms on readingId update
  useEffect(() => {
    if (!reading) return;
    setReadingForm({ ...reading });

    // Note configuration
    const note = notes.find(n => n.linkedReadingId === readingId);
    setExistingNote(note || null);
    setNoteContent(note?.content || `# Summary of ${reading.name || reading.title}\n\n*Add structured outlines...*`);
  }, [readingId, reading, notes]);

  // Save Reading updates
  const handleSaveReading = () => {
    if (!readingId) return;
    curriculumService.updateReading(readingId, {
      ...readingForm,
      title: readingForm.name || readingForm.title
    });
    alert('Reading configuration saved!');
  };

  // Add LOS Outcome
  const handleAddLOS = () => {
    if (!newLOSCode || !newLOSStatement) return;
    curriculumService.addLOS(readingId, newLOSCode, newLOSStatement);
    setNewLOSCode('');
    setNewLOSStatement('');
  };

  // Start inline edit of LOS
  const startEditLOS = (los: LearningOutcomeStatement) => {
    setEditingLOSId(los.id);
    setEditLOSCode(los.code);
    setEditLOSStatement(los.statement);
    setEditLOSDifficulty(los.difficulty || '');
  };

  // Cancel inline edit
  const cancelEditLOS = () => {
    setEditingLOSId(null);
    setEditLOSCode('');
    setEditLOSStatement('');
    setEditLOSDifficulty('');
  };

  // Save inline edit
  const saveEditLOS = (losId: string) => {
    if (!editLOSCode || !editLOSStatement) return;
    const updates: Partial<LearningOutcomeStatement> = {
      code: editLOSCode,
      statement: editLOSStatement,
      difficulty: (editLOSDifficulty || null) as LearningOutcomeStatement['difficulty'],
    };
    updateLOS(losId, updates);
    cancelEditLOS();
  };

  // Link formula
  const handleLinkFormula = () => {
    if (!selectedFormulaId) return;
    const formula = formulas.find(f => f.id === selectedFormulaId);
    if (formula) {
      const rdLOS = losList.filter(l => l.readingId === readingId);
      if (rdLOS.length > 0) {
        updateFormula(formula.id, { linkedLOSId: rdLOS[0].id });
        alert('Formula linked successfully!');
      }
    }
  };

  // Save Note commentary
  const handleSaveNote = () => {
    if (existingNote) {
      updateNote(existingNote.id, existingNote.title, noteContent, {
        linkedReadingId: readingId
      });
      alert('Note saved!');
    } else {
      const noteId = addNote({
        title: `${reading?.name || reading?.title} Notes`,
        content: noteContent,
        linkedReadingId: readingId
      });
      const note = notes.find(n => n.id === noteId);
      if (note) setExistingNote(note);
      alert('Note created and saved!');
    }
  };

  // Add resource
  const handleAddResource = () => {
    if (!newResourceName) return;
    addResource({
      name: newResourceName,
      category: newResourceCategory as any,
      url: '#',
      fileType: 'link',
      isFavorite: false,
      description: 'Reference link',
      linkedReadingId: readingId
    });
    setNewResourceName('');
    alert('Resource link added!');
  };

  if (!reading) return null;

  const readingLOS = losList.filter(l => l && l.readingId === readingId);
  const readingFormulas = formulas.filter(f =>
    f && f.linkedLOSId && readingLOS.some(l => l && l.id === f.linkedLOSId)
  );
  const readingResources = resources.filter(r => r && r.linkedReadingId === readingId);
  const linkedResources = useMemo(() => {
    return readingResources.filter(r => r && (r.fileType === 'link' || r.category === 'Formula Sheets' || r.category === 'Mind Maps'));
  }, [readingResources]);
  const linkedReferenceDocs = useMemo(() => {
    return readingResources.filter(r => r && r.fileType !== 'link' && r.category !== 'Formula Sheets' && r.category !== 'Mind Maps');
  }, [readingResources]);
  const progress = getReadingProgress(readingId);

  // Stats calculation
  const prog = plannerProgress.find(p => p.readingId === readingId);
  const targetVideo = readingForm.targets?.videoDurationMinutes || 0;
  const targetEOCQ = readingForm.targets?.eocqCount || 0;
  const loggedVideo = prog?.loggedVideoMinutes || 0;
  const completedEOCQ = prog?.completedEOCQ || 0;
  const completedLOSCount = readingLOS.filter(l => l.status === 'Completed').length;
  const totalLOSCount = readingLOS.length;

  const avgConfidence = readingLOS.length > 0
    ? (readingLOS.reduce((acc, l) => acc + (l.confidence || 0), 0) / readingLOS.length).toFixed(1)
    : '0.0';

  return (
    <div className="flex flex-col h-full bg-[#0d0e12] text-slate-300 overflow-hidden select-none">
      {/* Breadcrumb Header */}
      <div className="px-5 py-3 border-b border-slate-900 bg-slate-950/20 text-xs text-slate-500 font-bold shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span
            onClick={() => updateWorkspaceState({ mode: 'subject', selectedReadingId: undefined })}
            className="hover:text-slate-300 cursor-pointer"
          >
            {parentSub?.name}
          </span>
          <span>&gt;</span>
          <span className="truncate text-slate-400">{parentChap?.name}</span>
          <span>&gt;</span>
          <span className="text-slate-200 truncate">Reading {reading.readingNumber || reading.number}</span>
        </div>
        <button
          onClick={() => updateWorkspaceState({ mode: 'subject', selectedReadingId: undefined })}
          className="px-3 py-1 border border-[#2d313e]/70 bg-slate-955 hover:bg-slate-900 rounded-md font-bold text-sm text-slate-300 hover:text-white transition"
        >
          ← Back to Readings
        </button>
      </div>

      {/* Reading Workspace Banner */}
      <div className="px-5 py-4 border-b border-slate-900 flex justify-between items-center shrink-0 bg-[#0c0d12]">
        <div>
          <h1 className="text-base font-bold text-slate-200 tracking-tight">
            Reading {reading.readingNumber || reading.number}: {reading.name || reading.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">
            {reading.description}
          </p>
        </div>

        {activeTab === 'overview' && (
          <button
            onClick={handleSaveReading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition flex items-center gap-1.5 shrink-0"
          >
            <Check size={16} />
            <span>Save Configuration</span>
          </button>
        )}
      </div>

      {/* Dynamic Content Panel */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {activeTab === 'los' ? (
          /* MAIN STATE A: LOS Statements (left) + Reading Analytics (right) */
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">
              
              {/* Top Sub-Tab Buttons */}
              <div className="flex gap-3 pb-4 mb-2 select-none border-b border-slate-900">
                {subTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => updateWorkspaceState({ activeTab: tab.id })}
                      className="flex items-center gap-1.5 px-3 py-2 border border-[#2d313e]/70 bg-[#101116] hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white rounded-md transition"
                    >
                      <Icon size={14} />
                      <span>{tab.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* LOS Outcome Cards List */}
              <div className="space-y-4">
                {readingLOS.map(los => {
                  const isExpanded = !!expandedLOSIds[los.id];
                  const hasNote = notes.some(n => n.linkedLOSId === los.id || n.linkedReadingId === readingId);
                  const isCompleted = los.status === 'Completed';

                  const attempted = los.practiceQuestionsAttempted || 12;
                  const correct = Math.round(attempted * (los.practiceAccuracy || 83) / 100);
                  const accuracy = los.practiceAccuracy || 83;

                  return (
                    <div
                      key={los.id}
                      className="bg-[#101116] border border-[#1e2026] rounded-lg p-3.5 flex flex-col gap-2.5 transition-colors hover:border-slate-700/85"
                    >
                      <div
                        onClick={() => setExpandedLOSIds(prev => ({ ...prev, [los.id]: !prev[los.id] }))}
                        className="flex items-start justify-between cursor-pointer w-full gap-4"
                      >
                        <div className="flex gap-3.5 min-w-0">
                          {/* Circle checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLOS(los.id, { status: isCompleted ? 'Not Started' : 'Completed' });
                            }}
                            className="mt-0.5 text-slate-500 hover:text-emerald-400 transition shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <Circle size={15} />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-500/80 font-mono">
                                LOS {los.code}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                los.difficulty === 'Hard' ? 'bg-red-950/60 text-red-400 border border-red-900/30' : 'bg-slate-900 text-slate-450'
                              }`}>
                                {los.difficulty || 'MEDIUM'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">
                              {los.statement}
                            </p>
                          </div>
                        </div>

                        {/* Right metadata pills */}
                        <div className="flex items-center gap-3 shrink-0 select-none">
                          <span className="text-[10px] text-slate-500 font-semibold bg-[#14151b] px-2 py-0.5 border border-[#1e2026] rounded-md">
                            Practice: {correct}/{attempted} ({accuracy}%)
                          </span>
                          
                          {/* Bookmark */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLOSBookmark(los.id);
                            }}
                            className="p-1 hover:bg-slate-800 text-slate-600 hover:text-amber-450 rounded"
                          >
                            <Star size={15} fill={los.bookmarked ? '#fbbf24' : 'none'} color={los.bookmarked ? '#fbbf24' : 'currentColor'} />
                          </button>
                          
                          {isExpanded ? (
                            <ChevronDown size={15} className="text-slate-550" />
                          ) : (
                            <ChevronRight size={15} className="text-slate-550" />
                          )}
                        </div>
                      </div>

                      {/* Inline Expanded Outcome Detail Panel */}
                      {isExpanded && (
                        <div className="border-t border-[#1e2026] pt-4 mt-2 space-y-4 text-sm">
                          {/* Inline Edit Section (when editing this LOS) */}
                          {editingLOSId === los.id ? (
                            <div className="bg-[#0c0d12] border border-blue-800/40 rounded-lg p-4 space-y-4">
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">LOS Code</label>
                                  <input
                                    type="text"
                                    value={editLOSCode}
                                    onChange={e => setEditLOSCode(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">Statement</label>
                                  <input
                                    type="text"
                                    value={editLOSStatement}
                                    onChange={e => setEditLOSStatement(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">Difficulty</label>
                                  <select
                                    value={editLOSDifficulty}
                                    onChange={e => setEditLOSDifficulty(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                                  >
                                    <option value="">Medium</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Hard">Hard</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={cancelEditLOS}
                                  className="px-3 py-1.5 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-400 rounded-md transition flex items-center gap-1"
                                >
                                  <X size={14} />
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEditLOS(los.id)}
                                  disabled={!editLOSCode || !editLOSStatement}
                                  className="px-3 py-1.5 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 text-xs font-bold text-white rounded-md transition flex items-center gap-1"
                                >
                                  <Save size={14} />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-4">
                                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Confidence & Targets</h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 font-semibold">Mastery Level:</span>
                                  <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map(val => (
                                      <button
                                        key={val}
                                        onClick={() => updateLOS(los.id, { confidence: val })}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                          (los.confidence || 0) === val
                                            ? 'bg-slate-200 text-slate-950 font-extrabold'
                                            : 'bg-[#14151b] text-slate-500 hover:text-slate-300 border border-[#2d313e]'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex gap-6">
                                  <div>
                                    <span className="text-slate-500 font-semibold block">Revision Count:</span>
                                    <span className="font-bold text-white mt-1 block">{los.revisionCount || 0} times</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 font-semibold block">Next Scheduled Review:</span>
                                    <span className="font-bold text-slate-300 mt-1 block">
                                      {los.nextReview ? new Date(los.nextReview).toLocaleDateString() : 'Immediate'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Outcome actions */}
                              <div className="flex flex-col justify-between items-end">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditLOS(los)}
                                    className="px-3 py-1.5 bg-slate-955 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-xs font-bold text-slate-300 rounded-md transition flex items-center gap-1"
                                  >
                                    <Pencil size={13} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Duplicate this LOS outcome?')) {
                                        curriculumTreeService.duplicateNode('los', los.id);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-955 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-xs font-bold text-slate-300 rounded-md transition"
                                  >
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this outcome statement?')) {
                                        curriculumService.deleteLOS(los.id);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-red-955 hover:bg-red-900 border border-red-900/30 text-xs font-bold text-red-400 rounded-md transition"
                                  >
                                    Delete
                                  </button>
                                </div>

                                <span className="text-xs text-slate-550">
                                  Last reviewed: {los.lastReviewed ? new Date(los.lastReviewed).toLocaleDateString() : 'Never'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add LOS inline Form */}
              <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Add Learning Outcome Statement</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-505 font-bold block mb-1">LOS Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 16.a"
                      value={newLOSCode}
                      onChange={e => setNewLOSCode(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-slate-505 font-bold block mb-1">Statement description</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Discuss option strategies..."
                        value={newLOSStatement}
                        onChange={e => setNewLOSStatement(e.target.value)}
                        className="flex-1 bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none font-medium"
                      />
                      <button
                        onClick={handleAddLOS}
                        disabled={!newLOSCode || !newLOSStatement}
                        className="px-4 py-2 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition shrink-0"
                      >
                        Add Outcome
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Analytics Box */}
            <div className="w-80 border-l border-slate-900 bg-[#0c0d12]/40 p-5 space-y-6 overflow-y-auto shrink-0 select-none">
              <div>
                <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">
                  Reading Progress
                </h3>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-2xl font-black text-slate-200">{progress}%</span>
                  <span className="text-xs text-slate-500 font-bold mb-1.5">overall</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="border-t border-slate-900 pt-5 space-y-4">
                <h4 className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                  LOS Tracker
                </h4>
                
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-450">LOS Completed</span>
                  <span className="text-slate-200">{completedLOSCount} / {totalLOSCount}</span>
                </div>

                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-455">Readiness Index</span>
                  <span className="text-emerald-400 font-bold">
                    {totalLOSCount > 0 ? Math.round((completedLOSCount / totalLOSCount) * 100) : 0}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-455">Average Confidence</span>
                  <span className="text-amber-400 font-bold">{avgConfidence} / 5.0</span>
                </div>
              </div>

              <div className="border-t border-slate-900 pt-5 space-y-4">
                <h4 className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                  Mark Meldrum Targets
                </h4>

                {/* Video target */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-455">Video Progress</span>
                    <span className="text-slate-200">{Math.round(loggedVideo)} / {targetVideo} mins</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${targetVideo > 0 ? Math.min(100, (loggedVideo / targetVideo) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* EOCQ target */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-455">EOCQ Questions</span>
                    <span className="text-slate-200">{completedEOCQ} / {targetEOCQ} Qs</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${targetEOCQ > 0 ? Math.min(100, (completedEOCQ / targetEOCQ) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN STATE B: Sub-Tab content in FULL WIDTH (No right-column analytics) */
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* Sub-tab Navigation Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-900 mb-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-500 animate-pulse" />
                <span>
                  {activeTab === 'overview' && 'Reading Overview & Targets'}
                  {activeTab === 'notes' && 'Study Commentary Notes'}
                  {activeTab === 'formulas' && 'Linked Formulas'}
                  {activeTab === 'resources' && 'Reference Resource Documents'}
                </span>
              </h3>
              <button
                onClick={() => updateWorkspaceState({ activeTab: 'los' })}
                className="px-3.5 py-1.5 bg-[#14151b] border border-[#2d313e] hover:bg-slate-805 rounded-md text-xs font-bold text-slate-300 hover:text-white transition"
              >
                ← Back to Outcomes
              </button>
            </div>

            {/* OVERVIEW SUB-TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-[#101116] border border-[#1e2026] rounded-xl p-6 space-y-5">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Reading Metadata</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-505 font-bold block mb-1">Reading Number</label>
                      <input
                        type="number"
                        value={readingForm.readingNumber || readingForm.number || 0}
                        onChange={e => setReadingForm({
                          ...readingForm,
                          readingNumber: Number(e.target.value),
                          number: Number(e.target.value)
                        })}
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-505 font-bold block mb-1">Reading Title</label>
                      <input
                        type="text"
                        value={readingForm.name || readingForm.title || ''}
                        onChange={e => setReadingForm({ ...readingForm, name: e.target.value })}
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-505 font-bold block mb-1">Estimated Hours</label>
                      <input
                        type="number"
                        value={readingForm.estimatedHours || 0}
                        onChange={e => setReadingForm({ ...readingForm, estimatedHours: Number(e.target.value) })}
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-505 font-bold block mb-1">Difficulty</label>
                      <select
                        value={readingForm.difficulty || ''}
                        onChange={e => setReadingForm({ ...readingForm, difficulty: (e.target.value || null) as any })}
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none font-semibold"
                      >
                        <option value="">Select Difficulty...</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-505 font-bold block mb-1">Reading Synopsis</label>
                    <textarea
                      value={readingForm.description || ''}
                      onChange={e => setReadingForm({ ...readingForm, description: e.target.value })}
                      rows={5}
                      className="w-full bg-slate-955 border border-slate-855 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none font-sans leading-relaxed"
                    />
                  </div>
                </div>

                {/* Target panels */}
                <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-6 space-y-4 h-fit">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Target Outputs</h3>
                  <div>
                    <label className="text-xs text-slate-505 font-bold block mb-1">Video Duration Target (mins)</label>
                    <input
                      type="number"
                      value={readingForm.targets?.videoDurationMinutes || 0}
                      onChange={e => setReadingForm({
                        ...readingForm,
                        targets: {
                          videoDurationMinutes: Number(e.target.value),
                          eocqCount: readingForm.targets?.eocqCount || 0,
                          pageCount: readingForm.targets?.pageCount || 0,
                          totalLOSCount: readingForm.targets?.totalLOSCount || 0,
                          videoDurationString: `${Math.floor(Number(e.target.value) / 60)}h ${Number(e.target.value) % 60}m`,
                          weightingFactor: readingForm.targets?.weightingFactor || 1.0
                        }
                      })}
                      className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-505 font-bold block mb-1">EOCQ Questions Target</label>
                    <input
                      type="number"
                      value={readingForm.targets?.eocqCount || 0}
                      onChange={e => setReadingForm({
                        ...readingForm,
                        targets: {
                          videoDurationMinutes: readingForm.targets?.videoDurationMinutes || 0,
                          eocqCount: Number(e.target.value),
                          pageCount: readingForm.targets?.pageCount || 0,
                          totalLOSCount: readingForm.targets?.totalLOSCount || 0,
                          videoDurationString: readingForm.targets?.videoDurationString || '0h 0m',
                          weightingFactor: readingForm.targets?.weightingFactor || 1.0
                        }
                      })}
                      className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NOTES SUB-TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-4 h-full flex flex-col min-h-[380px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-semibold">Write study outlines or active recalls for this reading.</span>
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition"
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-850 rounded-xl p-4 text-sm text-slate-200 focus:outline-none font-mono leading-relaxed"
                  rows={18}
                />
              </div>
            )}

            {/* FORMULAS SUB-TAB */}
            {activeTab === 'formulas' && (
              <div className="space-y-6">
                <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2 font-mono">Formula Sheets</h3>
                  {readingFormulas.length === 0 ? (
                    <p className="text-sm text-slate-500 font-medium">No formulas currently linked to this reading.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {readingFormulas.map(form => (
                        <div key={form.id} className="p-4 bg-slate-950 border border-slate-850 rounded-lg space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-emerald-400">{form.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-slate-900 rounded text-slate-400 font-semibold">
                              {form.confidenceRating ? `Recall: ${form.confidenceRating}/5` : 'Not Rated'}
                            </span>
                          </div>
                          <p className="text-base font-mono bg-[#0d0e12] p-2.5 rounded text-slate-250 select-all overflow-x-auto">
                            {form.latexExpression || ''}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">{form.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Link Formula</h3>
                  <div className="flex gap-2">
                    <select
                      value={selectedFormulaId}
                      onChange={e => setSelectedFormulaId(e.target.value)}
                      className="flex-1 bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-205 focus:outline-none"
                    >
                      <option value="">Select Formula to link...</option>
                      {formulas.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.id.substring(0, 8)})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleLinkFormula}
                      disabled={!selectedFormulaId}
                      className="px-4 py-2 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition"
                    >
                      Link Formula
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* RESOURCES SUB-TAB */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                
                {/* Search / Filter Box */}
                <div className="relative flex items-center bg-[#101116] border border-[#1e2026] rounded-xl px-3 py-2.5">
                  <Search size={16} className="text-slate-550 mr-2" />
                  <input
                    type="text"
                    placeholder="Search learning resources, PDF guides, formulas, reference documents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-200 focus:outline-none placeholder-slate-650 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-350"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {(() => {
                  console.log(`[ReadingWorkspace] Opening Resources tab. activeReading.id: "${readingId}"`);
                  const allReadingResources = lrRepo.getByReadingId(readingId);
                  console.log(`[ReadingWorkspace] repository.getByReadingId("${readingId}") returned ${allReadingResources.length} lectures.`);

                  // Provider Verification & Normalization
                  allReadingResources.forEach(resource => {
                    console.log(`[ReadingWorkspace] Before filtering - Lecture ID: "${resource.id}", Provider: "${resource.provider}"`);
                    if (resource.provider !== 'SSCI' && (
                      resource.provider.toLowerCase().startsWith('ssci') ||
                      resource.provider.toLowerCase().startsWith('schweser') ||
                      resource.provider.toLowerCase().startsWith('video') ||
                      resource.provider.toLowerCase().startsWith('lecture')
                    )) {
                      console.log(`[ReadingWorkspace] Auto-repairing provider string for lecture "${resource.id}": "${resource.provider}" -> "SSCI"`);
                      resource.provider = 'SSCI';
                    }
                  });
                  
                  // Filter by Search Query
                  const filtered = allReadingResources.filter(r => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      r.title.toLowerCase().includes(q) ||
                      (r.description || '').toLowerCase().includes(q) ||
                      r.provider.toLowerCase().includes(q) ||
                      r.resourceType.toLowerCase().includes(q)
                    );
                  });

                  const cfaiResources = filtered.filter(r => r.provider === 'CFA Institute');
                  const ssciResources = filtered.filter(r => r.provider === 'SSCI').sort((a, b) => (a.order || 0) - (b.order || 0));
                  
                  console.log(`[ReadingWorkspace] visibleSSCILectures.length: ${ssciResources.length}`);
                  
                  const notebooklmResources = filtered.filter(r => r.provider === 'NotebookLM');
                  const qbankResources = filtered.filter(r => r.provider === 'Personal' || r.provider === 'Question Bank');

                  // Reference material filtered list
                  const filteredLinkedResources = searchQuery.trim()
                    ? linkedResources.filter(res => res.name.toLowerCase().includes(searchQuery.toLowerCase()) || res.category.toLowerCase().includes(searchQuery.toLowerCase()))
                    : linkedResources;

                  const filteredLinkedReferenceDocs = searchQuery.trim()
                    ? linkedReferenceDocs.filter(res => res.name.toLowerCase().includes(searchQuery.toLowerCase()) || res.category.toLowerCase().includes(searchQuery.toLowerCase()))
                    : linkedReferenceDocs;

                  return (
                    <div className="space-y-4">
                      
                      {/* 1. CFA Institute Folder */}
                      <div className="border border-[#1e2026] rounded-xl overflow-hidden bg-[#101116]">
                        <div 
                          onClick={() => toggleFolder('cfai')}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 select-none border-b border-[#1e2026]/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen size={16} className="text-amber-500/80" />
                            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">📘 CFA Institute ({cfaiResources.length})</span>
                          </div>
                          {expandedFolders.cfai ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        </div>
                        {expandedFolders.cfai && (
                          <div className="p-4 space-y-3 bg-[#0a0b0e]/30">
                            {cfaiResources.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">No CFA Institute resources match.</p>
                            ) : (
                              cfaiResources.map(r => (
                                <ResourceCard 
                                  key={r.id} 
                                  resource={r} 
                                  lrRepo={lrRepo} 
                                  onRefresh={() => setUpdateTrigger(p => p + 1)} 
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. SSCI Lectures Folder */}
                      <div className="border border-[#1e2026] rounded-xl overflow-hidden bg-[#101116]">
                        <div 
                          onClick={() => toggleFolder('ssci')}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 select-none border-b border-[#1e2026]/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen size={16} className="text-indigo-400" />
                            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">🎥 SSCI Lectures ({ssciResources.length})</span>
                          </div>
                          {expandedFolders.ssci ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        </div>
                        {expandedFolders.ssci && (
                          <div className="p-4 space-y-3 bg-[#0a0b0e]/30">
                            {ssciResources.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">No SSCI video lectures match.</p>
                            ) : (
                              ssciResources.map(r => (
                                <ResourceCard 
                                  key={r.id} 
                                  resource={r} 
                                  lrRepo={lrRepo} 
                                  onRefresh={() => setUpdateTrigger(p => p + 1)} 
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* 3. NotebookLM Folder */}
                      <div className="border border-[#1e2026] rounded-xl overflow-hidden bg-[#101116]">
                        <div 
                          onClick={() => toggleFolder('notebooklm')}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 select-none border-b border-[#1e2026]/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen size={16} className="text-emerald-455" />
                            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">🧠 NotebookLM AI Guides ({notebooklmResources.length})</span>
                          </div>
                          {expandedFolders.notebooklm ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        </div>
                        {expandedFolders.notebooklm && (
                          <div className="p-4 space-y-3 bg-[#0a0b0e]/30">
                            {notebooklmResources.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">No NotebookLM guides match.</p>
                            ) : (
                              notebooklmResources.map(r => (
                                <ResourceCard 
                                  key={r.id} 
                                  resource={r} 
                                  lrRepo={lrRepo} 
                                  onRefresh={() => setUpdateTrigger(p => p + 1)} 
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* 4. Question Bank Folder */}
                      <div className="border border-[#1e2026] rounded-xl overflow-hidden bg-[#101116]">
                        <div 
                          onClick={() => toggleFolder('qbank')}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 select-none border-b border-[#1e2026]/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen size={16} className="text-purple-400" />
                            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">❓ Question Bank Drills ({qbankResources.length})</span>
                          </div>
                          {expandedFolders.qbank ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        </div>
                        {expandedFolders.qbank && (
                          <div className="p-4 space-y-3 bg-[#0a0b0e]/30">
                            {qbankResources.length === 0 ? (
                              <p className="text-xs text-slate-505 italic py-2">No Question Bank resources match.</p>
                            ) : (
                              qbankResources.map(r => (
                                <ResourceCard 
                                  key={r.id} 
                                  resource={r} 
                                  lrRepo={lrRepo} 
                                  onRefresh={() => setUpdateTrigger(p => p + 1)} 
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* 5. Reference Material Folder */}
                      <div className="border border-[#1e2026] rounded-xl overflow-hidden bg-[#101116]">
                        <div 
                          onClick={() => toggleFolder('reference')}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900/40 select-none border-b border-[#1e2026]/40"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen size={16} className="text-rose-455" />
                            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">📂 Reference Material ({filteredLinkedResources.length + filteredLinkedReferenceDocs.length})</span>
                          </div>
                          {expandedFolders.reference ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                        </div>
                        {expandedFolders.reference && (
                          <div className="p-5 space-y-6 bg-[#0a0b0e]/30">
                            
                            {/* Linked Resources Grid */}
                            <div className="space-y-3">
                              <h5 className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">Linked Formula Sheets & Mindmaps</h5>
                              {filteredLinkedResources.length === 0 ? (
                                <p className="text-xs text-slate-505 italic">No linked resources match.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {filteredLinkedResources.map(res => (
                                    <LinkedResourceCard
                                      key={res.id}
                                      resource={res}
                                      onDelete={() => deleteResource(res.id)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Linked Reference Documents Grid */}
                            <div className="space-y-3">
                              <h5 className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">Linked Reference PDFs</h5>
                              {filteredLinkedReferenceDocs.length === 0 ? (
                                <p className="text-xs text-slate-505 italic">No linked reference documents match.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {filteredLinkedReferenceDocs.map(res => (
                                    <LinkedResourceCard
                                      key={res.id}
                                      resource={res}
                                      onDelete={() => deleteResource(res.id)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Form to Link Document */}
                            <div className="border-t border-[#1e2026]/80 pt-4 space-y-4">
                              <h5 className="text-xs font-bold text-slate-350">Link Reference Document</h5>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                  <label className="text-[10px] text-slate-500 block mb-1 font-semibold uppercase">Resource Title / URL</label>
                                  <input
                                    type="text"
                                    placeholder="Volume 4 Fixed Income Readings.pdf"
                                    value={newResourceName}
                                    onChange={e => setNewResourceName(e.target.value)}
                                    className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block mb-1 font-semibold uppercase">Category</label>
                                  <select
                                    value={newResourceCategory}
                                    onChange={e => setNewResourceCategory(e.target.value)}
                                    className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-202 focus:outline-none font-semibold"
                                  >
                                    <option value="Curriculum PDFs">Curriculum PDFs</option>
                                    <option value="Schweser">Schweser</option>
                                    <option value="Formula Sheets">Formula Sheets</option>
                                    <option value="Mind Maps">Mind Maps</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingResourceId('new');
                                    setEditForm({
                                      title: '',
                                      provider: 'Personal',
                                      resourceType: 'Interactive',
                                      duration: 30,
                                      launchUrl: '',
                                      readingId: readingId,
                                      losIds: [],
                                      resourceLinks: [],
                                      notes: '',
                                      tags: [],
                                      difficulty: 'Medium',
                                      priority: 'Medium',
                                      estimatedTime: 30,
                                      description: '',
                                      progress: {
                                        minutesCompleted: 0,
                                        completed: false,
                                        lastOpenedAt: null,
                                        resumeState: null
                                      }
                                    });
                                  }}
                                  className="px-3 py-1.5 border border-indigo-500/30 text-indigo-400 font-bold text-xs rounded hover:bg-indigo-500/10 cursor-pointer"
                                >
                                  + Create Custom Learning Resource
                                </button>
                                <button
                                  onClick={handleAddResource}
                                  disabled={!newResourceName}
                                  className="px-4 py-1.5 bg-emerald-650 disabled:opacity-40 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition shrink-0"
                                >
                                  Link Document
                                </button>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}

              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
