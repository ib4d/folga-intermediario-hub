export default function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="hero-section page-header-shell">
      <div className="page-header-copy">
        {eyebrow && (
          <div className="page-header-eyebrow">
            {icon}
            {eyebrow}
          </div>
        )}
        <h1 className="page-header-title">{title}</h1>
        {description && (
          <p className="page-header-description">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="page-header-actions">
          {actions}
        </div>
      )}
    </header>
  );
}
