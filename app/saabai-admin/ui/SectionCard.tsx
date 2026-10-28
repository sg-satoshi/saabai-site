import type { ComponentType, ReactNode } from "react";

/** Admin section card: header band (optional icon tile, 18px heading, badge, description, actions) and body. */
export function SectionCard({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className = "",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ "aria-hidden"?: boolean | "true" | "false" }>;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`au-card ${className}`.trim()}>
      <div className="au-card-hd">
        <div className="au-card-hd-l">
          {Icon ? (
            <div className="au-ico">
              <Icon aria-hidden="true" />
            </div>
          ) : null}
          <div style={{ minWidth: 0 }}>
            <h2 className="au-card-h">
              {title}
              {badge}
            </h2>
            {description ? <p className="au-card-desc">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="au-actions">{actions}</div> : null}
      </div>
      {children !== undefined && children !== null ? <div className="au-card-bd">{children}</div> : null}
    </section>
  );
}
