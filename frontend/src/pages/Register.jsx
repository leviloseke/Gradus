import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form.username, form.email, form.password);
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
        <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create account
        </h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="register-username">Username</label>
            <input id="register-username" className="input" value={form.username} autoComplete="username"
                   onChange={set('username')} required />
          </div>
          <div>
            <label className="label" htmlFor="register-email">Email</label>
            <input id="register-email" className="input" type="email" value={form.email} autoComplete="email"
                   onChange={set('email')} required />
          </div>
          <div>
            <label className="label" htmlFor="register-password">Password (min 8 characters)</label>
            <input id="register-password" className="input" type="password" value={form.password}
                   autoComplete="new-password" onChange={set('password')} minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
