import { render } from 'preact';
import './styles/main.css';
import { App } from './components/App';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootEl = document.getElementById('app');
if (rootEl) {
  render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
    rootEl,
  );
}
