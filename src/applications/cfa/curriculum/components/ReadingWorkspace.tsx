import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../../context/AppContext';
import { Subject, Chapter, Reading, LearningOutcomeStatement, Formula, Resource, StudyNote } from '../../../../types';
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
  CheckSquare
} from 'lucide-react';

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
  
  // Formula linking
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  
  // Resources addition
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceCategory, setNewResourceCategory] = useState('Curriculum PDFs');

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [existingNote, setExistingNote] = useState<StudyNote | null>(null);

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
      const linkedLOSIds = [...(formula.linkedLOSIds || [])];
      const rdLOS = losList.filter(l => l.readingId === readingId);
      if (rdLOS.length > 0 && !linkedLOSIds.includes(rdLOS[0].id)) {
        linkedLOSIds.push(rdLOS[0].id);
        const contextUpdate = (useApp() as any).updateFormula;
        if (contextUpdate) {
          contextUpdate(formula.id, { linkedLOSIds });
          alert('Formula linked successfully!');
        }
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
      category: newResourceCategory,
      url: '#',
      fileType: 'link',
      description: 'Reference link',
      linkedReadingId: readingId
    });
    setNewResourceName('');
    alert('Resource link added!');
  };

  if (!reading) return null;

  const readingLOS = losList.filter(l => l && l.readingId === readingId);
  const readingFormulas = formulas.filter(f =>
    f && Array.isArray(f.linkedLOSIds) && f.linkedLOSIds.some(id => readingLOS.some(l => l && l.id === id))
  );
  const readingResources = resources.filter(r => r && r.linkedReadingId === readingId);
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
                          videoDurationString: `${Math.floor(Number(e.target.value) / 60)}h ${Number(e.target.value) % 60}m`
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
                          videoDurationString: readingForm.targets?.videoDurationString || '0h 0m'
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
                            <span className="text-xs px-2 py-0.5 bg-slate-900 rounded text-slate-400 font-semibold">{form.masteryLevel}</span>
                          </div>
                          <p className="text-base font-mono bg-[#0d0e12] p-2.5 rounded text-slate-250 select-all overflow-x-auto">
                            {form.latexExpression || form.latex || ''}
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
                        <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
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
                {/* Sprint M8 — Learning Resources by Provider */}
                <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2 flex items-center justify-between">
                    <span>Learning Resources</span>
                    <span className="text-[9px] font-mono text-slate-500 font-normal">
                      {getResourcesByReading(readingId).length} total
                    </span>
                  </h3>
                  {(() => {
                    const lrResources = getResourcesByReading(readingId);
                    if (lrResources.length === 0 && readingResources.length === 0) {
                      return <p className="text-sm text-slate-505 font-medium">No resources linked to this reading yet.</p>;
                    }
                    const grouped = new Map<string, typeof lrResources>();
                    lrResources.forEach(r => {
                      const key = r.provider;
                      if (!grouped.has(key)) grouped.set(key, []);
                      grouped.get(key)!.push(r);
                    });
                    const providerOrder = ['CFA Institute', 'SSCI', 'NotebookLM', 'Personal', 'Question Bank'];
                    const sortedProviders = Array.from(grouped.keys()).sort((a, b) => {
                      const ai = providerOrder.indexOf(a);
                      const bi = providerOrder.indexOf(b);
                      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                    });
                    return (
                      <div className="space-y-4">
                        {sortedProviders.map(provider => {
                          const items = grouped.get(provider)!;
                          return (
                            <div key={provider}>
                              <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                {provider}
                                <span className="text-[8px] text-slate-600 font-normal">({items.length})</span>
                              </h4>
                              <div className="space-y-1.5">
                                {items.map(r => (
                                  <div key={r.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <FileText size={14} className="text-blue-400 shrink-0" />
                                      <div className="min-w-0">
                                        <span className="text-xs font-bold text-slate-200 block truncate">{r.title}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">
                                          {r.resourceType} · {r.duration} min{r.progress?.completed ? ' · ✓ Completed' : (r.progress?.minutesCompleted || 0) > 0 ? ` · ${r.progress.minutesCompleted} min done` : ''}
                                        </span>
                                        {(r.progress?.minutesCompleted || 0) > 0 && !r.progress?.completed && (
                                          <div className="w-20 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((r.progress?.minutesCompleted || 0) / (r.duration || 1)) * 100))}%` }} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {!r.progress?.completed && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            markResourceOpened(r.id);
                                          }}
                                          className="px-2 py-1 text-[8px] font-mono font-bold uppercase border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer transition-colors"
                                        >
                                          {(r.progress?.minutesCompleted || 0) > 0 ? 'Resume' : 'Launch'}
                                        </button>
                                      )}
                                      {!r.progress?.completed && (
                                        <button
                                          type="button"
                                          onClick={() => markResourceCompleted(r.id)}
                                          className="px-2 py-1 text-[8px] font-mono font-bold uppercase border border-slate-600 text-slate-400 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                          title="Mark Complete"
                                        >
                                          <CheckSquare size={11} />
                                        </button>
                                      )}
                                      {r.progress?.completed && (
                                        <span className="text-[9px] font-mono text-emerald-500 font-bold">✓</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Linked Reference Resources</h3>
                  {readingResources.length === 0 ? (
                    <p className="text-sm text-slate-505 font-medium">No additional resources linked yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {readingResources.map(res => (
                        <div key={res.id} className="flex justify-between items-center p-3.5 bg-slate-950 border border-slate-850 rounded-lg">
                          <div className="flex items-center gap-2.5">
                            <FileText size={16} className="text-blue-400" />
                            <div>
                              <span className="text-sm font-bold text-slate-200 block">{res.name}</span>
                              <span className="text-xs text-slate-500 uppercase font-semibold">{res.category} ({res.fileType})</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteResource(res.id)}
                            className="p-1.5 hover:bg-slate-900 text-slate-500 hover:text-red-400 rounded transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#101116] border border-[#1e2026] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Link Reference Document</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500 font-bold block mb-1">Resource Title / URL</label>
                      <input
                        type="text"
                        placeholder="Volume 4 Fixed Income Readings.pdf"
                        value={newResourceName}
                        onChange={e => setNewResourceName(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-202 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-bold block mb-1">Category</label>
                      <select
                        value={newResourceCategory}
                        onChange={e => setNewResourceCategory(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-202 focus:outline-none"
                      >
                        <option value="Curriculum PDFs">Curriculum PDFs</option>
                        <option value="Schweser">Schweser</option>
                        <option value="Formula Sheets">Formula Sheets</option>
                        <option value="Mind Maps">Mind Maps</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleAddResource}
                      disabled={!newResourceName}
                      className="px-4 py-2 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition"
                    >
                      Link Document
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
