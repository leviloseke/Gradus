import Icon from './Icon';

export default function EmptyState({ icon = 'programs', title, description, action, plain = false }) {
  const content = (
    <>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-dark-3 dark:text-gray-500">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </>
  );
  if (plain) return <div className="py-8 text-center">{content}</div>;
  return <div className="card py-10 text-center">{content}</div>;
}
