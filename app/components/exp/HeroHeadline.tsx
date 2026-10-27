import ExpText from "./ExpText";
import { qualifyHoursClaim } from "@/lib/exp/seed";

/**
 * Homepage hero headline (slot home.hero.headline). The control is the live headline.
 * Bots, and anyone with no experiment cookie, get this control in the first HTML.
 * A running test can assign another variant in that same server render, so a
 * mobile browser and a bot fetch can show different words. Nothing swaps the
 * heading after hydration. The line break is not hidden on small screens.
 */
export default function HeroHeadline() {
  return (
    <ExpText slot="home.hero.headline">
      {(v) => {
        const shown = qualifyHoursClaim(v.text, v.emphasis);
        return (
        <h1 style={{ marginTop: 28 }} {...v.attrs}>
          {shown.text} <br />
          <span className="grad">{shown.emphasis}</span>
        </h1>
        );
      }}
    </ExpText>
  );
}
