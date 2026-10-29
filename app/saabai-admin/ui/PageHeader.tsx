import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Admin page title row: optional back link, 28px title, meta line, actions on the right. */
export function PageHeader({
  title,
  meta,
  back,
  actions,
}: {
  title: ReactNode;
  meta?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div>
      {back ? (
        <Link href={back.href} className="au-crumb">
          <ArrowLeft aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="au-ph">
        <div className="au-ph-text">
          <h1 className="au-title">{title}</h1>
          {meta ? <div className="au-meta">{meta}</div> : null}
        </div>
        {actions ? <div className="au-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
