/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarEvent, CalendarEventType } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Briefcase, 
  Bookmark, 
  AlertTriangle 
} from 'lucide-react';

const EVENT_TYPES: CalendarEventType[] = ['Study Session', 'Revision', 'Mock Exam', 'Personal Reminder', 'Deadline'];

export const CalendarPage: React.FC = () => {
  const { events, addEvent, deleteEvent, updateEvent, subjects, readings } = useApp();
  
  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(new Date('2026-06-28')); // Starting with the system local date
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-06-29');

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTimeStart, setNewTimeStart] = useState('09:00');
  const [newTimeEnd, setNewTimeEnd] = useState('11:00');
  const [newType, setNewType] = useState<CalendarEventType>('Study Session');
  const [newDesc, setNewDesc] = useState('');
  const [newSubjectLink, setNewSubjectLink] = useState('');

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // First day of the month
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Total days in previous month (for padding)
  const prevTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to format date strings YYYY-MM-DD
  const formatDateString = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDateString(day);
    setSelectedDateStr(dateStr);
    const dayEvts = events.filter(e => e.date === dateStr);
    setSelectedDayEvents(dayEvts);
    setShowAddForm(false);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addEvent({
      title: newTitle.trim(),
      date: selectedDateStr,
      startTime: newTimeStart || undefined,
      endTime: newTimeEnd || undefined,
      type: newType,
      description: newDesc.trim() ? newDesc.trim() : undefined,
      isCompleted: false,
      linkedSubjectId: newSubjectLink || undefined
    });

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewSubjectLink('');
    setShowAddForm(false);

    // Refresh selected day events
    setTimeout(() => {
      const refreshed = events.filter(evt => evt.date === selectedDateStr);
      setSelectedDayEvents(refreshed);
    }, 50);
  };

  const getEventTypeStyle = (type: CalendarEventType) => {
    switch (type) {
      case 'Mock Exam':
        return 'border border-slate-300 text-slate-700 dark:border-neutral-700 dark:text-neutral-200 bg-slate-50/50';
      case 'Deadline':
        return 'bg-slate-900 text-white dark:bg-neutral-50 dark:text-neutral-950';
      case 'Study Session':
        return 'bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-200';
      case 'Revision':
        return 'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-neutral-800/20';
      default:
        return 'bg-slate-50 text-slate-600 dark:bg-neutral-800/40';
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-fade-in">
      
      {/* Left Columns (2/3 width): The Calendar grid */}
      <div className="space-y-4 md:col-span-2">
        <div className="rounded border border-slate-200 bg-white p-5 dark:border-neutral-700/50 dark:bg-neutral-800/60">
          
          {/* Header Month Switcher */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-neutral-700/50">
            <div className="flex items-center space-x-2.5">
              <CalendarIcon className="h-4.5 w-4.5 text-slate-400" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-neutral-50 font-sans">
                {monthNames[month]} {year}
              </h2>
            </div>
            <div className="flex items-center space-x-1">
              <button 
                onClick={handlePrevMonth}
                className="rounded p-1 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-400 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="rounded p-1 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-400 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday grid headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-bold text-slate-400 uppercase py-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar grid dates */}
          <div className="grid grid-cols-7 gap-1 mt-1">
            {/* Previous month day padding */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const prevDay = prevTotalDays - firstDayIndex + 1 + idx;
              return (
                <div 
                  key={`prev-${idx}`} 
                  className="aspect-square p-1 rounded-sm bg-slate-50/40 text-[10px] text-slate-300 select-none dark:bg-neutral-950/20 dark:text-neutral-700"
                >
                  {prevDay}
                </div>
              );
            })}

            {/* Current month active days */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = formatDateString(day);
              const dayEvts = events.filter(e => e.date === dateStr);
              const isToday = year === 2026 && month === 5 && day === 28; // Jun 28 2026
              const isSelected = selectedDateStr === dateStr;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square p-1.5 rounded border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-slate-900 bg-slate-50/50 dark:border-neutral-100 dark:bg-neutral-800/20' 
                      : isToday 
                        ? 'border-slate-800 bg-slate-50/20 dark:border-neutral-100'
                        : 'border-slate-100 hover:bg-slate-50/50 dark:border-neutral-700/50/40 dark:hover:bg-neutral-800/20'
                  }`}
                >
                  <span className={`text-[10px] font-mono font-semibold ${
                    isToday ? 'text-slate-900 font-bold dark:text-neutral-50' : 'text-slate-450'
                  }`}>
                    {day}
                  </span>

                  {/* Little events dot stack */}
                  <div className="flex gap-0.5 mt-auto">
                    {dayEvts.map((evt) => (
                      <span 
                        key={evt.id} 
                        className={`h-1 w-1 rounded-full ${
                          evt.type === 'Mock Exam' ? 'bg-slate-400' :
                          evt.type === 'Deadline' ? 'bg-slate-900 dark:bg-neutral-100' :
                          'bg-slate-600'
                        }`} 
                        title={evt.title}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Right Column (1/3 width): Selected Day agenda details */}
      <div className="space-y-4 md:col-span-1">
        
        <div className="rounded border border-slate-200 bg-white p-4 dark:border-neutral-700/50 dark:bg-neutral-800/60">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-neutral-700/50">
            <div>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Selected Agenda</span>
              <h3 className="text-xs font-semibold text-slate-800 dark:text-neutral-200">{selectedDateStr}</h3>
            </div>
            
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center space-x-1 rounded bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-neutral-50 dark:text-neutral-950"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Event</span>
              </button>
            )}
          </div>

          {/* Add event form */}
          {showAddForm ? (
            <form onSubmit={handleCreateEvent} className="mt-3 space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Study Session standard name"
                  className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-transparent text-slate-800 dark:border-neutral-700/50 dark:text-neutral-200"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase">Starts</label>
                  <input
                    type="time"
                    className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-transparent text-slate-800 dark:border-neutral-700/50 dark:text-neutral-200"
                    value={newTimeStart}
                    onChange={(e) => setNewTimeStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase">Ends</label>
                  <input
                    type="time"
                    className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-transparent text-slate-800 dark:border-neutral-700/50 dark:text-neutral-200"
                    value={newTimeEnd}
                    onChange={(e) => setNewTimeEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase">Event Type</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-white text-slate-800 dark:bg-neutral-800/60 dark:border-neutral-700/50 dark:text-neutral-200"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CalendarEventType)}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase">Link Syllabus Topic</label>
                <select
                  className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-white text-slate-800 dark:bg-neutral-800/60 dark:border-neutral-700/50 dark:text-neutral-200"
                  value={newSubjectLink}
                  onChange={(e) => setNewSubjectLink(e.target.value)}
                >
                  <option value="">-- No link --</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.code} - {sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase">Task notes</label>
                <textarea
                  className="mt-1 w-full rounded border border-slate-200 p-1.5 text-xs bg-transparent text-slate-800 dark:border-neutral-700/50 dark:text-neutral-200"
                  rows={2}
                  placeholder="Summary of objectives..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 rounded bg-slate-900 py-1.5 text-xs text-white hover:bg-slate-800 transition-colors dark:bg-neutral-50 dark:text-neutral-950"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded border border-slate-200 px-3 text-xs text-slate-500 hover:bg-slate-50 transition-colors dark:border-neutral-700/50 dark:text-neutral-400"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            /* Events view list */
            <div className="mt-3.5 space-y-2.5">
              {selectedDayEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No events scheduled for this study date.
                </div>
              ) : (
                selectedDayEvents.map((evt) => {
                  const subObj = subjects.find(s => s.id === evt.linkedSubjectId);
                  return (
                    <div 
                      key={evt.id} 
                      className="rounded border border-slate-150 p-3.5 dark:border-neutral-700/50/60"
                    >
                      <div className="flex items-start justify-between">
                        <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider font-mono ${getEventTypeStyle(evt.type)}`}>
                          {evt.type}
                        </span>
                        <button
                          onClick={() => {
                            deleteEvent(evt.id);
                            setSelectedDayEvents(prev => prev.filter(e => e.id !== evt.id));
                          }}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Cancel event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h4 className="mt-2 text-xs font-semibold text-slate-800 dark:text-neutral-200 leading-tight">
                        {evt.title}
                      </h4>

                      {evt.startTime && (
                        <div className="mt-1.5 flex items-center space-x-1 font-mono text-[9px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{evt.startTime} - {evt.endTime || 'No End'}</span>
                        </div>
                      )}

                      {evt.description && (
                        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed dark:text-neutral-400">
                          {evt.description}
                        </p>
                      )}

                      {subObj && (
                        <div className="mt-2.5 inline-flex items-center space-x-1.5 rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:bg-neutral-800">
                          <span>Syllabus: {subObj.code}</span>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
        
      </div>

    </div>
  );
};
