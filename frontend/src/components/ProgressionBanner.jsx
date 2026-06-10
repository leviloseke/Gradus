const styles = {
  increase:
    'bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300',
  backoff:
    'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  hold: 'bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-300',
  start: 'bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-300',
};

const prefix = {
  increase: '🎉 ',
  backoff: '↘️ ',
};

export default function ProgressionBanner({ suggestion }) {
  if (!suggestion) return null;
  const action = suggestion.action || (suggestion.triggered ? 'increase' : 'hold');
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${styles[action] || styles.hold}`}>
      {prefix[action] || ''}
      {suggestion.reason}
    </div>
  );
}
