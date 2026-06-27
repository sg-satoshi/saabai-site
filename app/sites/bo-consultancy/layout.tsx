import type { Metadata } from "next";
import Script from "next/script";

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
      <Script id="bo-chat-widget" strategy="afterInteractive">{`
(function() {
  if (document.getElementById('bo-widget-root')) return;
  var NAVY='#123B5D',ORANGE='#F58220',AVATAR='/sites/bo-consultancy/christina-avatar.jpg';
  var messages=[{role:'assistant',content:"G\\'day! I\\'m Christina, the BO Consulting assistant. Whether you\\'re looking to hire skilled workers or searching for your next role, I can help point you in the right direction. What can I do for you?"}];
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
  hdr.innerHTML='<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.2)"><img src="'+AVATAR+'" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1"><div style="color:#fff;font-size:14px;font-weight:700">Christina</div><div style="color:rgba(255,255,255,0.6);font-size:12px">BO Consulting Assistant</div></div><button id="bo-close" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:22px;cursor:pointer;line-height:1;padding:0 4px">×</button>';

  var msgs=document.createElement('div');
  msgs.id='bo-msgs';
  msgs.style.cssText='flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:16px';

  var inp=document.createElement('div');
  inp.style.cssText='padding:12px;border-top:1px solid #F4F5F6;flex-shrink:0;display:flex;gap:8px';
  inp.innerHTML='<input id="bo-inp" type="text" placeholder="Type a message…" style="flex:1;padding:10px 14px;border-radius:12px;border:1px solid #E2E6EA;font-size:14px;color:#1A2B3C;outline:none;background:#fff"><button id="bo-send" style="padding:10px 18px;border-radius:12px;border:none;background:'+ORANGE+';color:#fff;font-size:14px;font-weight:700;cursor:pointer">Send</button>';

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
      btn.innerHTML='<span style="font-size:24px;line-height:1;color:#fff;pointer-events:none">×</span>';
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
})();
      `}</Script>
    </>
  );
}
