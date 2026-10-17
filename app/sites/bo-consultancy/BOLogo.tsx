/** BO Consulting wordmark: icon mark plus live text, so the name is always "BO Consulting". */
export function BOLogo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`bo-logo${dark ? " bo-logo-dark" : ""}`}>
      <img src={dark ? "/sites/bo-consultancy/mark-dark.png" : "/sites/bo-consultancy/mark-light.png"} width={44} height={44} alt="" />
      <span>BO Consulting</span>
    </span>
  );
}
