import ExpText from "./ExpText";

/** Homepage hero headline (slot home.hero.headline). The control is the live headline. */
export default function HeroHeadline() {
  return (
    <ExpText slot="home.hero.headline">
      {(v) => (
        <h1 style={{ marginTop: 28 }} {...v.attrs}>
          {v.text} <br />
          <span className="grad">{v.emphasis}</span>
        </h1>
      )}
    </ExpText>
  );
}
