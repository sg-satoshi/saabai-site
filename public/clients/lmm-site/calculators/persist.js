/* Keeps calculator inputs for this browser session (sessionStorage, one key).
   Shared fields prefill across all three calculators; PAGE_ONLY fields are kept per page. */
(function(){
var KEY="lmm-calc-v1",PAGE_ONLY=["extra"],page=document.body.dataset.mode||"x";
function load(){try{var d=JSON.parse(sessionStorage.getItem(KEY)||"null");return d&&d.v===1&&typeof d.shared==="object"&&typeof d.pages==="object"?d:null}catch(e){return null}}
function fields(){return Array.prototype.slice.call(document.querySelectorAll(".fld input[type=range]"))}
function segs(){return Array.prototype.slice.call(document.querySelectorAll("[data-seg]"))}
function restore(){var d=load();if(!d)return;var p=d.pages[page]||{};
fields().forEach(function(r){var src=PAGE_ONLY.indexOf(r.id)>-1?p:d.shared,v=src[r.id];
if(typeof v!=="number"||!isFinite(v))return;v=Math.min(Math.max(v,+r.min),+r.max);r.value=v;r.dispatchEvent(new Event("input",{bubbles:true}))});
segs().forEach(function(g){var k=g.dataset.seg,v=(PAGE_ONLY.indexOf(k)>-1?p:d.shared)[k];if(typeof v!=="string")return;
var b=g.querySelector('button[data-v="'+v.replace(/[^a-z0-9]/gi,"")+'"]');if(b&&!b.classList.contains("on"))b.click()})}
var t;function save(){clearTimeout(t);t=setTimeout(function(){try{var d=load()||{v:1,shared:{},pages:{}};d.pages[page]=d.pages[page]||{};
fields().forEach(function(r){(PAGE_ONLY.indexOf(r.id)>-1?d.pages[page]:d.shared)[r.id]=+r.value});
segs().forEach(function(g){var b=g.querySelector("button.on");if(b)(PAGE_ONLY.indexOf(g.dataset.seg)>-1?d.pages[page]:d.shared)[g.dataset.seg]=b.dataset.v});
sessionStorage.setItem(KEY,JSON.stringify(d))}catch(e){}},150)}
try{restore()}catch(e){}
document.addEventListener("input",function(e){if(e.target.closest(".fld"))save()});
document.addEventListener("click",function(e){if(e.target.closest("[data-seg] button"))save()});
})();
