/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Asset, AssetStatus, AssetHighlight, AssetAnnotation } from '../types';
import { 
  FileText, 
  Video, 
  Link2, 
  Trash2, 
  Plus, 
  Search, 
  Star, 
  Sparkles, 
  Upload, 
  Loader2, 
  BookOpen, 
  AlertCircle, 
  Check, 
  Brain, 
  Database,
  ChevronRight,
  ChevronLeft,
  Highlighter,
  MessageSquare,
  Clock,
  Gauge,
  Award,
  Timer
} from 'lucide-react';
import { assetPreviewService } from '../services/AssetPreviewService';
import { MathRenderer } from '../components/MathRenderer';

export const Resources: React.FC = () => {
  const { 
    resources, 
    uploadAsset, 
    updateAssetProgress,
    addAssetHighlight,
    addAssetAnnotation,
    toggleResourceFavorite, 
    deleteResource, 
    readings,
    losList,
    subjects,
    addNote,
    selectedResourceId,
    setSelectedResourceId,
    // Sprint 8 Exposes
    activeReadingAssetId,
    readingSessionActiveReport,
    startReadingSession,
    logReadingPageFlip,
    endReadingSession
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Previewer States
  const [previewPages, setPreviewPages] = useState<{ pageNumber: number; heading: string; content: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [activeHighlightColor, setActiveHighlightColor] = useState('yellow');
  
  // Form State for Adding Web Link
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkReadingId, setLinkReadingId] = useState('');

  // Selected Asset computed
  const activeAsset = resources.find(r => r.id === selectedResourceId);

  // Load preview chunks when resource selection changes
  useEffect(() => {
    if (activeAsset) {
      setLoadingPreview(true);
      setCurrentPage(activeAsset.lastReadPage || 1);
      setNoteText('');
      assetPreviewService.getPreviewPages(activeAsset)
        .then(pages => {
          setPreviewPages(pages);
          setLoadingPreview(false);
        })
        .catch(err => {
          console.error(err);
          setPreviewPages([{ pageNumber: 1, heading: 'Error', content: 'Could not load text chunks from database.' }]);
          setLoadingPreview(false);
        });
    } else {
      setPreviewPages([]);
    }
  }, [selectedResourceId, activeAsset?.status]); // Re-load if status changes to Ready

  const handleSaveSelectedAsNote = () => {
    const selectedText = window.getSelection()?.toString().trim();
    const contentToSave = selectedText || previewPages[currentPage - 1]?.content || '';
    if (!contentToSave) return;

    addNote({
      title: `Excerpt: ${activeAsset?.name || 'Study Resource'} (Page ${currentPage})`,
      content: `> ${contentToSave}\n\n*Saved from resource: [${activeAsset?.name || 'Document'}]*`,
      linkedReadingId: activeAsset?.linkedReadingId || activeAsset?.reading,
      linkedSubjectId: activeAsset?.linkedSubjectId || activeAsset?.subject
    });
    alert(`Successfully saved excerpt from "${activeAsset?.name}" to your Study Notes!`);
  };

  // File Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      await uploadAsset(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      await uploadAsset(file);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName.trim() || !linkUrl.trim()) return;

    const linkContent = `
# External Ingested URL: ${linkName}
Link URL: ${linkUrl}
Linked Reading: ${linkReadingId ? readings.find(r => r.id === linkReadingId)?.title : 'None'}

This external link has been registered inside your Knowledge Vault. Clicking "Open Link" will navigate to the destination.
    `;
    const blob = new Blob([linkContent], { type: 'text/markdown' });
    const file = new File([blob], `${linkName.replace(/\s+/g, '_')}.link.md`, { type: 'text/markdown' });

    const assetId = await uploadAsset(file, {
      readingId: linkReadingId || undefined,
      subjectId: linkReadingId ? readings.find(r => r.id === linkReadingId)?.subjectId : undefined
    });

    // Reset Link form
    setLinkName('');
    setLinkUrl('');
    setLinkReadingId('');
    setShowLinkForm(false);
    setSelectedResourceId(assetId);
  };

  const handleAddStickyNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !noteText.trim()) return;
    
    addAssetAnnotation(selectedResourceId, {
      type: 'StickyNote',
      text: noteText.trim(),
      pageNumber: currentPage
    });
    setNoteText('');
  };

  const handleTextHighlight = () => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim() || !selectedResourceId) return;

    addAssetHighlight(selectedResourceId, {
      text: selection.toString().trim(),
      color: activeHighlightColor,
      pageNumber: currentPage
    });

    // Clear selection
    selection.removeAllRanges();
  };

  // Page turns tracking wrapper
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (activeReadingAssetId && activeAsset && activeReadingAssetId === activeAsset.id) {
      logReadingPageFlip(newPage);
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Failed':
        return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      case 'Queued':
        return 'bg-slate-150 text-slate-600 border-slate-200 dark:bg-[#101116] dark:text-slate-400 dark:border-[#1e2026]';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 animate-pulse';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
      case 'mp4':
      case 'video':
        return <Video className="h-4 w-4 text-sky-500 shrink-0" />;
      default:
        return <Link2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
  };

  // Filtered resources
  const filteredResources = resources.filter(res => {
    const matchesCategory = selectedCategory === 'All' || res.category === selectedCategory;
    const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res.metadata?.keywords && res.metadata.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  // Segregate processing queue
  const ingestionQueue = resources.filter(r => r.status !== 'Ready' && r.status !== 'Failed');

  return (
    <div className="grid gap-6 lg:grid-cols-3 animate-fade-in relative min-h-[calc(100vh-8rem)]">
      
      {/* LEFT & CENTER PANEL: Upload and Library Grid (2 cols wide) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Ingestion Drop Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded border border-dashed p-6 text-center transition-all duration-150 cursor-pointer ${
            isDragging 
              ? 'border-slate-900 bg-slate-50/50 dark:border-slate-800/40 dark:bg-[#101116]/50' 
              : 'border-slate-200 bg-white hover:bg-slate-50/30 dark:border-[#1e2026] dark:bg-[#101116]'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            className="hidden" 
            accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-slate-50 p-2.5 dark:bg-[#101116]">
              <Upload className="h-4.5 w-4.5 text-slate-550 dark:text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                Drag and drop CFA study files here
              </p>
              <p className="text-[10px] text-slate-400">
                Supports PDF textbooks, scanned PNG/JPG formula charts, and Markdown summaries (Max 120MB)
              </p>
            </div>
          </div>
        </div>



        {/* Filter & Action bar */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex flex-wrap gap-2">
            {['All', 'Curriculum PDFs', 'Formula Sheets', 'Mock Exams', 'Videos', 'Mind Maps'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-[#07080a]' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-[#101116] dark:text-slate-400 dark:hover:bg-[#101116]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search resources..."
                className="rounded border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 outline-hidden placeholder-slate-400 dark:border-[#1e2026] dark:bg-[#101116] dark:text-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowLinkForm(prev => !prev)}
              className="rounded bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-bold flex items-center space-x-1 dark:bg-white dark:text-[#07080a] dark:text-[#07080a] cursor-pointer font-sans"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Link URL</span>
            </button>
          </div>
        </div>

        {/* Add Link Form */}
        {showLinkForm && (
          <form onSubmit={handleAddLink} className="p-4 rounded border border-slate-200 bg-slate-50/50 space-y-3.5 animate-fade-in dark:border-[#1e2026] dark:bg-[#101116]/60">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono dark:text-[#F8FAFC]">
              Ingest External Reference URL
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Resource Name / Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. CFA Level III Curriculum Errara"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-hidden dark:border-[#1e2026] bg-transparent text-slate-800 dark:text-[#F8FAFC]"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Destination Web Link (URL)</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://example.com/cfa-resources"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-hidden dark:border-[#1e2026] bg-transparent text-slate-800 dark:text-[#F8FAFC]"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Optionally Link to Syllabus Reading</label>
              <select
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs outline-hidden dark:border-[#1e2026] bg-transparent text-slate-850 dark:text-slate-300"
                value={linkReadingId}
                onChange={(e) => setLinkReadingId(e.target.value)}
              >
                <option value="">No reading association</option>
                {readings.map(r => (
                  <option key={r.id} value={r.id}>Reading {r.number}: {r.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowLinkForm(false)}
                className="rounded border border-slate-200 text-slate-500 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="rounded bg-slate-900 hover:bg-slate-850 text-white px-4 py-1.5 text-xs font-bold cursor-pointer font-sans"
              >
                Ingest URL
              </button>
            </div>
          </form>
        )}

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-16 border border-slate-100 rounded bg-slate-50/20 dark:border-slate-800/60">
            <BookOpen className="mx-auto mb-2.5 h-8 w-8 text-slate-300" />
            <p className="text-xs text-slate-450">No documents matching filter criteria found in database.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredResources.map(res => {
              const rd = res.linkedReadingId ? readings.find(r => r.id === res.linkedReadingId) : null;
              
              // Progress colors
              const progressColor = res.readingProgress === 100 
                ? 'bg-emerald-500' 
                : res.readingProgress > 50 
                  ? 'bg-blue-500' 
                  : 'bg-indigo-500';

              return (
                <div 
                  key={res.id}
                  onClick={() => setSelectedResourceId(res.id)}
                  className={`rounded border p-4 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
                    selectedResourceId === res.id 
                      ? 'border-slate-950 ring-1 ring-slate-950 bg-slate-50/[0.05] dark:border-[#F8FAFC] dark:ring-[#F8FAFC]' 
                      : 'border-slate-200 bg-white hover:border-slate-350 dark:border-[#1e2026] dark:bg-[#101116] dark:hover:border-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        {getFileIcon(res.fileType)}
                        <span className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-550 dark:bg-[#101116] dark:text-slate-400 font-bold">
                          {res.fileType.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleResourceFavorite(res.id);
                          }}
                          className={`rounded p-1 hover:bg-slate-50 dark:hover:bg-[#101116] transition-colors ${
                            res.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-slate-550'
                          }`}
                          title="Favorite"
                        >
                          <Star className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteResource(res.id);
                          }}
                          className="rounded p-1 text-slate-350 hover:text-rose-650 transition-colors dark:hover:text-rose-500"
                          title="Delete Ingested Asset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-3 text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] line-clamp-1">
                      {res.name}
                    </h3>
                    
                    {res.description && (
                      <p className="mt-1 text-[10px] text-slate-500 line-clamp-2 dark:text-slate-400 leading-relaxed font-sans">
                        {res.description}
                      </p>
                    )}

                    {/* Metadata tags indicators */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${getStatusColor(res.status)}`}>
                        {res.status}
                      </span>
                      {res.metadata?.difficulty && (
                        <span className="rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-[#101116] dark:border-slate-800/40">
                          {res.metadata.difficulty}
                        </span>
                      )}
                      {res.metadata?.estimatedStudyTime && (
                        <span className="rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-[#101116] dark:border-slate-800/40">
                          {res.metadata.estimatedStudyTime} mins
                        </span>
                      )}
                    </div>

                    {rd && (
                      <div className="mt-3 inline-flex items-center space-x-1.5 rounded bg-slate-50 px-2 py-0.5 text-[9px] font-mono text-slate-500 dark:bg-[#101116] dark:text-slate-400">
                        <BookOpen className="h-3 w-3 text-slate-450" />
                        <span>Reading {rd.number}: {rd.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-[9px] text-slate-450">
                      <span>Reading Progress</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{res.readingProgress}%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden dark:bg-[#101116]">
                      <div 
                        className={`h-full transition-all duration-305 ${progressColor}`}
                        style={{ width: `${res.readingProgress}%` }}
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Document Viewer & Intelligence Profile (1 col wide) */}
      <div className="rounded border border-slate-200 bg-white p-5 space-y-6 dark:border-[#1e2026] dark:bg-[#101116] h-fit max-h-[calc(100vh-10rem)] overflow-y-auto sticky top-24">
        
        {!activeAsset ? (
          <div className="flex flex-col items-center justify-center text-center p-12 space-y-3 h-96">
            <Brain className="h-10 w-10 text-slate-350 dark:text-slate-700 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider font-mono">
                Document Inspector
              </h4>
              <p className="text-[10px] text-slate-400 max-w-xs">
                Select an ingested asset from the library to explore its semantic metadata profile, chunks, formulas, and OCR transcripts.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Title & Status */}
            <div className="space-y-2 border-b border-slate-100 pb-4 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-600 uppercase dark:bg-[#101116] dark:text-slate-400">
                  Profile Asset ID: {activeAsset.id.slice(0, 10)}...
                </span>
                <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-semibold ${getStatusColor(activeAsset.status)}`}>
                  {activeAsset.status}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] font-mono">
                {activeAsset.name}
              </h3>
            </div>

            {/* Sprint 8 Kindle Telemetry HUD Overlay */}
            {activeAsset.status === 'Ready' && (
              <div className="space-y-3.5">
                {activeReadingAssetId === activeAsset.id ? (
                  <div className="bg-slate-900 text-white rounded p-4 text-[10px] font-mono space-y-3 border border-slate-800 dark:bg-[#07080a] dark:border-slate-800/60 relative overflow-hidden animate-fade-in shadow-inner">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl"></div>
                    <div className="flex items-center justify-between relative">
                      <span className="text-emerald-400 font-bold flex items-center space-x-1.5 animate-pulse">
                        <Timer className="h-3.5 w-3.5 text-emerald-400" />
                        <span>KINDLE TELEMETRY ONGOING</span>
                      </span>
                      <button
                        onClick={endReadingSession}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 rounded font-sans font-bold cursor-pointer uppercase text-[9px] tracking-wide"
                      >
                        End Tracker
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-slate-350 relative pt-1">
                      <div>
                        <span>Skim WPM Velocity:</span>
                        <span className="block font-bold text-white text-xs mt-0.5">245 WPM</span>
                      </div>
                      <div>
                        <span>Estimated Remaining:</span>
                        <span className="block font-bold text-white text-xs mt-0.5">
                          {Math.max(1, Math.round(((previewPages.length - currentPage) * 1.5)))} mins
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 flex items-center justify-between dark:bg-[#07080a]/40 dark:border-slate-800/60">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono font-bold text-slate-450 uppercase block">Kindle Telemetry</span>
                      <p className="text-[10px] text-slate-550 dark:text-slate-500 leading-relaxed font-sans">
                        Record reading focus speeds and skim ratios.
                      </p>
                    </div>
                    <button
                      onClick={() => startReadingSession(activeAsset.id, currentPage)}
                      className="rounded bg-slate-900 hover:bg-slate-850 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200 cursor-pointer font-sans shrink-0 ml-2"
                    >
                      Start Telemetry
                    </button>
                  </div>
                )}

                {/* Session Summary Card */}
                {!activeReadingAssetId && readingSessionActiveReport && readingSessionActiveReport.assetId === activeAsset.id && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-[10px] font-mono space-y-2.5 dark:bg-emerald-950/10 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 animate-fade-in">
                    <div className="flex items-center space-x-1.5 font-bold uppercase border-b border-emerald-100/50 pb-1.5">
                      <Award className="h-4.5 w-4.5 text-emerald-500" />
                      <span>Telemetry Summary Report</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-slate-700 dark:text-slate-400">
                      <div>Pages read: <strong className="text-slate-900 dark:text-slate-200">{readingSessionActiveReport.pagesRead} pages</strong></div>
                      <div>Avg speed: <strong className="text-slate-900 dark:text-slate-200">{readingSessionActiveReport.averageWpm} WPM</strong></div>
                      <div>Time elapsed: <strong className="text-slate-900 dark:text-slate-200">{readingSessionActiveReport.elapsedSeconds}s</strong></div>
                      <div>Comprehension: <strong className="text-slate-900 dark:text-slate-200">{readingSessionActiveReport.comprehensionEstimated}%</strong></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile / Ingestion Manifest Report Accordion */}
            {activeAsset.manifest && (
              <div className="rounded bg-slate-50 p-4 space-y-3.5 border border-slate-100 dark:bg-[#07080a]/30 dark:border-[#1e2026]">
                <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-300">
                  <Database className="h-4 w-4 text-slate-500" />
                  <h4 className="text-[10px] font-bold tracking-wider font-mono uppercase">
                    Ingestion Profile Report
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 font-mono text-[10px] border-b border-slate-200/50 pb-3 dark:border-slate-800/60">
                  <div>
                    <span className="text-slate-450">Size:</span>
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">
                      {activeAsset.fileSize || `${(activeAsset.manifest.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450">Pages Count:</span>
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">
                      {activeAsset.manifest.pages} pages
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450">Detected Formulas:</span>
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">
                      {activeAsset.manifest.formulaCount} formula nodes
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450">Detected LOS:</span>
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">
                      {activeAsset.manifest.losCount} target links
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450">Knowledge Density:</span>
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">
                      {(activeAsset.manifest.knowledgeScore / 10).toFixed(1)} / 10
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-450">Processing Time:</span>
                    <span className="block font-semibold text-slate-700 dark:text-slate-300">
                      {((activeAsset.manifest.processingDurationMs || 0) / 1000).toFixed(2)} sec
                    </span>
                  </div>
                </div>

                <div className="text-[9px] font-mono text-slate-400 space-y-1">
                  <div>Fingerprint: <span className="text-slate-500 break-all">{activeAsset.manifest.fingerprint}</span></div>
                  <div>Parser version: <span className="text-slate-550">{activeAsset.manifest.pipelineVersion}</span></div>
                </div>
              </div>
            )}

            {/* Content Preview Screen */}
            {activeAsset.status !== 'Ready' ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded text-center dark:bg-[#07080a]/20 dark:border-[#1e2026]/30">
                <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                <p className="mt-2 text-[10px] text-slate-500 font-mono">
                  Document processing in progress... preview will load automatically upon ingestion readiness.
                </p>
              </div>
            ) : loadingPreview ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
              </div>
            ) : previewPages.length > 0 ? (
              <div className="space-y-4">
                
                {/* Preview Navigation */}
                <div className="flex items-center justify-between border-b border-slate-150 pb-2 dark:border-[#1e2026]">
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-455">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Page {currentPage} of {previewPages.length}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className="rounded p-1 hover:bg-slate-50 border border-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-[#1e2026] dark:hover:bg-[#101116] cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-555" />
                    </button>
                    <button 
                      disabled={currentPage === previewPages.length}
                      onClick={() => handlePageChange(Math.min(previewPages.length, currentPage + 1))}
                      className="rounded p-1 hover:bg-slate-50 border border-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-[#1e2026] dark:hover:bg-[#101116] cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-555" />
                    </button>
                  </div>
                </div>

                {/* Page Heading */}
                <div className="text-[10px] font-mono text-slate-455 uppercase tracking-wider">
                  Section: {previewPages[currentPage - 1]?.heading || 'General Reference'}
                </div>

                {/* Page content window */}
                <div 
                  onMouseUp={handleTextHighlight}
                  className="rounded border border-slate-200 bg-slate-50/20 p-4 text-[11px] font-serif text-slate-800 dark:border-[#1e2026] dark:bg-[#07080a]/30 dark:text-[#F8FAFC] min-h-60 max-h-96 overflow-y-auto leading-relaxed select-text"
                >
                  <MathRenderer math={previewPages[currentPage - 1]?.content || ''} />
                </div>

                {/* Highlighting & Save Note Toolbar Helper */}
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-100 pt-2.5 dark:border-slate-800/60 flex-wrap gap-2">
                  <div className="flex items-center space-x-1">
                    <Highlighter className="h-3.5 w-3.5 text-slate-550" />
                    <span>Select text in window above to highlight or save:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSaveSelectedAsNote}
                      className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded cursor-pointer transition flex items-center gap-1"
                    >
                      <span>📝 Save Text as Note</span>
                    </button>
                    <div className="flex items-center space-x-1 pl-1">
                      <button 
                        onClick={() => setActiveHighlightColor('yellow')}
                        className={`h-3 w-3 rounded-full bg-yellow-300 border ${activeHighlightColor === 'yellow' ? 'border-slate-900 dark:border-white' : 'border-transparent'} cursor-pointer`}
                        title="Yellow Highlight"
                      />
                      <button 
                        onClick={() => setActiveHighlightColor('emerald')}
                        className={`h-3 w-3 rounded-full bg-emerald-300 border ${activeHighlightColor === 'emerald' ? 'border-slate-900 dark:border-white' : 'border-transparent'} cursor-pointer`}
                        title="Green Highlight"
                      />
                      <button 
                        onClick={() => setActiveHighlightColor('sky')}
                        className={`h-3 w-3 rounded-full bg-sky-300 border ${activeHighlightColor === 'sky' ? 'border-slate-900 dark:border-white' : 'border-transparent'} cursor-pointer`}
                        title="Blue Highlight"
                      />
                    </div>
                  </div>
                </div>

                {/* Page Highlights and Sticky Notes list */}
                {(activeAsset.highlightsList?.some(hl => hl.pageNumber === currentPage) ||
                  activeAsset.annotations?.some(ann => ann.pageNumber === currentPage)) && (
                  <div className="rounded border border-slate-150 p-3 space-y-2 bg-slate-50/10 dark:border-[#1e2026]">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-455">
                      Annotations on Page {currentPage}
                    </span>
                    
                    {/* Render Highlights */}
                    {activeAsset.highlightsList?.filter(hl => hl.pageNumber === currentPage).map(hl => (
                      <div key={hl.id} className="text-[10px] pl-2 border-l-2 border-yellow-450 bg-yellow-50/20 py-1 text-slate-700 italic dark:text-slate-400">
                        "{hl.text}"
                      </div>
                    ))}

                    {/* Render Sticky Comments */}
                    {activeAsset.annotations?.filter(ann => ann.pageNumber === currentPage).map(ann => (
                      <div key={ann.id} className="flex items-start space-x-1.5 text-[10px] bg-slate-50/50 p-2 border border-slate-100 rounded dark:bg-[#101116] dark:border-[#1e2026]">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-455 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-mono text-[8px] text-slate-455">Sticky Note:</span>
                          <p className="text-slate-700 dark:text-slate-400">{ann.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Sticky Note form */}
                <form onSubmit={handleAddStickyNote} className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Attach study note to page..."
                    className="flex-1 rounded border border-slate-200 px-3 py-1.5 text-[11px] outline-hidden bg-transparent text-slate-800 placeholder-slate-450 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="rounded bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200 cursor-pointer"
                  >
                    Save
                  </button>
                </form>

                {/* Manual Progress Slider */}
                <div className="rounded border border-slate-150 p-3 space-y-3 dark:border-[#1e2026]">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-455 uppercase">Update Reading Progress</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeAsset.readingProgress}% (Page {currentPage})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer dark:bg-[#101116]"
                    value={activeAsset.readingProgress}
                    onChange={(e) => {
                      updateAssetProgress(activeAsset.id, parseInt(e.target.value, 10), currentPage);
                    }}
                  />
                </div>

              </div>
            ) : null}

            {/* FUTURE AI ACTIONS COLLAPSIBLE CARD */}
            <div className="rounded border border-slate-150 bg-slate-50/20 p-4 space-y-3 dark:border-[#1e2026] dark:bg-[#101116]">
              <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-300">
                <Brain className="h-4 w-4 text-slate-500" />
                <h4 className="text-[10px] font-bold tracking-wider font-mono uppercase">
                  AI Copilot (Sprint 8 Sandbox)
                </h4>
              </div>
              
              <div className="space-y-2 text-[10px]">
                <div className="rounded border border-slate-100 p-2.5 bg-white space-y-1.5 dark:bg-[#101116] dark:border-[#1e2026] opacity-80 animate-fade-in">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-slate-455" />
                    <span>Generate AI Summarizations</span>
                  </div>
                  <p className="text-[9px] text-slate-455 leading-relaxed">
                    Uses manifest fingerprints to generate grounded, 3-sentence active recall outlines of these chunks.
                  </p>
                </div>

                <div className="rounded border border-slate-100 p-2.5 bg-white space-y-1.5 dark:bg-[#101116] dark:border-[#1e2026] opacity-80 animate-fade-in">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-3.5 w-3.5 text-slate-455" />
                    <span>Compile Active Recall Flashcards</span>
                  </div>
                  <p className="text-[9px] text-slate-455 leading-relaxed">
                    Extracts formulas and creates Anki-style deck lists associated with detected Readings automatically.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
