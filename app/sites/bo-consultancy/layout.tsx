import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BO Consulting | Blue-Collar Recruitment & Labour Hire Australia",
  description:
    "Australia's specialist blue-collar workforce recruitment partner. Permanent placement, labour hire, and workforce solutions across Construction, Mining, Manufacturing, Transport and more. 1,000+ placements, 95% retention rate.",
  keywords: [
    "blue collar recruitment Australia",
    "labour hire Australia",
    "construction recruitment",
    "mining recruitment",
    "manufacturing recruitment",
    "workforce solutions Australia",
    "permanent recruitment agency",
    "skilled workers Australia",
    "trade recruitment",
    "transport recruitment",
  ],
  authors: [{ name: "BO Consulting" }],
  creator: "BO Consulting",
  publisher: "BO Consulting",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://www.boconsulting.com.au",
    siteName: "BO Consulting",
    title: "BO Consulting | Blue-Collar Recruitment & Labour Hire Australia",
    description:
      "Australia's specialist blue-collar workforce recruitment partner. Connecting businesses with skilled workers across Construction, Mining, Manufacturing, Transport, Civil, Trades, Warehousing and Logistics.",
    images: [
      {
        url: "/sites/bo-consultancy/logo.png",
        width: 813,
        height: 272,
        alt: "BO Consulting – Blue-Collar Recruitment Australia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BO Consulting | Blue-Collar Recruitment & Labour Hire Australia",
    description:
      "Australia's specialist blue-collar workforce recruitment partner. 1,000+ placements, 95% retention rate, 48hr average turnaround.",
    images: ["/sites/bo-consultancy/logo.png"],
  },
  alternates: {
    canonical: "https://www.boconsulting.com.au",
  },
};

export default function BOConsultancyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        html { background: #123B5D; overflow-x: hidden; scroll-behavior: smooth; }
        body { overflow-x: hidden; -webkit-font-smoothing: antialiased; font-feature-settings: "ss01"; }
        h1, h2, h3, h4 { font-family: 'Sora', system-ui, sans-serif; letter-spacing: -0.02em; }
        #bo-nav-desktop { display: none; align-items: center; gap: 32px; }
        #bo-hamburger { display: flex; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; }
        #bo-find-staff-nav { display: none; }
        @media (min-width: 768px) {
          #bo-nav-desktop { display: flex !important; }
          #bo-hamburger { display: none !important; }
          #bo-find-staff-nav { display: inline-flex !important; }
        }
        /* Scroll reveal — progressive enhancement: only hide if JS loaded */
        html.bo-js [data-reveal] { opacity: 0; transform: translateY(28px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        html.bo-js [data-reveal].bo-visible { opacity: 1; transform: translateY(0); }
        html.bo-js [data-reveal][data-delay="1"] { transition-delay: 0.1s; }
        html.bo-js [data-reveal][data-delay="2"] { transition-delay: 0.2s; }
        html.bo-js [data-reveal][data-delay="3"] { transition-delay: 0.3s; }
        html.bo-js [data-reveal][data-delay="4"] { transition-delay: 0.4s; }
        html.bo-js [data-reveal][data-delay="5"] { transition-delay: 0.5s; }
        html.bo-js [data-reveal][data-delay="6"] { transition-delay: 0.6s; }
        html.bo-js [data-reveal][data-delay="7"] { transition-delay: 0.7s; }
        /* Hero entrance */
        @keyframes bo-hero-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .bo-hero-animate { animation: bo-hero-in 0.8s cubic-bezier(0.22,1,0.36,1) both; }
        .bo-hero-delay-1 { animation-delay: 0.15s; }
        .bo-hero-delay-2 { animation-delay: 0.3s; }
        .bo-hero-delay-3 { animation-delay: 0.45s; }
        .bo-hero-delay-4 { animation-delay: 0.6s; }
        .bo-hero-delay-5 { animation-delay: 0.75s; }
        /* Nav scroll */
        #bo-nav { transition: background 0.3s ease, box-shadow 0.3s ease; }
        #bo-nav.bo-nav-scrolled { background: rgba(18,59,93,1) !important; box-shadow: 0 4px 32px rgba(18,59,93,0.4); }
        /* Ken Burns hero bg */
        @keyframes bo-kenburns { 0% { transform: scale(1); } 100% { transform: scale(1.06); } }
        .bo-hero-bg { animation: bo-kenburns 12s ease-out forwards; }
        /* Stripe texture overlays */
        .bo-stripe { background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 12px); }
        /* Buttons */
        .bo-btn { position: relative; overflow: hidden; box-shadow: 0 4px 16px rgba(245,130,32,0.30); transition: transform 0.2s ease, box-shadow 0.2s ease !important; }
        .bo-btn::after { content: ''; position: absolute; top: -50%; left: -60%; width: 30%; height: 200%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent); transform: skewX(-20deg); transition: left 0.5s; pointer-events: none; }
        .bo-btn:hover::after { left: 130%; }
        .bo-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(245,130,32,0.45) !important; }
        /* Cards */
        .bo-ind-card { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, border-color 0.3s ease !important; cursor: default; }
        .bo-ind-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 48px rgba(18,59,93,0.15) !important; border-color: rgba(245,130,32,0.35) !important; }
        .bo-svc-card { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease !important; }
        .bo-svc-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 48px rgba(18,59,93,0.14) !important; }
        .bo-why-card { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease, border-color 0.3s ease !important; }
        .bo-why-card:hover { transform: translateY(-4px) !important; background: rgba(255,255,255,0.08) !important; border-color: rgba(245,130,32,0.4) !important; }
        .bo-test-card { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease !important; }
        .bo-test-card:hover { transform: translateY(-4px) !important; box-shadow: 0 16px 48px rgba(18,59,93,0.14) !important; }
        .bo-process-card { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease !important; }
        .bo-process-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 48px rgba(18,59,93,0.12) !important; }
        @keyframes bo-stat-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        html.bo-js .bo-stat { opacity: 0; }
        html.bo-js .bo-stat.bo-visible { animation: bo-stat-in 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        html.bo-js .bo-stat:nth-child(1).bo-visible { animation-delay: 0s; }
        html.bo-js .bo-stat:nth-child(2).bo-visible { animation-delay: 0.1s; }
        html.bo-js .bo-stat:nth-child(3).bo-visible { animation-delay: 0.2s; }
        html.bo-js .bo-stat:nth-child(4).bo-visible { animation-delay: 0.3s; }
      ` }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EmploymentAgency",
            name: "BO Consulting",
            url: "https://www.boconsulting.com.au",
            logo: "https://www.boconsulting.com.au/sites/bo-consultancy/logo.png",
            description:
              "Australia's specialist blue-collar workforce recruitment partner. Permanent placement, labour hire and workforce solutions across Construction, Mining, Manufacturing, Transport, Civil, Trades, Warehousing and Logistics.",
            email: "info@boconsulting.com.au",
            areaServed: {
              "@type": "Country",
              name: "Australia",
            },
            serviceType: [
              "Permanent Recruitment",
              "Labour Hire",
              "Executive Search",
              "Volume Recruitment",
              "Workforce Planning",
              "Recruitment Process Outsourcing",
            ],
            knowsAbout: [
              "Construction Recruitment",
              "Mining Recruitment",
              "Manufacturing Recruitment",
              "Warehousing Recruitment",
              "Transport Recruitment",
              "Civil Recruitment",
              "Trades Recruitment",
              "Logistics Recruitment",
            ],
            openingHours: "Mo-Fr 09:00-17:00",
            sameAs: [],
          }),
        }}
      />
      {children}
      <script dangerouslySetInnerHTML={{ __html: `(function() {
  function init() {
    if (document.getElementById('bo-widget-root')) return;
    var NAVY='#123B5D',ORANGE='#F58220',AVATAR='/sites/bo-consultancy/christina-avatar.jpg';
    var messages=[{role:'assistant',content:"G'day! I'm Christina, the BO Consulting assistant. Whether you're looking to hire skilled workers or searching for your next role, I can help point you in the right direction. What can I do for you?"}];
    var isOpen=false;

    var style=document.createElement('style');
    style.textContent='@keyframes bo-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}#bo-widget-root *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}';
    document.head.appendChild(style);

    var root=document.createElement('div');
    root.id='bo-widget-root';
    root.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:12px;pointer-events:none';

    var panel=document.createElement('div');
    panel.style.cssText='width:380px;max-width:calc(100vw - 48px);border-radius:20px;overflow:hidden;flex-direction:column;height:520px;max-height:calc(100vh - 120px);background:#fff;box-shadow:0 24px 80px rgba(18,59,93,0.25);display:none;pointer-events:auto';

    var hdr=document.createElement('div');
    hdr.style.cssText='background:'+NAVY+';padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0';
    hdr.innerHTML='<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.2)"><img src="'+AVATAR+'" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1"><div style="color:#fff;font-size:14px;font-weight:700">Christina</div><div style="color:rgba(255,255,255,0.6);font-size:12px">BO Consulting Assistant</div></div><button id="bo-close" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:22px;cursor:pointer;line-height:1;padding:0 4px">&#215;</button>';

    var msgs=document.createElement('div');
    msgs.id='bo-msgs';
    msgs.style.cssText='flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:16px';

    var inp=document.createElement('div');
    inp.style.cssText='padding:12px;border-top:1px solid #F4F5F6;flex-shrink:0;display:flex;gap:8px';
    inp.innerHTML='<input id="bo-inp" type="text" placeholder="Type a message..." style="flex:1;padding:10px 14px;border-radius:12px;border:1px solid #E2E6EA;font-size:14px;color:#1A2B3C;outline:none;background:#fff"><button id="bo-send" style="padding:10px 18px;border-radius:12px;border:none;background:'+ORANGE+';color:#fff;font-size:14px;font-weight:700;cursor:pointer">Send</button>';

    panel.appendChild(hdr);panel.appendChild(msgs);panel.appendChild(inp);

    var btn=document.createElement('button');
    btn.id='bo-launch';
    btn.setAttribute('aria-label','Chat with Christina');
    btn.style.cssText='width:60px;height:60px;border-radius:50%;background:'+ORANGE+';border:3px solid '+ORANGE+';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(245,130,32,0.45);overflow:hidden;padding:0;flex-shrink:0;pointer-events:auto';
    btn.innerHTML='<img src="'+AVATAR+'" alt="" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none">';

    root.appendChild(panel);root.appendChild(btn);
    document.body.appendChild(root);

    function renderMsgs(){
      msgs.innerHTML='';
      messages.forEach(function(m){
        var row=document.createElement('div');
        row.style.cssText='display:flex;gap:10px;flex-direction:'+(m.role==='user'?'row-reverse':'row');
        if(m.role==='assistant'){
          var av=document.createElement('div');
          av.style.cssText='width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-top:2px';
          av.innerHTML='<img src="'+AVATAR+'" style="width:100%;height:100%;object-fit:cover">';
          row.appendChild(av);
        }
        var bub=document.createElement('div');
        bub.style.cssText='max-width:75%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.6;background:'+(m.role==='user'?NAVY:'#F4F5F6')+';color:'+(m.role==='user'?'#fff':'#1A2B3C');
        bub.textContent=m.content;
        row.appendChild(bub);
        msgs.appendChild(row);
      });
      msgs.scrollTop=msgs.scrollHeight;
    }

    function toggleOpen(){
      isOpen=!isOpen;
      if(isOpen){
        panel.style.display='flex';
        btn.innerHTML='<span style="font-size:24px;line-height:1;color:#fff;pointer-events:none">&#215;</span>';
        renderMsgs();
        setTimeout(function(){var i=document.getElementById('bo-inp');if(i)i.focus();},50);
      } else {
        panel.style.display='none';
        btn.innerHTML='<img src="'+AVATAR+'" alt="" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none">';
      }
    }

    async function send(){
      var i=document.getElementById('bo-inp');
      var txt=i?i.value.trim():'';
      if(!txt)return;
      i.value='';
      messages.push({role:'user',content:txt});
      renderMsgs();
      var typing=document.createElement('div');
      typing.style.cssText='display:flex;gap:10px';
      typing.innerHTML='<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="'+AVATAR+'" style="width:100%;height:100%;object-fit:cover"></div><div style="padding:10px 14px;border-radius:16px;background:#F4F5F6;display:flex;gap:4px;align-items:center"><span style="width:6px;height:6px;border-radius:50%;background:'+ORANGE+';display:inline-block;animation:bo-bounce 1s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:'+ORANGE+';display:inline-block;animation:bo-bounce 1s 150ms infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:'+ORANGE+';display:inline-block;animation:bo-bounce 1s 300ms infinite"></span></div>';
      msgs.appendChild(typing);
      msgs.scrollTop=msgs.scrollHeight;
      try{
        var r=await fetch('/api/bo-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:messages})});
        var d=await r.json();
        messages.push({role:'assistant',content:d.content||'Sorry, having trouble. Email info@boconsulting.com.au'});
      }catch(e){
        messages.push({role:'assistant',content:'Having trouble connecting. Email info@boconsulting.com.au'});
      }
      renderMsgs();
    }

    btn.addEventListener('click',toggleOpen);
    document.getElementById('bo-close').addEventListener('click',toggleOpen);
    document.getElementById('bo-send').addEventListener('click',send);
    document.getElementById('bo-inp').addEventListener('keydown',function(e){if(e.key==='Enter')send();});
  }

  function initNav() {
    var hamburger = document.getElementById('bo-hamburger');
    var menu = document.getElementById('bo-mobile-menu');
    if (!hamburger || !menu) return;
    var open = false;
    hamburger.addEventListener('click', function() {
      open = !open;
      menu.style.display = open ? 'block' : 'none';
      var spans = hamburger.querySelectorAll('span');
      if (open) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.transform = 'rotate(-45deg)';
        spans[2].style.display = 'none';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.transform = 'none';
        spans[2].style.display = 'block';
      }
    });
    menu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        open = false;
        menu.style.display = 'none';
        var spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.transform = 'none';
        spans[2].style.display = 'block';
      });
    });
  }

  function initForm() {
    var form = document.getElementById('bo-contact-form');
    if (!form) return;

    var formSuccess = document.getElementById('bo-form-success');
    var NAVY='#123B5D', GREY='#5C6670';
    var currentType='employer';

    function setTab(type) {
      currentType = type;
      var tabH = document.getElementById('bo-tab-hiring');
      var tabC = document.getElementById('bo-tab-candidate');
      var companyRow = document.getElementById('bo-company-row');
      var msgLabel = document.getElementById('bo-msg-label');
      if (tabH) { tabH.style.background = type==='employer' ? NAVY : 'transparent'; tabH.style.color = type==='employer' ? '#fff' : GREY; }
      if (tabC) { tabC.style.background = type==='candidate' ? NAVY : 'transparent'; tabC.style.color = type==='candidate' ? '#fff' : GREY; }
      if (companyRow) companyRow.style.display = type==='employer' ? '' : 'none';
      if (msgLabel) msgLabel.textContent = type==='employer' ? 'What roles are you looking to fill?' : 'What type of work are you looking for?';
    }

    var tabH = document.getElementById('bo-tab-hiring');
    var tabC = document.getElementById('bo-tab-candidate');
    if (tabH) tabH.addEventListener('click', function() { setTab('employer'); });
    if (tabC) tabC.addEventListener('click', function() { setTab('candidate'); });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var nameEl = document.getElementById('bo-name');
      var emailEl = document.getElementById('bo-email');
      var companyEl = document.getElementById('bo-company');
      var messageEl = document.getElementById('bo-message');
      var name = nameEl ? nameEl.value.trim() : '';
      var email = emailEl ? emailEl.value.trim() : '';
      var company = companyEl ? companyEl.value.trim() : '';
      var message = messageEl ? messageEl.value.trim() : '';
      if (!name || !email || !message) return;
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      fetch('/api/bo-contact', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name,email:email,company:company,message:message,formType:currentType})
      }).finally(function() {
        if (form) form.style.display = 'none';
        if (formSuccess) formSuccess.style.display = 'block';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(); initNav(); initForm(); });
  } else {
    init();
    initNav();
    initForm();
  }
})();` }} />
    </>
  );
}
