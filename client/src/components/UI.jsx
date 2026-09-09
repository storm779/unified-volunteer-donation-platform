import { ArrowRight, HeartHandshake, LoaderCircle, AlertCircle, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Button({ to, children, className = '', variant = 'primary', ...props }) {
  return to ? (
    <Link to={to} className={`button ${variant} ${className}`} {...props}>
      {children}
    </Link>
  ) : (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function EmptyState({ title = 'Nothing here yet', description, children }) {
  return (
    <div className="empty-state">
      <Inbox size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{status}</span>;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={26} />
      <span>Gathering good things…</span>
    </div>
  );
}
export function ErrorState({ error, message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={24} />
      <p>{error || message || 'Unable to load this page.'}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function StatCard({ icon: Icon = HeartHandshake, label, value, detail }) {
  return (
    <div className="stat-card">
      <Icon size={22} />
      <strong>{value}</strong>
      <span>{label}</span>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function TextLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={18} />
    </Link>
  );
}
