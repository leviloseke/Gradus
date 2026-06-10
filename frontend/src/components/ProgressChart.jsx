import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

export default function ProgressChart({ data, xKey, lines, height = 280 }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        No data yet
      </div>
    );
  }

  const gridColor = dark ? '#374151' : '#e5e7eb';
  const tickColor = dark ? '#9CA3AF' : '#6b7280';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} />
        <YAxis tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            backgroundColor: dark ? '#1F2A37' : '#ffffff',
            border: `1px solid ${dark ? '#374151' : '#DFE4EA'}`,
            borderRadius: '0.75rem',
            color: dark ? '#E5E7EB' : '#111928',
            fontSize: 13,
          }}
          labelStyle={{ color: dark ? '#9CA3AF' : '#637381' }}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color || '#3758F9'}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: l.color || '#3758F9' }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
