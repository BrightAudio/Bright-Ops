"use client";

type WidgetCardProps = {
  title: string;
  children: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function WidgetCard({
  title,
  children,
  icon,
  actions,
  className,
  contentClassName,
}: WidgetCardProps) {
  return (
    <section className={`widget-card${className ? ` ${className}` : ""}`}>
      <header className="widget-header">
        <div className="widget-title">
          {icon && <i className={`${icon}`} aria-hidden="true"></i>}
          <span>{title}</span>
        </div>
        {actions && <div className="widget-actions">{actions}</div>}
      </header>
      <div className={`widget-content${contentClassName ? ` ${contentClassName}` : ""}`}>{children}</div>
    </section>
  );
}
