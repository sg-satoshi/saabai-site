(function(){
const $=id=>document.getElementById(id),fmt=n=>(n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString('en-AU');
const R=window.LMM_RATES,PI=R.pi,IO=R.io;let freq='m',type='pi';
const pmt=(L,r,n)=>L*r/(1-Math.pow(1+r,-n));
document.querySelectorAll('[data-seg]').forEach(g=>g.addEventListener('click',e=>{if(e.target.tagName!='BUTTON')return;g.querySelectorAll('button').forEach(b=>b.classList.remove('on'));e.target.classList.add('on');if(g.dataset.seg=='freq')freq=e.target.dataset.v;else type=e.target.dataset.v;run()}));
document.querySelectorAll('.fld').forEach(f=>{const r=f.querySelector('[type=range]'),n=f.querySelector('[type=number]');const P=()=>r.style.setProperty('--p',(r.value-r.min)/(r.max-r.min)*100+'%');const s=x=>{(x==r?n:r).value=x.value;P();run()};r.oninput=()=>s(r);n.oninput=()=>s(n);P()});
const v=id=>+$(id).value;
function sim(L,rate,yrs,extraMo,io){const r=rate/1200,m=io?L*r:pmt(L,r,yrs*12);let b=L,I=0,k=0,bal=[L];while(b>.01&&k<yrs*12){const i=b*r;I+=i;b=io?b:b+i-m-extraMo;k++;if(k%12==0)bal.push(Math.max(b,0))}while(bal.length<=yrs)bal.push(0);return{m,I,k,bal}}
function per(L,rate,yrs,c){const r=rate/100/c,n=yrs*c,p=pmt(L,r,n);return{p,I:p*n-L}}
function ym(k){return Math.floor(k/12)+' yrs '+(k%12)+' mths'}
function run(){const L=v('loan'),yrs=v('term'),io=type=='io',rate=io?IO:PI,ex=io?0:v('extra')*26/12;
const a=sim(L,rate,yrs,0,io),b=sim(L,rate,yrs,ex,io),f={w:12/52,f:12/26,m:1}[freq];
$('big').innerHTML=fmt(a.m*f)+'<span style="font-size:1rem;font-weight:500;color:#c8d0da"> / '+{w:'week',f:'fortnight',m:'month'}[freq]+'</span>';
$('biglbl').textContent='Your '+{w:'weekly',f:'fortnightly',m:'monthly'}[freq]+' repayment';
$('rate').textContent=`at ${rate}% p.a. ${io?'interest only':'P&I'} · ${yrs} years · Example rate: NAB standard variable, as at ${R.asAt}`;
$('fq').innerHTML=[['w','Weekly',52],['f','Fortnightly',26],['m','Monthly',12]].map(([k,l,c])=>{const q=io?{p:L*rate/100/c,I:L*rate/100*yrs}:per(L,rate,yrs,c);return `<div class="${k==freq?'on':''}"><small>${l}</small><b>${fmt(q.p)}</b><small>Total interest ${fmt(q.I)}</small></div>`}).join('');
$('isave').textContent=fmt(a.I-b.I);$('tsave').textContent=io?'n/a for IO':ym(a.k-b.k);$('tnew').textContent=ym(b.k);
const T=L+a.I,pp=L/T;const A=pp*2*Math.PI,x=60+50*Math.sin(A),y=60-50*Math.cos(A);
$('chart1').innerHTML=`<div class="chartrow"><svg width="140" height="140" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" stroke="#C99E5F" stroke-width="20" fill="none"/><path d="M60 10A50 50 0 ${pp>.5?1:0} 1 ${x} ${y}" stroke="#0b5d55" stroke-width="20" fill="none"/></svg><div class="lg"><span><i style="background:#0b5d55"></i>Principal ${fmt(L)} (${Math.round(pp*100)}%)</span><span><i style="background:#C99E5F"></i>Interest ${fmt(a.I)} (${100-Math.round(pp*100)}%)</span><span><b>Total repaid ${fmt(T)}</b></span></div></div>`;
const W=520,H=190,X=k=>k/yrs*W,Y=q=>H-q/L*H,pl=arr=>arr.map((q,k)=>`${X(k).toFixed(1)},${Y(q).toFixed(1)}`).join(' ');
let g='';for(let k=0;k<=yrs;k+=5)g+=`<text x="${X(k)}" y="${H+14}" font-size="11" fill="#667274" text-anchor="middle">Yr ${k}</text>`;
$('chart2').innerHTML=`<svg width="100%" viewBox="-20 -6 ${W+40} ${H+24}"><polygon points="0,${H} ${pl(a.bal)} ${W},${H}" fill="rgba(16,31,52,.08)"/><polyline points="${pl(a.bal)}" fill="none" stroke="#101F34" stroke-width="2.5"/><polyline points="${pl(b.bal)}" fill="none" stroke="#B48C54" stroke-width="2.5"/><text x="0" y="8" font-size="11" fill="#667274">${fmt(L)}</text>${g}</svg>`}
run()})();
