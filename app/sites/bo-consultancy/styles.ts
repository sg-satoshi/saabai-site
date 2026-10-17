// Scoped styles for the BO Consulting site (concept D). All classes are prefixed bo-.
export const BO_CSS = `
:root{--bo-navy:#123B5D;--bo-deep:#0C2A43;--bo-orange:#F58220;--bo-orange-text:#C55E00;--bo-paper:#F4F1EA;--bo-muted:#41576c;--bo-muted2:#5a6b7c}
html{background:#0C2A43;overflow-x:hidden;scroll-behavior:smooth}
body{overflow-x:hidden;-webkit-font-smoothing:antialiased;background:var(--bo-paper)}
.bo-root{font-family:'Sora',system-ui,sans-serif;color:var(--bo-navy);background:var(--bo-paper)}
.bo-root *{box-sizing:border-box}
.bo-root a{color:inherit;text-decoration:none}
.bo-root img{display:block;max-width:100%}
.bo-root h1,.bo-root h2,.bo-root h3,.bo-root h4{font-family:'Sora',system-ui,sans-serif;margin:0}
.bo-root p{margin:0}
.bo-root :focus-visible{outline:3px solid #F58220;outline-offset:3px;border-radius:6px}
.bo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* logo */
.bo-logo{display:inline-flex;align-items:center;gap:12px;color:#fff;font-weight:800;letter-spacing:-.02em;line-height:1}
.bo-logo img{height:44px;width:44px}
.bo-logo span{font-size:21px}
.bo-logo.bo-logo-dark{color:var(--bo-navy)}
/* nav */
.bo-nav{position:absolute;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;gap:30px;padding:20px 72px;color:#fff}
.bo-nav.bo-fixed{position:fixed;background:rgba(12,42,67,.97);box-shadow:0 6px 28px rgba(12,42,67,.35);padding-top:12px;padding-bottom:12px}
.bo-links{display:flex;gap:28px;font-size:14px;font-weight:500;margin-left:auto;color:#e3ebf3}
.bo-links a{padding:10px 0}
.bo-links a:hover{color:#fff}
.bo-cta{background:var(--bo-orange);color:#fff!important;padding:13px 24px;font-weight:700;font-size:14px;border-radius:10px;min-height:44px;display:inline-flex;align-items:center}
.bo-burger{display:none;margin-left:auto;background:none;border:0;color:#fff;width:44px;height:44px;cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:5px}
.bo-burger i{display:block;width:24px;height:2.5px;background:currentColor;transition:transform .2s}
.bo-menu{display:none;position:fixed;top:62px;left:0;right:0;z-index:39;background:var(--bo-deep);padding:8px 18px 20px;box-shadow:0 20px 40px rgba(0,0,0,.4)}
.bo-menu.bo-open{display:block}
.bo-menu a{display:block;color:#e3ebf3;padding:14px 0;font-size:16px;font-weight:500;border-bottom:1px solid rgba(255,255,255,.08)}
.bo-menu a.bo-cta{margin-top:14px;justify-content:center;text-align:center;border:0;padding:14px}
/* hero */
.bo-hero{position:relative;min-height:900px;background:#0C2A43;display:flex;flex-direction:column;color:#fff;overflow:hidden}
.bo-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:70% center}
.bo-hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,42,67,.95) 0%,rgba(12,42,67,.6) 55%,rgba(12,42,67,.25) 100%)}
.bo-hb{position:relative;z-index:2;flex:1;display:grid;grid-template-columns:1fr 380px;gap:60px;align-items:center;padding:130px 72px 80px}
.bo-tag{display:inline-block;border:1px solid #F58220;color:#F58220;padding:7px 14px;border-radius:99px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700}
.bo-h1{font-size:88px;font-weight:800;line-height:.97;letter-spacing:-.045em;margin:26px 0 22px!important}
.bo-h1 span{color:var(--bo-orange)}
.bo-hb p.bo-lead{font-size:19px;max-width:540px;line-height:1.55;color:#d6e0ea}
.bo-doors{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:40px;max-width:760px}
.bo-door{border-radius:20px;padding:24px 26px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:21px;min-height:44px;cursor:pointer;border:0;font-family:inherit;text-align:left;color:#fff}
.bo-door small{display:block;font-weight:500;font-size:14px;margin-top:6px;opacity:.92}
.bo-d1{background:var(--bo-orange)}
.bo-d2{background:rgba(12,42,67,.55);border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(6px)}
.bo-door:hover{filter:brightness(1.06)}
.bo-brief{background:#fff;color:var(--bo-navy);border-radius:22px;padding:26px;box-shadow:0 30px 60px -20px rgba(0,0,0,.55)}
.bo-brief h2{font-size:19px;font-weight:800;margin-bottom:4px}
.bo-brief .bo-sub{font-size:14px;color:var(--bo-muted2);margin-bottom:16px}
.bo-field{display:block;margin-bottom:10px}
.bo-field>span{display:block;font-size:12px;font-weight:700;color:var(--bo-muted);margin-bottom:5px;letter-spacing:.02em}
.bo-field input,.bo-field select,.bo-field textarea{width:100%;border:1px solid #cfd6de;border-radius:10px;padding:12px 14px;font-size:16px;font-family:inherit;color:var(--bo-navy);background:#fff;min-height:46px}
.bo-field textarea{resize:vertical;min-height:110px}
.bo-field input:focus,.bo-field select:focus,.bo-field textarea:focus{outline:2px solid #F58220;border-color:#F58220}
.bo-go{width:100%;background:var(--bo-orange);color:#fff;border:0;border-radius:10px;padding:15px;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer;min-height:48px}
.bo-go:disabled{opacity:.7;cursor:default}
.bo-err{color:#b3261e;font-size:13px;margin:0 0 10px}
.bo-ok{background:#F4F1EA;border-radius:16px;padding:28px;text-align:center}
.bo-ok h3{font-size:19px;font-weight:800;margin-bottom:6px}
.bo-ok p{font-size:14px;color:var(--bo-muted)}
.bo-mail{font-size:13px;color:var(--bo-muted2);margin-top:12px;text-align:center}
.bo-mail a{color:var(--bo-orange-text);font-weight:700;text-decoration:underline}
/* strip */
.bo-strip{display:flex;background:var(--bo-orange);color:#fff}
.bo-strip div{flex:1;padding:22px 28px;border-right:1px solid rgba(255,255,255,.35)}
.bo-strip div:first-child{padding-left:72px}
.bo-strip div:last-child{border-right:0}
.bo-strip b{font-size:30px;font-weight:800;display:block;letter-spacing:-.02em}
.bo-strip span{font-size:14px;font-weight:600}
/* sections */
.bo-sec{padding:96px 72px 0}
.bo-sec h2{font-size:52px;font-weight:800;letter-spacing:-.035em;line-height:1.05;max-width:760px;margin:16px 0 14px}
.bo-sec>p.bo-intro{font-size:17px;color:var(--bo-muted);max-width:600px;line-height:1.6}
.bo-eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--bo-orange-text);display:flex;gap:12px;align-items:center}
.bo-eyebrow:before{content:"";width:36px;height:3px;background:var(--bo-orange)}
.bo-about{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:8px}
.bo-about p{font-size:17px;line-height:1.7;color:var(--bo-muted);margin-bottom:18px}
.bo-led{display:grid;grid-template-columns:1fr 1fr;column-gap:56px;margin-top:44px}
.bo-lr{display:grid;grid-template-columns:64px 1fr 30px;align-items:center;gap:18px;border-top:1px solid #1d4468;padding:22px 0}
.bo-lr svg{width:44px;height:44px;color:var(--bo-navy)}
.bo-lr b{font-size:20px;display:block;margin-bottom:5px}
.bo-lr span{font-size:14px;color:var(--bo-muted2);line-height:1.5}
.bo-lr i{color:var(--bo-orange);font-style:normal;font-size:22px}
.bo-sv{display:grid;grid-template-columns:.9fr 1.1fr;gap:56px;margin-top:44px;align-items:start}
.bo-svimg{height:560px;border-radius:28px 28px 120px 28px;overflow:hidden}
.bo-svimg img{width:100%;height:100%;object-fit:cover}
.bo-r{border-top:1px solid #1d4468;padding:20px 0;display:grid;grid-template-columns:50px 1fr;gap:14px}
.bo-r em{font-style:normal;color:var(--bo-orange-text);font-weight:800}
.bo-r b{font-size:20px;display:block;margin-bottom:4px}
.bo-r span{font-size:14px;color:var(--bo-muted2);line-height:1.5}
.bo-route{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:56px}
.bo-route:before{content:"";position:absolute;left:0;right:0;top:46px;border-top:3px dashed #F58220}
.bo-rs{position:relative}
.bo-rs .bo-n{font-size:96px;font-weight:800;line-height:1;color:var(--bo-navy);background:var(--bo-paper);display:inline-block;padding-right:18px;position:relative}
.bo-rs b{display:block;font-size:24px;margin:14px 0 8px}
.bo-rs span{font-size:15px;color:var(--bo-muted);line-height:1.6;display:block;max-width:340px}
/* contact */
.bo-contact{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:8px;align-items:start}
.bo-contact h2{margin-top:16px}
.bo-facts{margin-top:32px;display:grid;gap:20px}
.bo-facts small{display:block;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--bo-muted2);margin-bottom:4px}
.bo-facts b,.bo-facts a{font-size:17px;font-weight:700}
.bo-facts a{color:var(--bo-orange-text);text-decoration:underline}
.bo-card{background:#fff;border-radius:22px;padding:28px;box-shadow:0 18px 40px -22px rgba(12,42,67,.35)}
.bo-tabs{display:flex;background:var(--bo-paper);border-radius:12px;padding:4px;margin-bottom:20px}
.bo-tabs button{flex:1;padding:12px 6px;border:0;border-radius:9px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;background:transparent;color:var(--bo-muted);min-height:44px}
.bo-tabs button[aria-pressed=true]{background:var(--bo-navy);color:#fff}
/* band + footer */
.bo-band{margin:96px 72px 72px;background:var(--bo-navy);color:#fff;border-radius:32px;padding:60px;display:flex;justify-content:space-between;align-items:center;gap:30px;position:relative;overflow:hidden}
.bo-band h2{font-size:46px;font-weight:800;letter-spacing:-.03em;max-width:620px;line-height:1.05}
.bo-band p{color:#c9d6e2;margin-top:12px;font-size:17px}
.bo-band:after{content:"";position:absolute;right:-90px;top:50%;margin-top:-130px;width:260px;height:260px;border-radius:50%;border:30px solid #F58220;opacity:.9;pointer-events:none}
.bo-band a.bo-btn{position:relative;z-index:2;margin-right:120px}
.bo-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--bo-orange);color:#fff!important;padding:16px 28px;border-radius:10px;font-weight:700;font-size:15px;min-height:48px;white-space:nowrap}
.bo-footer{background:var(--bo-deep);color:#c9d6e2;padding:56px 72px 28px;font-size:14px}
.bo-fg{display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr;gap:40px}
.bo-footer h4{color:#fff;font-size:13px;margin-bottom:14px;letter-spacing:.1em;text-transform:uppercase}
.bo-footer a,.bo-footer p{display:block;margin-bottom:9px}
.bo-footer .bo-fl{display:inline-flex;margin-bottom:14px}
.bo-footer a:hover{color:#fff}
.bo-copy{margin-top:36px;padding-top:20px;border-top:1px solid rgba(255,255,255,.15);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px;color:#9fb3c6}
.bo-copy a{display:inline;margin:0 0 0 14px}
.bo-sticky{display:none}
/* reveal */
html.bo-js [data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)}
html.bo-js [data-reveal].bo-visible{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}html.bo-js [data-reveal]{opacity:1;transform:none;transition:none}}
@media(max-width:1100px){.bo-h1{font-size:68px}.bo-hb{grid-template-columns:1fr 340px;gap:36px}.bo-sec,.bo-nav,.bo-hb{padding-left:40px;padding-right:40px}.bo-band{margin-left:40px;margin-right:40px}.bo-footer{padding-left:40px;padding-right:40px}.bo-strip div:first-child{padding-left:40px}.bo-links{gap:18px}}
@media(max-width:900px){.bo-about{gap:0}.bo-hb{grid-template-columns:1fr}.bo-about,.bo-contact,.bo-sv{grid-template-columns:1fr}.bo-svimg{height:360px}}
@media(max-width:700px){
  .bo-nav{padding:12px 18px}
  .bo-links,.bo-nav>.bo-cta{display:none}
  .bo-burger{display:flex}
  .bo-logo img{height:38px;width:38px}.bo-logo span{font-size:18px}
  .bo-hero{min-height:0;background:#0C2A43}
  .bo-hero-img{height:54%;width:100%;object-position:82% 0;inset:0 0 auto 0}
  .bo-hero-shade{background:linear-gradient(180deg,rgba(12,42,67,.15) 0%,rgba(12,42,67,.4) 22%,rgba(12,42,67,.96) 52%)}
  .bo-hb{display:block;padding:150px 18px 24px}
  .bo-h1{font-size:46px;margin:16px 0 12px!important}
  .bo-hb p.bo-lead{font-size:16px}
  .bo-doors{grid-template-columns:1fr;margin-top:22px;gap:10px}
  .bo-door{padding:18px 20px;font-size:18px}
  .bo-brief{margin-top:20px;padding:20px}
  .bo-strip{display:grid;grid-template-columns:1fr 1fr}
  .bo-strip div{padding:16px 18px!important;border-bottom:1px solid rgba(255,255,255,.35)}
  .bo-strip div:nth-child(2n){border-right:0}
  .bo-strip b{font-size:24px}
  .bo-sec{padding:60px 18px 0}
  .bo-sec h2{font-size:34px}
  .bo-led{grid-template-columns:1fr}
  .bo-lr{grid-template-columns:52px 1fr 24px;padding:18px 0}
  .bo-svimg{height:280px;border-radius:22px 22px 80px 22px}
  .bo-route{grid-template-columns:1fr;gap:28px}
  .bo-route:before{display:none}
  .bo-rs .bo-n{font-size:64px}
  .bo-card{padding:20px}
  .bo-band{margin:60px 18px 28px;padding:36px 24px;flex-direction:column;align-items:flex-start;border-radius:24px}
  .bo-band h2{font-size:32px}
  .bo-band a.bo-btn{margin-right:0}
  .bo-band:after{width:160px;height:160px;border-width:20px;right:-70px;top:auto;bottom:-70px;margin:0}
  .bo-footer{padding:36px 18px 110px}
  .bo-fg{grid-template-columns:1fr 1fr;gap:24px}
  .bo-fg>div:first-child{grid-column:1/3}
  .bo-sticky{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;padding:10px 14px calc(10px + env(safe-area-inset-bottom));gap:10px;box-shadow:0 -6px 20px rgba(12,42,67,.25);transition:transform .25s}
  .bo-sticky.bo-hide{transform:translateY(110%)}
  .bo-sticky button{flex:1;text-align:center;padding:14px 6px;border-radius:10px;font-weight:700;font-size:14px;font-family:inherit;cursor:pointer;min-height:48px}
  .bo-sticky .bo-s1{background:var(--bo-orange);color:#fff;border:0}
  .bo-sticky .bo-s2{background:#fff;border:2px solid var(--bo-navy);color:var(--bo-navy)}
  #bo-widget-root{bottom:92px!important;right:14px!important}
  #bo-launch{width:50px!important;height:50px!important}
}
`;
