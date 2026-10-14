import { POWERED_BY_TEXT, poweredByUrl } from "../../lib/client-site";

/** Small footer credit for factory client sites. Inherits the footer's colour. */
export default function PoweredBySaabai({
  site,
  className,
  style,
}: {
  site: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={poweredByUrl(site)}
      target="_blank"
      rel="noopener"
      className={className}
      style={{ color: "inherit", textDecoration: "none", ...style }}
      data-saabai-credit
    >
      {POWERED_BY_TEXT}
    </a>
  );
}
