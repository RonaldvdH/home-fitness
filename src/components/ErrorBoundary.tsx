import { Component, type ComponentChildren } from 'preact';
import { exportRawStorageBackup } from '../services/backup';
import { clearAppStorage } from '../services/storage';

export interface ErrorBoundaryProps {
  children: ComponentChildren;
  /** Optional lightweight fallback (e.g., 2D SVG stage when 3D chunk or WebGL crashes). */
  fallback?: ComponentChildren;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  confirmReset: boolean;
  backupStatus: 'idle' | 'exported' | 'empty';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    error: null,
    confirmReset: false,
    backupStatus: 'idle',
  };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleExportBackup = (): void => {
    const exported = exportRawStorageBackup();
    this.setState({ backupStatus: exported ? 'exported' : 'empty' });
  };

  private handleResetData = (): void => {
    if (!this.state.confirmReset) {
      this.setState({ confirmReset: true });
      return;
    }
    clearAppStorage();
    window.location.reload();
  };

  override render() {
    const { error, confirmReset, backupStatus } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    return (
      <div
        role="alert"
        data-testid="root-error-boundary"
        class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4"
      >
        <div class="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
          <div class="space-y-1">
            <p class="text-xs font-bold uppercase tracking-wider text-rose-400">Unexpected Error</p>
            <h1 class="text-xl font-extrabold text-white">Home Fitness Studio hit a snag</h1>
            <p class="text-xs text-slate-400 leading-relaxed">
              Your workout routines and history are stored locally on this device. Try reloading
              first, or download a JSON backup before resetting.
            </p>
          </div>

          <pre class="text-[11px] font-mono text-rose-300 bg-slate-950/90 border border-slate-800 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {error.message || 'Unknown runtime error'}
          </pre>

          <div class="flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              class="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              Reload App
            </button>

            <button
              type="button"
              onClick={this.handleExportBackup}
              class="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition"
            >
              {backupStatus === 'exported'
                ? 'Backup JSON Downloaded'
                : backupStatus === 'empty'
                  ? 'No Local Data Found'
                  : 'Download Backup JSON'}
            </button>

            <button
              type="button"
              onClick={this.handleResetData}
              class={`w-full py-2 px-4 rounded-xl border font-semibold text-xs transition ${
                confirmReset
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-rose-300'
              }`}
            >
              {confirmReset ? 'Confirm Reset Local Data & Reload' : 'Reset Local Data'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
