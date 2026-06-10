import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import Exercises from './pages/Exercises';
import WorkoutSession from './pages/WorkoutSession';
import History from './pages/History';
import SessionDetail from './pages/SessionDetail';
import ExerciseStats from './pages/ExerciseStats';
import BodyWeight from './pages/BodyWeight';
import Settings from './pages/Settings';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stroke border-t-primary dark:border-dark-3 dark:border-t-primary-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Workout mode is full-screen and distraction-free — no app chrome */}
      <Route path="/workout/:sessionId" element={<WorkoutSession />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/programs/:id" element={<ProgramDetail />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<SessionDetail />} />
        <Route path="/exercises/:id/stats" element={<ExerciseStats />} />
        <Route path="/body-weight" element={<BodyWeight />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
