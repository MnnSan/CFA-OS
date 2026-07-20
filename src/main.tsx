import {StrictMode, Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { curriculumBootstrapService } from './services/CurriculumBootstrapService';

// Register AI providers at startup
import './services/providers/GoogleGeminiProvider';
import './services/providers/AnthropicClaudeProvider';
import './services/providers/LocalOllamaProvider';
import './services/MissionAuditService';

class RootBoundary extends Component<{children: React.ReactNode}, {hasError: boolean; error: Error | null}> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07080a] p-8">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-xl font-bold">!</span>
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">Something went wrong</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-[#101116] p-3 rounded border border-slate-200 dark:border-slate-800 text-left break-all max-h-32 overflow-auto">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#07080a]">
    <img 
      src="/logo-dynamic.svg" 
      alt="CFA L3 OS Logo" 
      className="h-10 w-10 animate-pulse select-none"
    />
    <p className="mt-4 text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
      Initializing Curriculum Node...
    </p>
  </div>
);

curriculumBootstrapService.bootstrap(false).then(() => {
  root.render(
    <StrictMode>
      <RootBoundary>
        <App />
      </RootBoundary>
    </StrictMode>,
  );
}).catch((err) => {
  console.error('[Boot] Bootstrap failed:', err);
  root.render(
    <StrictMode>
      <RootBoundary>
        <App />
      </RootBoundary>
    </StrictMode>,
  );
});
