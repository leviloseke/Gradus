import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Programs = lazy(() => import('./pages/Programs'));
const ProgramDetail = lazy(() => import('./pages/ProgramDetail'));
const Exercises = lazy(() => import('./pages/Exercises'));
const WorkoutSession = lazy(() => import('./pages/WorkoutSession'));
const History = lazy(() => import('./pages/History'));
const SessionDetail = lazy(() => import('./pages/SessionDetail'));
const ExerciseStats = lazy(() => import('./pages/ExerciseStats'));
const BodyWeight = lazy(() => import('./pages/BodyWeight'));
const Settings = lazy(() => import('./pages/Settings'));

function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stroke border-t-primary dark:border-dark-3 dark:border-t-primary-400" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <PageSpinner />;

  if (!user) {
    return (
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageSpinner />}>
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
    </Suspense>
  );
}
