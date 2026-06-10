import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm !p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 shadow-md">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.75 7.5v9m10.5-9v9M3 10.5v3m18-3v3M6.75 12h10.5" />
          </svg>
        </div>
        <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Gradus</h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Progressive overload, automated.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Username or email</label>
            <input className="input" value={username}
                   onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password}
                   onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No account?{' '}
          <Link to="/register" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
