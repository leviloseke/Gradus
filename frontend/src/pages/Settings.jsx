import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [progression, setProgression] = useState([]);

  useEffect(() => {
    api.get('/stats/progression').then(setProgression).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Profile</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Username: {user.username}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">Email: {user.email}</p>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Data export</h2>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export/csv" className="btn-secondary" download>
            Export workouts (CSV)
          </a>
          <a href="/api/export/all" className="btn-secondary" download>
            Export all data (JSON)
          </a>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Apple Health</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Integration coming later — the API and schema are ready for it.
        </p>
        <button className="btn-secondary mt-2" disabled>Connect (not yet available)</button>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">Progression overview</h2>
        {progression.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Log a few sessions to see progression.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <th className="py-1">Exercise</th>
                <th>Sessions</th>
                <th>First</th>
                <th>Latest</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-3">
              {progression.map((p) => (
                <tr key={p.id} className="text-gray-700 dark:text-gray-300">
                  <td className="py-1.5 font-medium">{p.name}</td>
                  <td>{p.session_count}</td>
                  <td>{Number(p.first_weight)}</td>
                  <td>{Number(p.last_weight)}</td>
                  <td className={Number(p.weight_change) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                    {Number(p.weight_change) > 0 ? '+' : ''}{Number(p.weight_change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
