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

  const gridColor = dark ? '#3E3E3A' : '#E8E6DC';
  const tickColor = dark ? '#9B9A93' : '#87867F';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} />
        <YAxis tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            backgroundColor: dark ? '#30302E' : '#ffffff',
            border: `1px solid ${dark ? '#3E3E3A' : '#E8E6DC'}`,
            borderRadius: '0.75rem',
            color: dark ? '#E8E6DC' : '#21201C',
            fontSize: 13,
          }}
          labelStyle={{ color: dark ? '#9B9A93' : '#6B6A63' }}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color || '#D97757'}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: l.color || '#D97757' }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
