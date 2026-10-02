import { Component, type ReactNode, type ErrorInfo } from 'react';
import 'virtual:recovered-aqua-init';
// @ts-ignore
import RecoveredApp from './upstream/src/App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ImportedGameErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Aippy] Error caught in recovered AquaLume application:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center select-none">
          <div className="text-5xl mb-4">🐠</div>
          <h2 className="text-xl font-bold mb-2">AquaLume Encountered an Issue</h2>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            {this.state.error?.message || 'Failed to render aquarium simulation.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold active:scale-95 transition-transform shadow-lg cursor-pointer"
          >
            Restart Aquarium
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ImportedAippyGame() {
  const AppToRender =
    RecoveredApp && typeof RecoveredApp === 'object' && 'default' in RecoveredApp
      ? (RecoveredApp as { default: React.ComponentType }).default
      : (RecoveredApp as React.ComponentType | null);

  return (
    <div className="w-full h-full overflow-hidden bg-black relative select-none">
      <ImportedGameErrorBoundary>
        {AppToRender ? (
          <AppToRender />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
            AquaLume source recovery is incomplete; the recovered app could not be mounted.
          </div>
        )}
      </ImportedGameErrorBoundary>
    </div>
  );
}