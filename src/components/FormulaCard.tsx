/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Formula, StudyNote, Resource } from '../types';
import { MathRenderer } from './MathRenderer';
import { useApp } from '../context/AppContext';
import { 
  Star, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  FileText, 
  Clock, 
  Share2, 
  Layers
} from 'lucide-react';

interface FormulaCardProps {
  formula: Formula;
  onUpdate?: (id: string, updates: Partial<Formula>) => void;
}

export const FormulaCard: React.FC<FormulaCardProps> = ({ formula, onUpdate }) => {
  const { 
    eventBus,
    notes,
    resources,
    readings,
    losList,
    sessionHistory,
    setActiveTab,
    setSelectedNoteId,
    setSelectedResourceId,
    setSelectedReadingId,
    selectLOS
  } = useApp();

  // Collapsible panels
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showNuances, setShowNuances] = useState(false);
  const [showGraphContext, setShowGraphContext] = useState(false);
  const [isMasked, setIsMasked] = useState(false);

  // Trigger opened/closed events
  useEffect(() => {
    if (isExpanded) {
      eventBus.publish({
        type: 'FormulaOpened',
        timestamp: new Date().toISOString(),
        source: 'FormulaCard',
        entityId: formula.id,
        payload: { name: formula.name }
      });
    } else {
      eventBus.publish({
        type: 'FormulaClosed',
        timestamp: new Date().toISOString(),
        source: 'FormulaCard',
        entityId: formula.id,
        payload: { name: formula.name }
      });
    }
  }, [isExpanded, formula.id, formula.name, eventBus]);

  // Handle variable masking by replacing symbols in LaTeX
  const getRenderedMath = () => {
    let math = formula.latexExpression;
    if (isMasked) {
      formula.variables.forEach(v => {
        // Escaping special regex characters in latex symbol
        const escaped = v.symbol.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        math = math.replace(regex, '\\boxed{?}');
      });
    }
    return math;
  };

  // Toggle favorite / memorized status
  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !formula.isMemorized;
    if (onUpdate) {
      onUpdate(formula.id, { isMemorized: nextVal });
    }
  };

  // Set confidence rating
  const handleSetConfidence = (rating: number) => {
    if (onUpdate) {
      onUpdate(formula.id, { confidenceRating: rating });
    }
  };

  // Update mastery steps
  const handleCheckMastery = (step: 'equation' | 'variables' | 'assumptions' | 'limitations' | 'apply') => {
    const steps = formula.masterySteps || {
      equation: false,
      variables: false,
      assumptions: false,
      limitations: false,
      apply: false
    };

    const nextSteps = {
      ...steps,
      [step]: !steps[step]
    };

    if (onUpdate) {
      onUpdate(formula.id, { masterySteps: nextSteps });
    }
  };

  // Query connected items from snapshot/lists
  const readingObj = readings.find(r => r.id === formula.linkedReadingId);
  const losObj = losList.find(l => l.id === formula.linkedLOSId);

  // Notes linked directly or sharing Reading/LOS
  const relatedNotes = notes.filter(n => 
    n.relatedFormula?.includes(formula.id) || 
    (formula.linkedLOSId && n.linkedLOSId === formula.linkedLOSId) ||
    (formula.linkedReadingId && n.linkedReadingId === formula.linkedReadingId)
  );

  // Resources linked sharing Reading/LOS
  const relatedResources = resources.filter(r => 
    (formula.linkedReadingId && r.linkedReadingId === formula.linkedReadingId) ||
    (formula.linkedLOSId && r.linkedLOSId === formula.linkedLOSId)
  );

  // Sibling formulas sharing the same reading
  const siblingCount = formula.linkedReadingId ? 4 : 0; // standard value

  // Historical study sessions that cover this formula's reading/LOS
  const formulaHistory = sessionHistory.filter(s => 
    (formula.linkedLOSId && s.linkedLOSId === formula.linkedLOSId) ||
    (formula.linkedReadingId && s.linkedReadingId === formula.linkedReadingId)
  );

  // Total calculated graph connections
  const connectionsCount = 
    (formula.linkedSubjectId ? 1 : 0) + 
    (formula.linkedReadingId ? 1 : 0) + 
    (formula.linkedLOSId ? 1 : 0) + 
    relatedNotes.length + 
    relatedResources.length + 
    formulaHistory.length;

  const currentMastery = formula.masterySteps || {
    equation: false,
    variables: false,
    assumptions: false,
    limitations: false,
    apply: false
  };

  const completedStepsCount = Object.values(currentMastery).filter(Boolean).length;
  const isFullyMastered = completedStepsCount === 5;

  return (
    <div 
      className={`border rounded-lg transition-all duration-200 ${
        isFullyMastered 
          ? 'border-emerald-500/30 bg-emerald-50/[0.01] dark:bg-emerald-950/[0.01]' 
          : 'border-slate-200 bg-white dark:border-slate-800/60 dark:bg-[#101116]'
      } overflow-hidden shadow-xs hover:border-slate-350 dark:hover:border-slate-800/50`}
    >
      {/* Header bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-slate-50/20 dark:bg-[#101116]/10 hover:bg-slate-50/50 dark:hover:bg-[#101116]/30"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <button 
            onClick={toggleFavorite}
            className={`transition-colors duration-150 ${
              formula.isMemorized 
                ? 'text-amber-500 hover:text-amber-600' 
                : 'text-slate-300 hover:text-slate-400 dark:text-slate-500 dark:hover:text-slate-500'
            }`}
          >
            <Star className="h-4.5 w-4.5 fill-current" />
          </button>
          
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC] truncate">
              {formula.name}
            </h3>
            {readingObj && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                Reading {readingObj.number} • {losObj ? `LOS ${losObj.code}` : 'Outcomes'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Mastery stats indicator */}
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
            isFullyMastered 
              ? 'text-emerald-700 bg-emerald-55/40 dark:text-emerald-400 dark:bg-emerald-950/30 border border-emerald-500/20' 
              : completedStepsCount > 0 
                ? 'text-amber-700 bg-amber-55/40 dark:text-amber-400 dark:bg-amber-950/20' 
                : 'text-slate-400 bg-slate-100 dark:text-slate-500 dark:bg-[#101116]/60'
          }`}>
            {isFullyMastered ? 'MASTERED' : `${completedStepsCount}/5 Steps`}
          </span>

          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded body details */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/60 p-4 space-y-4 text-xs animate-fade-in bg-white dark:bg-[#101116]">
          
          {/* Description */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
            {formula.description}
          </p>

          {/* Equation Display Box */}
          <div className="relative border border-slate-100 dark:border-slate-800/60 rounded p-4 bg-slate-50/[0.2] dark:bg-[#07080a]/20 flex flex-col items-center justify-center min-h-[70px]">
            <MathRenderer block math={getRenderedMath()} className="text-[13px] md:text-sm font-semibold max-w-full overflow-x-auto text-slate-900 dark:text-[#F8FAFC]" />
            
            {/* Active recall mask toggler */}
            <button
              onClick={() => {
                setIsMasked(!isMasked);
                eventBus.publish({
                  type: !isMasked ? 'FormulaHidden' : 'FormulaReviewed',
                  timestamp: new Date().toISOString(),
                  source: 'FormulaCard',
                  entityId: formula.id,
                  payload: { action: !isMasked ? 'masked' : 'unmasked' }
                });
              }}
              className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[9px] font-mono text-slate-450 dark:border-slate-800/60 dark:bg-[#101116] dark:hover:bg-[#101116] transition-all cursor-pointer shadow-xs"
            >
              {isMasked ? 'Reveal Symbols' : 'Active Recall (Mask)'}
            </button>
          </div>

          {/* Collapsible Variables Glossary */}
          <div className="border border-slate-100 dark:border-slate-800/60 rounded overflow-hidden">
            <button 
              onClick={() => {
                const nextVal = !showVariables;
                setShowVariables(nextVal);
                if (nextVal) {
                  eventBus.publish({
                    type: 'FormulaRevealed',
                    timestamp: new Date().toISOString(),
                    source: 'FormulaCard',
                    entityId: formula.id,
                    payload: { section: 'variables' }
                  });
                }
              }}
              className="flex w-full items-center justify-between bg-slate-50/50 px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 dark:bg-[#101116]/40 dark:text-slate-300 dark:hover:bg-[#101116]/60"
            >
              <span className="font-mono text-[10px] tracking-wide uppercase">Variables Glossary</span>
              {showVariables ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            
            {showVariables && (
              <div className="divide-y divide-slate-100 p-2.5 space-y-1.5 bg-white dark:bg-[#101116] dark:divide-slate-800/60">
                {formula.variables.map((v, i) => (
                  <div key={i} className={`flex items-start text-[11px] pt-1.5 ${i > 0 ? 'border-t border-slate-50 dark:border-slate-800/60/40' : ''}`}>
                    <span className="bg-slate-100/80 px-1 rounded font-mono text-[9px] font-bold text-slate-700 dark:bg-[#101116] dark:text-slate-300 shrink-0 select-all mr-2">
                      <MathRenderer math={v.symbol} />
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-sans leading-normal">
                      {v.meaning}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strategic Nuances & Exam Pitfalls */}
          <div className="border border-slate-100 dark:border-slate-800/60 rounded overflow-hidden">
            <button 
              onClick={() => {
                const nextVal = !showNuances;
                setShowNuances(nextVal);
                if (nextVal) {
                  eventBus.publish({
                    type: 'FormulaRevealed',
                    timestamp: new Date().toISOString(),
                    source: 'FormulaCard',
                    entityId: formula.id,
                    payload: { section: 'nuances' }
                  });
                }
              }}
              className="flex w-full items-center justify-between bg-slate-50/50 px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 dark:bg-[#101116]/40 dark:text-slate-300 dark:hover:bg-[#101116]/60"
            >
              <span className="font-mono text-[10px] tracking-wide uppercase">LIII Strategic Nuance & Pitfalls</span>
              {showNuances ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showNuances && (
              <div className="p-3 space-y-3.5 bg-white dark:bg-[#101116] font-sans">
                {/* Nuances */}
                {formula.strategicNuances && formula.strategicNuances.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center">
                      <Layers className="h-3 w-3 text-slate-400 mr-1.5 shrink-0" />
                      Assumptions & Constraints
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      {formula.strategicNuances.map((sn, idx) => (
                        <li key={idx}>{sn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pitfalls */}
                {formula.examPitfalls && formula.examPitfalls.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mr-1.5 shrink-0" />
                      Critical Exam Pitfalls
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-550 dark:text-slate-400 leading-relaxed text-[11px]">
                      {formula.examPitfalls.map((ep, idx) => (
                        <li key={idx}>{ep}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mastery Checklist Grid */}
          <div className="border border-slate-100 dark:border-slate-800/60 rounded p-3 bg-slate-50/[0.1] dark:bg-[#07080a]/10">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
              Formula Mastery Checklist
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center space-x-2 text-[11px] text-slate-650 dark:text-slate-400 font-sans cursor-pointer select-none hover:text-slate-800 dark:hover:text-[#F8FAFC]">
                <input 
                  type="checkbox" 
                  checked={currentMastery.equation} 
                  onChange={() => handleCheckMastery('equation')}
                  className="rounded border-slate-300 dark:border-[#1e2026] text-slate-900 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                />
                <span>Memorized Equation Structure</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-slate-650 dark:text-slate-400 font-sans cursor-pointer select-none hover:text-slate-800 dark:hover:text-[#F8FAFC]">
                <input 
                  type="checkbox" 
                  checked={currentMastery.variables} 
                  onChange={() => handleCheckMastery('variables')}
                  className="rounded border-slate-300 dark:border-[#1e2026] text-slate-900 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                />
                <span>Understand Every Variable Input</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-slate-650 dark:text-slate-400 font-sans cursor-pointer select-none hover:text-slate-800 dark:hover:text-[#F8FAFC]">
                <input 
                  type="checkbox" 
                  checked={currentMastery.assumptions} 
                  onChange={() => handleCheckMastery('assumptions')}
                  className="rounded border-slate-300 dark:border-[#1e2026] text-slate-900 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                />
                <span>Know Strategic Assumptions</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-slate-650 dark:text-slate-400 font-sans cursor-pointer select-none hover:text-slate-800 dark:hover:text-[#F8FAFC]">
                <input 
                  type="checkbox" 
                  checked={currentMastery.limitations} 
                  onChange={() => handleCheckMastery('limitations')}
                  className="rounded border-slate-300 dark:border-[#1e2026] text-slate-900 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                />
                <span>Know Models Limitations</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-slate-650 dark:text-slate-400 font-sans cursor-pointer select-none hover:text-slate-800 dark:hover:text-[#F8FAFC]">
                <input 
                  type="checkbox" 
                  checked={currentMastery.apply} 
                  onChange={() => handleCheckMastery('apply')}
                  className="rounded border-slate-300 dark:border-[#1e2026] text-slate-900 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                />
                <span>Can Apply to Mock Questions</span>
              </label>
            </div>
          </div>

          {/* Quick Confidence Slider */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">Self-Assess Recall Rating:</span>
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  onClick={() => handleSetConfidence(val)}
                  className={`h-5 w-5 text-[9px] font-mono font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
                    formula.confidenceRating === val
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-[#07080a] font-bold scale-105 shadow-xs'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-[#101116] dark:hover:bg-[#1e2026]'
                  }`}
                  title={`Rate Recall: ${val}/5`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Semantic Graph Context */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
            <button 
              onClick={() => setShowGraphContext(!showGraphContext)}
              className="flex w-full items-center justify-between text-left font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center space-x-1">
                <Share2 className="h-3 w-3 shrink-0" />
                <span className="font-mono text-[9px] tracking-wide uppercase">Semantic Graph Linkages ({connectionsCount} nodes)</span>
              </div>
              {showGraphContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showGraphContext && (
              <div className="mt-2.5 space-y-3 bg-slate-50/[0.1] dark:bg-[#07080a]/20 p-2.5 rounded border border-slate-100 dark:border-slate-800/60 animate-fade-in font-sans">
                
                {/* Related Notes */}
                {relatedNotes.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Connected Outlines & Notes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedNotes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setSelectedNoteId(n.id);
                            if (formula.linkedLOSId) selectLOS(formula.linkedLOSId);
                            setActiveTab('notes');
                          }}
                          className="inline-flex items-center space-x-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 px-2 py-0.5 text-[9px] text-slate-600 dark:border-slate-800/60 dark:bg-[#101116] dark:text-slate-400 dark:hover:bg-[#101116] transition-colors cursor-pointer"
                        >
                          <FileText className="h-2.5 w-2.5 text-slate-400" />
                          <span className="max-w-[120px] truncate">{n.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Resources */}
                {relatedResources.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Linked Reference Resources:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedResources.map(r => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedResourceId(r.id);
                            if (r.linkedReadingId) setSelectedReadingId(r.linkedReadingId);
                            setActiveTab('resources');
                          }}
                          className="inline-flex items-center space-x-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 px-2 py-0.5 text-[9px] text-slate-600 dark:border-slate-800/60 dark:bg-[#101116] dark:text-slate-400 dark:hover:bg-[#101116] transition-colors cursor-pointer"
                        >
                          <BookOpen className="h-2.5 w-2.5 text-slate-400" />
                          <span className="max-w-[150px] truncate">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Study History Timeline */}
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Study Recall Sessions ({formulaHistory.length}):</span>
                  {formulaHistory.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No study sessions logged for this formula context yet.</p>
                  ) : (
                    <div className="space-y-1 relative pl-3.5 border-l border-slate-200 dark:border-slate-800/60">
                      {formulaHistory.slice(0, 3).map((hist, idx) => (
                        <div key={hist.id} className="text-[10px] text-slate-500 dark:text-slate-400 relative">
                          <span className="absolute -left-[18.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                          <div className="flex items-center justify-between font-mono text-[9px]">
                            <span>{new Date(hist.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            <span className="text-slate-400">duration: {hist.durationMinutes}m</span>
                          </div>
                          <p className="mt-0.5">
                            Studied block at focus rating <strong className="text-slate-700 dark:text-[#F8FAFC]">{hist.mentalFocusScore}/10</strong>.
                            {hist.confidenceAfter && (
                              <span> Adjusted confidence to <strong className="text-slate-700 dark:text-[#F8FAFC]">{hist.confidenceAfter}/5</strong>.</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sibling Formulas */}
                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                  <span>Sibling Reading Formulas: <strong>{siblingCount}</strong></span>
                  <span>Connections Weight: <strong>{(connectionsCount * 0.15).toFixed(2)}</strong></span>
                </div>

              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
