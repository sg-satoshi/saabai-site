/* Example rate shown on the LMM calculators. Single source of truth for the rate and its date.
   pi: NAB standard variable, owner occupier P&I. io: interest only. asAt: date the rate was checked. */
window.LMM_RATES={pi:6.69,io:7.59,buffer:3,asAt:"2 Nov 2026",lender:"NAB standard variable"};
document.addEventListener("DOMContentLoaded",function(){var R=window.LMM_RATES,m={pi:R.pi.toFixed(2),io:R.io.toFixed(2),as:(R.pi+R.buffer).toFixed(2),d:R.asAt};document.querySelectorAll("[data-r]").forEach(function(e){e.textContent=m[e.dataset.r]})});
window.lmmEmail=function(f){var t=function(id){var e=document.getElementById(id);return e?e.innerText.replace(/\s+\n/g,"\n").trim():""};
var body=document.title.split("|")[0].trim()+"\n\n"+t("biglbl")+": "+t("big")+"\n"+(t("rep")?"Estimated repayment: "+t("rep")+"\n":"")+"\n"+t("bd")+"\n\nExample rate: "+window.LMM_RATES.lender+", as at "+window.LMM_RATES.asAt+".\nEstimate only, not credit advice.\n\n"+location.href;
var to=f.e.value.trim(),cc=f.c.checked?"&cc=nick@lifestylemoneymanagement.com.au":"";
location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent("My Lifestyle Money Management estimate")+cc+"&body="+encodeURIComponent(body);return false};
