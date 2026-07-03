/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Shield, Mail, Key, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('mananintodia04321@gmail.com');
  const [name, setName] = useState('Candidate Candidate');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, name);
  };

  const handleQuickLogin = () => {
    login('mananintodia04321@gmail.com', 'Candidate Candidate');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 dark:bg-[#07080a] animate-fade-in">
      <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded border border-slate-200 dark:bg-[#101116] dark:border-[#1e2026]">
        
        {/* Brand visual header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-slate-900 font-mono text-xs font-bold text-white select-none dark:bg-white dark:text-[#07080a]">
            III
          </div>
          <h2 className="text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-[#F8FAFC] font-sans">
            CFA Level III Prep Portal
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-wider font-mono">
            Secure Foundation Login
          </p>
        </div>

        {/* Normal Login Form */}
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          
          <div className="space-y-3.5">
            <div>
              <label htmlFor="name-input" className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Candidate Full Name</label>
              <div className="mt-1.5 relative rounded">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="name-input"
                  type="text"
                  required
                  className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-400 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-input" className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Candidate Email address</label>
              <div className="mt-1.5 relative rounded">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  required
                  className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-400 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                  placeholder="e.g. candidate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors focus:outline-hidden dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
          >
            Authenticate Portal
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-100 dark:border-[#1e2026]"></div>
          <span className="flex-shrink mx-4 text-[9px] font-mono text-slate-400 uppercase">Developer Simulation</span>
          <div className="flex-grow border-t border-slate-100 dark:border-[#1e2026]"></div>
        </div>

        {/* Simulated OAuth/Quick login button */}
        <div className="space-y-3">
          <button
            onClick={handleQuickLogin}
            type="button"
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-slate-200 rounded text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors dark:border-[#1e2026] dark:bg-[#101116] dark:text-slate-450 dark:hover:bg-[#101116]"
          >
            <Shield className="h-4 w-4 text-slate-400" />
            <span>Simulate Google Single Sign-On (SSO)</span>
          </button>

          <div className="rounded bg-slate-50 p-3 flex items-start space-x-2 text-[10px] text-slate-400 dark:bg-[#101116]/80 leading-normal">
            <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5 animate-pulse" />
            <p>
              <strong>Authentication Architecture Node:</strong> Ready to expand with direct Firebase Authentication rules, allowing secure, production-grade federated Google Sign-In or multi-factor candidate login flows.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
