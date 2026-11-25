import { render } from 'preact';
import './styles/main.css';
import { App } from './components/App';

const rootEl = document.getElementById('app');
if (rootEl) {
  render(<App />, rootEl);
}
