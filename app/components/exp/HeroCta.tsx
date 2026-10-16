import ExpText from "./ExpText";

/** Homepage hero primary button (slot home.hero.cta). The control is the live label. */
export default function HeroCta() {
  return (
    <ExpText slot="home.hero.cta">
      {(v) => (
        <a className="btn" href="/score" data-exp-event="cta_click" {...v.attrs}>{`${v.text} →`}</a>
      )}
    </ExpText>
  );
}
