/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from '../firebase';
import { Sparkles, Shield, Mail, Key, User, Phone, Check, ShieldAlert } from 'lucide-react';

type AuthMethod = 'email' | 'google' | 'phone';

export const Login: React.FC = () => {
  const { loginWithEmail, signUpWithEmail, loginWithGoogle } = useApp();
  
  // Selection state
  const [method, setMethod] = useState<AuthMethod>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email state
  const [email, setEmail] = useState('mananintodia04321@gmail.com');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Candidate Candidate');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'send' | 'verify'>('send');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Clean error when swapping tab
  useEffect(() => {
    setError('');
  }, [method, isSignUp]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(e.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Google Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          }
        });
      }
    } catch (e: any) {
      console.error("Recaptcha initialization error:", e);
      setError(e.message || 'Failed to initialize security captcha.');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setPhoneStep('verify');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to send SMS. Ensure number includes country code (e.g. +1234567890).');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!confirmationResult) {
        throw new Error('Verification session expired. Please start over.');
      }
      await confirmationResult.confirm(otp);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Invalid code entered. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 dark:bg-[#07080a] animate-fade-in">
      <div className="w-full max-w-sm space-y-8 bg-white p-8 rounded border border-slate-200 dark:bg-[#101116] dark:border-[#1e2026] shadow-xl relative overflow-hidden">
        
        {/* Invisible ReCaptcha Container required by Firebase */}
        <div id="recaptcha-container"></div>

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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 dark:border-[#1e2026] text-xs font-medium">
          <button
            onClick={() => setMethod('email')}
            className={`flex-1 pb-2 border-b-2 text-center transition-all ${
              method === 'email'
                ? 'border-slate-900 text-slate-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setMethod('google')}
            className={`flex-1 pb-2 border-b-2 text-center transition-all ${
              method === 'google'
                ? 'border-slate-900 text-slate-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => setMethod('phone')}
            className={`flex-1 pb-2 border-b-2 text-center transition-all ${
              method === 'phone'
                ? 'border-slate-900 text-slate-950 dark:border-white dark:text-white'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            Phone
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-start space-x-2 text-[11px] text-red-655 p-3 rounded bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/50">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email & Password Flow */}
        {method === 'email' && (
          <form className="space-y-4 mt-4" onSubmit={handleEmailAuth}>
            <div className="space-y-3">
              {isSignUp && (
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
                      className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-450 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

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
                    className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-450 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                    placeholder="e.g. candidate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password-input" className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="mt-1.5 relative rounded">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password-input"
                    type="password"
                    required
                    className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-450 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-hidden dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
            >
              {loading ? 'Authenticating...' : isSignUp ? 'Create Prep Account' : 'Authenticate Portal'}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[10px] text-slate-450 dark:text-slate-500 hover:underline"
              >
                {isSignUp ? 'Already registered? Sign In' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        )}

        {/* Google Sign-in Flow */}
        {method === 'google' && (
          <div className="space-y-4 py-4">
            <p className="text-[11px] text-slate-400 text-center leading-normal">
              Sign in securely via Google. This links directly to your CFA Operating OS user profile.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-slate-200 rounded text-xs font-semibold text-slate-650 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-colors dark:border-[#1e2026] dark:bg-[#101116] dark:text-slate-350 dark:hover:bg-[#15161d]"
            >
              {/* Premium Google G SVG Logo */}
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.57 15.02 1 12 1 7.24 1 3.21 3.73 1.25 7.72l3.85 2.99C6.01 7.42 8.78 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.45c-.28 1.48-1.11 2.73-2.37 3.58l3.69 2.87c2.16-1.99 3.42-4.92 3.42-8.55z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.1 10.71c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.25 7.2C.45 8.79 0 10.58 0 12.5s.45 3.71 1.25 5.3l3.85-2.99c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.9 1.09-3.22 0-5.99-2.38-6.96-5.67L1.56 15.6C3.52 19.59 7.55 22.27 12 23z"
                />
              </svg>
              <span>{loading ? 'Connecting Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        )}

        {/* Phone / OTP Flow */}
        {method === 'phone' && (
          <div className="space-y-4 mt-4">
            {phoneStep === 'send' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="phone-input" className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Phone number</label>
                  <div className="mt-1.5 relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="phone-input"
                      type="tel"
                      required
                      className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-450 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                      placeholder="e.g. +16505550199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                    Format: +[CountryCode][Number]. You will receive an SMS code.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-hidden dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
                >
                  {loading ? 'Sending SMS...' : 'Send Verification OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp-input" className="block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">SMS Verification Code</label>
                  <div className="mt-1.5 relative rounded">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Check className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="otp-input"
                      type="text"
                      required
                      className="w-full rounded border border-slate-200 pl-9 pr-3 py-2 text-xs bg-transparent text-slate-850 outline-hidden focus:border-slate-450 focus:ring-0 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPhoneStep('send')}
                    className="flex-1 py-2 px-3 border border-slate-200 rounded text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-105 dark:border-[#1e2026] dark:bg-[#101116] dark:text-slate-400"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-2 py-2 px-4 border border-transparent rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
                  >
                    {loading ? 'Verifying OTP...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Info footer */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-105 dark:border-[#1e2026]"></div>
          <span className="flex-shrink mx-4 text-[9px] font-mono text-slate-400 uppercase">Secure Portal Connection</span>
          <div className="flex-grow border-t border-slate-105 dark:border-[#1e2026]"></div>
        </div>

        <div className="rounded bg-slate-50 p-3 flex items-start space-x-2 text-[10px] text-slate-400 dark:bg-[#101116]/80 leading-normal">
          <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong>Firebase Guard Active:</strong> Your connection is secured using federated Firebase Authentication and Firestore document-level access rules.
          </p>
        </div>

      </div>
    </div>
  );
};
