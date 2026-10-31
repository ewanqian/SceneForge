import { chapters } from './chapters.js?v=20261031-2';

let active=0,teacher=false;const $=id=>document.getElementById(id);const buttons=chapters.map((c,i)=>{let b=document.createElement('button');b.innerHTML=`<span>0${i+1}</span>${c.name}`;b.onclick=()=>select(i);$('stations').append(b);return b});let focusStage=()=>{};
function select(i){active=Math.max(0,Math.min(5,i));let c=chapters[active];for(let k of ['title','time','line','body','reminder','question','check'])$(k).textContent=c[k];$('number').textContent=`ACT 0${active+1} / ${c.name}`;$('progress').textContent=`${active+1} / 6`;$('links').replaceChildren(...c.links.map(([text,href])=>{let a=document.createElement('a');a.textContent=text+' ↗';a.href=href;return a}));buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===active)));$('prev').disabled=active===0;$('next').disabled=active===5;focusStage(active)}
$('prev').onclick=()=>select(active-1);$('next').onclick=()=>select(active+1);$('teacher').onclick=()=>{teacher=!teacher;document.querySelector('.speaker').hidden=!teacher;$('teacher').setAttribute('aria-pressed',String(teacher))};document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();select(active+1)}if(e.key==='ArrowLeft'){e.preventDefault();select(active-1)}});select(0);
try {
 const {mountExhibition}=await import('./exhibition.js?v=20261031-3');
 const exhibition=mountExhibition($('world'),select);
 focusStage=i=>{exhibition.focus(i);$('focusLabel').textContent=['参考图与舞台构想','Agent 窗口与最小灰盒','网页画面 → UV → 正面与地面','同一场景，三条观看视线','同一机位，比较两个版本','为不同屏幕组合建立场景档案'][i]};
 $('overview').onclick=()=>{exhibition.overview();$('focusLabel').textContent='六张展台 · 选择一张进入'};
 window.stageExhibition={getView:exhibition.getView};
 focusStage(active);
} catch(e) { $('fallback').textContent='三维展台暂不可用。可通过下方章节浏览课程内容。';console.warn(e.message); }
