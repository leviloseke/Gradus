import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from './Icon';

class Boundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <Icon name="exclamation-triangle" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            An unexpected error occurred. Reloading usually fixes it.
          </p>
          <details className="mt-3 text-left text-xs text-gray-400 dark:text-gray-500">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </details>
          <div className="mt-5 flex justify-center gap-2">
            <a href="/" className="btn-secondary">Back to dashboard</a>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// Key the boundary off the route so navigating away clears a caught error.
export default function ErrorBoundary({ children }) {
  const location = useLocation();
  return <Boundary key={location.pathname}>{children}</Boundary>;
}
