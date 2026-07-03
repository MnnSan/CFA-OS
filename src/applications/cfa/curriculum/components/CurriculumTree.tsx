import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../../../context/AppContext';
import { Subject, Chapter, Reading } from '../../../../types';
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Search,
  MoveUp,
  MoveDown
} from 'lucide-react';

export const CurriculumTree: React.FC = () => {
  const {
    subjects,
    chapters,
    readings,
    losList,
    curriculumService,
    curriculumTreeService,
    workspaceState,
    updateWorkspaceState
  } = useApp();

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    // Expand first subject by default
    const initial: Record<string, boolean> = {};
    if (subjects.length > 0) {
      initial[subjects[0].id] = true;
    }
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingNode, setEditingNode] = useState<{ type: string; id: string; name: string } | null>(null);
  
  // Notion-style menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Click outside to dismiss context menu
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Subject completion stats calculation
  const getSubjectStats = (subjectId: string) => {
    const subReadings = readings.filter(r => r.subjectId === subjectId);
    const subLOS = losList.filter(l => subReadings.some(r => r.id === l.readingId));
    const completed = subLOS.filter(l => l.status === 'Completed').length;
    const total = subLOS.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pct, completed, total };
  };

  // Filter tree based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) {
      return { subjects, chapters, readings };
    }

    const query = searchQuery.toLowerCase();
    const matchedSubjectIds = new Set<string>();
    const matchedChapterIds = new Set<string>();
    const matchedReadingIds = new Set<string>();

    // 1. Find matching Readings
    readings.forEach(r => {
      const name = r.name || r.title || '';
      if (name.toLowerCase().includes(query) || r.id.toLowerCase().includes(query) || (r.description && r.description.toLowerCase().includes(query))) {
        matchedReadingIds.add(r.id);
      }
      if (matchedReadingIds.has(r.id)) {
        if (r.chapterId) matchedChapterIds.add(r.chapterId);
        matchedSubjectIds.add(r.subjectId);
      }
    });

    // 2. Find matching Chapters
    chapters.forEach(c => {
      if (c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)) {
        matchedChapterIds.add(c.id);
      }
      if (matchedChapterIds.has(c.id)) {
        matchedSubjectIds.add(c.subjectId);
      }
    });

    // 3. Find matching Subjects
    subjects.forEach(s => {
      if (s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)) {
        matchedSubjectIds.add(s.id);
      }
    });

    // Keep expansion state open for matches
    const newExpanded: Record<string, boolean> = {};
    matchedSubjectIds.forEach(id => { newExpanded[id] = true; });
    matchedChapterIds.forEach(id => { newExpanded[id] = true; });

    setTimeout(() => {
      setExpandedIds(prev => ({ ...prev, ...newExpanded }));
    }, 0);

    return {
      subjects: subjects.filter(s => matchedSubjectIds.has(s.id)),
      chapters: chapters.filter(c => matchedChapterIds.has(c.id) || matchedSubjectIds.has(c.subjectId)),
      readings: readings.filter(r => matchedReadingIds.has(r.id) || (r.chapterId && matchedChapterIds.has(r.chapterId)))
    };
  }, [searchQuery, subjects, chapters, readings]);

  // CRUD actions
  const handleAddSubject = () => {
    const code = `SUB-${Date.now().toString().slice(-3)}`;
    const id = curriculumService.addSubject('New Subject', 'Subject description', code);
    setEditingNode({ type: 'subject', id, name: 'New Subject' });
    updateWorkspaceState({ selectedSubjectId: id, selectedReadingId: undefined, mode: 'subject' });
  };

  const handleAddChapter = (subjectId: string) => {
    const id = curriculumService.addChapter(subjectId, 'New Chapter', 'Chapter description');
    setEditingNode({ type: 'chapter', id, name: 'New Chapter' });
    setExpandedIds(prev => ({ ...prev, [subjectId]: true }));
    updateWorkspaceState({ selectedSubjectId: subjectId, selectedReadingId: undefined, mode: 'subject' });
  };

  const handleAddReading = (chapterId: string, subjectId: string) => {
    const id = curriculumService.addReading(chapterId, 'New Reading', 'Reading description');
    setEditingNode({ type: 'reading', id, name: 'New Reading' });
    setExpandedIds(prev => ({ ...prev, [chapterId]: true }));
    updateWorkspaceState({ selectedSubjectId: subjectId, selectedReadingId: id, mode: 'reading', activeTab: 'overview' });
  };

  const handleDuplicateNode = (type: 'subject' | 'chapter' | 'reading', id: string) => {
    const newId = curriculumTreeService.duplicateNode(type, id);
    if (newId) {
      if (type === 'reading') {
        updateWorkspaceState({ selectedReadingId: newId, mode: 'reading' });
      } else if (type === 'subject') {
        updateWorkspaceState({ selectedSubjectId: newId, selectedReadingId: undefined, mode: 'subject' });
      }
    }
  };

  const handleDeleteNode = (type: 'subject' | 'chapter' | 'reading', id: string) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'subject') curriculumService.deleteSubject(id);
      else if (type === 'chapter') curriculumService.deleteChapter(id);
      else if (type === 'reading') curriculumService.deleteReading(id);

      if (workspaceState.selectedReadingId === id || workspaceState.selectedSubjectId === id) {
        updateWorkspaceState({ selectedReadingId: undefined, mode: 'subject' });
      }
    }
  };

  const handleSaveEdit = () => {
    if (!editingNode) return;
    const { type, id, name } = editingNode;

    if (type === 'subject') curriculumService.updateSubject(id, { name });
    else if (type === 'chapter') curriculumService.updateChapter(id, { name });
    else if (type === 'reading') curriculumService.updateReading(id, { name, title: name });

    setEditingNode(null);
  };

  // Reordering moves
  const handleMoveNode = (type: 'subject' | 'chapter' | 'reading', id: string, direction: 'up' | 'down', parentId: string, currentIndex: number) => {
    const targetIndex = direction === 'up' ? Math.max(0, currentIndex - 1) : currentIndex + 1;
    curriculumTreeService.moveNode(type, id, parentId, targetIndex);
  };

  // HTML5 Drag & Drop
  const handleDragStart = (e: React.DragEvent, type: string, id: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetType: string, targetParentId: string, targetIndex: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { type: draggedType, id: draggedId } = data;

      if (draggedType === 'chapter' && targetType === 'subject') {
        curriculumTreeService.moveNode('chapter', draggedId, targetParentId, targetIndex);
      } else if (draggedType === 'reading' && targetType === 'chapter') {
        curriculumTreeService.moveNode('reading', draggedId, targetParentId, targetIndex);
      } else if (draggedType === 'subject' && targetType === 'root') {
        curriculumTreeService.moveNode('subject', draggedId, 'root', targetIndex);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0e12] text-slate-300">
      {/* Search and Quick Add */}
      <div className="p-4 border-b border-slate-900 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase select-none">
            CFA LEVEL III CURRICULUM
          </h2>
          <button
            onClick={handleAddSubject}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition duration-150"
            title="Create Subject"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search database..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#101116] border border-slate-800/60 rounded py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Hierarchy List */}
      <div
        ref={menuRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 select-none"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'root', 'root', filteredData.subjects.length)}
      >
        {filteredData.subjects.map((subject, subIdx) => {
          const isSubExpanded = !!expandedIds[subject.id];
          const isSubSelected = workspaceState.selectedSubjectId === subject.id && workspaceState.mode === 'subject';
          const subChapters = filteredData.chapters.filter(c => c.subjectId === subject.id);
          const { pct } = getSubjectStats(subject.id);

          return (
            <div
              key={subject.id}
              className="space-y-1.5"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'subject', 'root', subIdx)}
            >
              {/* Subject Node Styled as Card from the Screenshot */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, 'subject', subject.id)}
                onDragEnter={() => setDragOverId(subject.id)}
                onDragLeave={() => setDragOverId(null)}
                onClick={() => updateWorkspaceState({ selectedSubjectId: subject.id, selectedReadingId: undefined, mode: 'subject' })}
                className={`flex flex-col w-full text-left rounded-xl p-4 transition-all duration-150 border cursor-pointer ${
                  isSubSelected
                    ? 'bg-[#181a20] border-[#2d313e]/70 shadow-xl text-white'
                    : 'bg-[#101116]/30 border-[#1c1e24]/40 hover:bg-[#12141a]/60 text-slate-400 hover:text-slate-200'
                } ${dragOverId === subject.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : ''}`}
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleExpand(subject.id, e)}
                      className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                    >
                      {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span className="text-xs font-bold tracking-wider font-mono text-[#8f9cae]">
                      {subject.code}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-350">{pct}%</span>
                </div>
                
                {editingNode?.id === subject.id ? (
                  <input
                    type="text"
                    value={editingNode.name}
                    onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                    onBlur={handleSaveEdit}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    className="bg-[#101116] border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-100 mt-1.5"
                  />
                ) : (
                  <span className="text-xs font-bold mt-1 text-slate-100 truncate max-w-[220px]" title={subject.name}>
                    {subject.name}
                  </span>
                )}
                
                {/* Progress Bar */}
                <div className="w-full bg-[#1c1d24] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-slate-300 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Context Menu Trigger */}
                <div className="relative self-end mt-1 overflow-visible">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === subject.id ? null : subject.id);
                    }}
                    className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {menuOpenId === subject.id && (
                    <div className="absolute right-0 bottom-6 w-36 bg-[#12141a] border border-[#232732] rounded-md shadow-xl z-[100] p-1 select-none text-left">
                      <button
                        onClick={() => handleAddChapter(subject.id)}
                        className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                      >
                        Add Chapter
                      </button>
                      <button
                        onClick={() => setEditingNode({ type: 'subject', id: subject.id, name: subject.name })}
                        className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDuplicateNode('subject', subject.id)}
                        className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleMoveNode('subject', subject.id, 'up', 'root', subIdx)}
                        className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                      >
                        Move Up
                      </button>
                      <button
                        onClick={() => handleMoveNode('subject', subject.id, 'down', 'root', subIdx)}
                        className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                      >
                        Move Down
                      </button>
                      <button
                        onClick={() => handleDeleteNode('subject', subject.id)}
                        className="w-full text-left px-2.5 py-1 text-xs hover:bg-red-900/40 rounded text-red-400 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chapters Level */}
              {isSubExpanded && (
                <div className="pl-4 border-l border-slate-900 ml-3 space-y-1.5">
                  {subChapters.map((chapter, chapIdx) => {
                    const isChapExpanded = !!expandedIds[chapter.id];
                    const isChapSelected = workspaceState.selectedChapterId === chapter.id && workspaceState.mode === 'subject';
                    const chapReadings = readings.filter(r => r.chapterId === chapter.id);

                    return (
                      <div
                        key={chapter.id}
                        className="space-y-0.5"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'chapter', subject.id, chapIdx)}
                      >
                        {/* Chapter Node */}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, 'chapter', chapter.id)}
                          onDragEnter={() => setDragOverId(chapter.id)}
                          onDragLeave={() => setDragOverId(null)}
                          onClick={() => updateWorkspaceState({ selectedSubjectId: subject.id, selectedChapterId: chapter.id, selectedReadingId: undefined, mode: 'subject' })}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${
                            isChapSelected ? 'bg-indigo-650/15 text-white font-bold' : 'hover:bg-slate-850/40 text-slate-400'
                          } ${dragOverId === chapter.id ? 'ring-1 ring-blue-500/30 bg-slate-800/30' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <button
                              onClick={(e) => toggleExpand(chapter.id, e)}
                              className="p-0.5 hover:bg-slate-800 rounded text-slate-600"
                            >
                              {isChapExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {editingNode?.id === chapter.id ? (
                              <input
                                type="text"
                                value={editingNode.name}
                                onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                                onBlur={handleSaveEdit}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                                className="bg-[#101116] border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-100"
                              />
                            ) : (
                              <span
                                className="text-xs font-bold truncate flex-1 text-slate-400"
                                title={chapter.name}
                              >
                                {chapter.name}
                              </span>
                            )}
                          </div>

                          {/* Context Menu Chapter */}
                          <div className="relative shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === chapter.id ? null : chapter.id);
                              }}
                              className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                            >
                              <MoreHorizontal size={14} />
                            </button>

                            {menuOpenId === chapter.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-[#12141a] border border-[#232732] rounded-md shadow-xl z-[100] p-1 select-none">
                                <button
                                  onClick={() => handleAddReading(chapter.id, subject.id)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Add Reading
                                </button>
                                <button
                                  onClick={() => setEditingNode({ type: 'chapter', id: chapter.id, name: chapter.name })}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => handleDuplicateNode('chapter', chapter.id)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => handleMoveNode('chapter', chapter.id, 'up', subject.id, chapIdx)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Move Up
                                </button>
                                <button
                                  onClick={() => handleMoveNode('chapter', chapter.id, 'down', subject.id, chapIdx)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Move Down
                                </button>
                                <button
                                  onClick={() => handleDeleteNode('chapter', chapter.id)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-red-900/40 rounded text-red-400 font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Readings Level */}
                        {isChapExpanded && (
                          <div className="pl-4 border-l border-slate-900 ml-2.5 space-y-1">
                            {chapReadings.map((reading, readIdx) => {
                              const isReadSelected = workspaceState.selectedReadingId === reading.id && workspaceState.mode === 'reading';

                              return (
                                <div
                                  key={reading.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, 'reading', reading.id)}
                                  onDragEnter={() => setDragOverId(reading.id)}
                                  onDragLeave={() => setDragOverId(null)}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, 'reading', chapter.id, readIdx)}
                                  onClick={() => updateWorkspaceState({ selectedSubjectId: subject.id, selectedReadingId: reading.id, mode: 'reading', activeTab: 'los' })}
                                  className={`flex items-start justify-between p-2 rounded cursor-pointer transition-all border-l-2 ${
                                    isReadSelected
                                      ? 'bg-[#1c1d24] text-white border-emerald-500/80 font-bold'
                                      : 'hover:bg-slate-800/20 text-slate-400 hover:text-slate-200 border-transparent'
                                  } ${dragOverId === reading.id ? 'border-blue-500/50 bg-slate-800/20' : ''}`}
                                >
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <span className="text-[10px] px-1.5 py-0.5 mt-0.5 bg-[#101116] border border-slate-800/60 text-slate-400 rounded font-bold shrink-0 font-mono">
                                      R{reading.readingNumber || reading.number}
                                    </span>
                                    {editingNode?.id === reading.id ? (
                                      <input
                                        type="text"
                                        value={editingNode.name}
                                        onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                        className="bg-[#101116] border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-100"
                                      />
                                    ) : (
                                      <span
                                        className="text-xs leading-snug whitespace-normal break-words flex-1 font-semibold"
                                        title={reading.name || reading.title}
                                      >
                                        {reading.name || reading.title}
                                      </span>
                                    )}
                                  </div>

                                  {/* Context Menu Reading */}
                                  <div className="relative shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === reading.id ? null : reading.id);
                                      }}
                                      className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                                    >
                                      <MoreHorizontal size={13} />
                                    </button>

                                    {menuOpenId === reading.id && (
                                      <div className="absolute right-0 mt-1 w-36 bg-[#12141a] border border-[#232732] rounded-md shadow-xl z-[100] p-1 select-none">
                                        <button
                                          onClick={() => setEditingNode({ type: 'reading', id: reading.id, name: reading.name || reading.title })}
                                          className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                        >
                                          Rename
                                        </button>
                                        <button
                                          onClick={() => handleDuplicateNode('reading', reading.id)}
                                          className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                        >
                                          Duplicate
                                        </button>
                                        <button
                                          onClick={() => handleMoveNode('reading', reading.id, 'up', chapter.id, readIdx)}
                                          className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                        >
                                          Move Up
                                        </button>
                                        <button
                                          onClick={() => handleMoveNode('reading', reading.id, 'down', chapter.id, readIdx)}
                                          className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                        >
                                          Move Down
                                        </button>
                                        <button
                                          onClick={() => handleDeleteNode('reading', reading.id)}
                                          className="w-full text-left px-2.5 py-1 text-xs hover:bg-red-900/40 rounded text-red-400 font-semibold"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
