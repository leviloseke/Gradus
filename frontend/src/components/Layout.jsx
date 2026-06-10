import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const links = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/programs', label: 'Programs', icon: 'programs' },
  { to: '/exercises', label: 'Exercises', icon: 'exercises' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/body-weight', label: 'Body Weight', icon: 'bodyweight' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button onClick={toggleTheme} title={label} aria-label={label} className="icon-btn">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-stroke bg-white/80 backdrop-blur-lg dark:border-dark-3 dark:bg-dark/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-800 text-white shadow-sm">
              <Icon name="exercises" className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Gradus
            </span>
          </NavLink>

          <nav aria-label="Primary" className="hidden gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-2 dark:hover:text-white'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="text-sm text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <span className="hidden sm:inline">{user.username} · </span>Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:pb-8">
        {children ?? <Outlet />}
      </main>

      {/* Bottom nav for mobile / gym use */}
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stroke bg-white/90 backdrop-blur-lg dark:border-dark-3 dark:bg-dark/90 md:hidden">
        {links.slice(0, 5).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-500'
              }`
            }
          >
            <Icon name={l.icon} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
