import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { curriculumBootstrapService } from './services/CurriculumBootstrapService';

// Register AI providers at startup
import './services/providers/GoogleGeminiProvider';
import './services/providers/AnthropicClaudeProvider';
import './services/providers/LocalOllamaProvider';
import './services/MissionAuditService';

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#07080a]">
    <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-900 font-mono text-xs font-bold text-white animate-pulse dark:bg-white dark:text-[#07080a]">
      III
    </div>
    <p className="mt-4 text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
      Initializing Curriculum Node...
    </p>
  </div>
);

curriculumBootstrapService.bootstrap().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
