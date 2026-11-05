import type { CSSProperties } from "react";
import {
  directionsUrl,
  getMapsProfile,
  mapsEmbedKey,
  resolveEmbedSrc,
  writeReviewUrl,
  type MapsProfile,
} from "../../lib/maps";

type Props = {
  slug: string;
  /** Optional override when the caller already has the profile. */
  profile?: MapsProfile;
  className?: string;
  /** Hide the iframe even for shopfront (e.g. when keyless fallback undesired). */
  hideMap?: boolean;
};

/**
 * Lazy Maps embed (shopfront only) plus Get directions / Review us buttons.
 * Service-area profiles render review/GBP actions only when a placeId or gbpUrl exists.
 */
export default function MapsPack({ slug, profile: override, className = "", hideMap = false }: Props) {
  const profile = override ?? getMapsProfile(slug);
  if (!profile || profile.excluded) return null;

  const key = mapsEmbedKey();
  const embed = !hideMap ? resolveEmbedSrc(profile, key) : null;
  const directions = directionsUrl(profile);
  const review = profile.placeId ? writeReviewUrl(profile.placeId) : null;
  const gbp = profile.gbpUrl || null;

  if (!embed && !directions && !review && !gbp) return null;

  return (
    <section
      className={`maps-pack ${className}`.trim()}
      aria-label={`${profile.name} on Google Maps`}
      data-maps-slug={profile.slug}
      data-maps-mode={profile.mode}
      data-maps-embed={key ? "api" : embed ? "keyless" : "off"}
    >
      {embed ? (
        <div className="maps-pack-frame" style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 12, overflow: "hidden", background: "#0f172a" }}>
          <iframe
            title={`${profile.name} location map`}
            src={embed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
      ) : null}
      <div className="maps-pack-actions" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: embed ? 12 : 0 }}>
        {directions ? (
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="maps-pack-btn"
            style={btnStyle}
          >
            Get directions
          </a>
        ) : null}
        {review ? (
          <a
            href={review}
            target="_blank"
            rel="noopener noreferrer"
            className="maps-pack-btn"
            style={btnStyle}
          >
            Review us on Google
          </a>
        ) : null}
        {!review && gbp ? (
          <a
            href={gbp}
            target="_blank"
            rel="noopener noreferrer"
            className="maps-pack-btn"
            style={btnStyle}
          >
            See Google reviews
          </a>
        ) : null}
      </div>
      {!key && embed ? (
        <p style={{ margin: "8px 0 0", fontSize: 11, opacity: 0.55 }}>
          Map uses a keyless Google embed. Add NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY for the official Maps Embed API.
        </p>
      ) : null}
    </section>
  );
}

const btnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  background: "#1a73e8",
  color: "#fff",
};
