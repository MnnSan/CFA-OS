import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register AI providers at startup
import './services/providers/GoogleGeminiProvider';
import './services/providers/AnthropicClaudeProvider';
import './services/providers/LocalOllamaProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
