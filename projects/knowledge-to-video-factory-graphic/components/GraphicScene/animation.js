if (typeof master?.paused === 'function' && !master.paused()) master.pause();
const root = document.querySelector('.scene-' + SCENE_ID + ' .g-root');
if (!root) return;
if (window.innerWidth < 1920 || window.innerHeight < 1080) {
	const previewScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
	document.body.style.transformOrigin = 'top left';
	document.body.style.transform = `scale(${previewScale})`;
	document.body.style.overflow = 'hidden';
}
const stage = root.querySelector('.g-stage');
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg'); svg.className = 'g-svg'; svg.setAttribute('viewBox', '0 0 1680 630'); stage.appendChild(svg);
const add = (name, attrs={}) => { const el=document.createElementNS(NS,name); Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v))); svg.appendChild(el); return el; };
const path = d => add('path',{d,fill:'none',stroke:'#56d6ff','stroke-width':5,'stroke-linecap':'round'});
const line = (x1,y1,x2,y2,cls='') => add('line',{x1,y1,x2,y2,class:cls});
const circle = (cx,cy,r,cls='') => add('circle',{cx,cy,r,class:cls});
const node = (x,y,w,h,title,sub,cls='') => { const el=document.createElement('div'); el.className='g-node '+cls; el.style.left=x+'px'; el.style.top=y+'px'; el.style.width=w+'px'; el.style.height=h+'px'; el.innerHTML='<strong>'+title+'</strong><span>'+sub+'</span>'; stage.appendChild(el); return el; };
const word = (x,y,value,cls='g-word') => { const el=document.createElement('div'); el.className=cls; el.textContent=value; el.style.left=x+'px'; el.style.top=y+'px'; stage.appendChild(el); return el; };
const items=[];
const v=SCENE_PROPS.variant;
if(v==='signal'){ const a=word(70,130,'KNOWLEDGE'); const b=word(920,320,'LEARNING'); const n=node(90,300,330,150,'SOURCE','trusted writing'); const o=node(1220,300,350,150,'LESSON','visible understanding',''); path('M 420 375 C 660 180, 920 180, 1220 375'); circle(670,250,16); circle(900,225,11); items.push(a,b,n,o); }
if(v==='funnel'){ const a=node(40,45,350,125,'MICROSOFT LEARN','content'); const b=node(40,240,350,125,'TECHNICAL DOCS','structure'); const c=node(40,435,350,125,'SUPPORT ARTICLES','answers'); const hub=node(665,250,350,175,'ONE FACTORY','specialized agents'); const out=node(1300,250,330,175,'VIDEO','conceptual lesson'); path('M 390 130 C 500 130, 540 300, 665 300 M 390 325 L 665 335 M 390 520 C 500 520, 540 380, 665 380 M 1015 335 L 1300 335'); items.push(a,b,c,hub,out); }
if(v==='agents'){ const d=node(40,170,390,210,'SOURCE','article.md'); const o=document.createElement('div'); o.className='g-orb'; o.style.left='670px'; o.style.top='70px'; o.style.width='420px'; o.style.height='420px'; stage.appendChild(o); const core=document.createElement('div'); core.className='g-core'; core.style.left='815px'; core.style.top='215px'; core.style.width='130px'; core.style.height='130px'; core.textContent='AI'; stage.appendChild(core); [['READ',700,35],['SHAPE',1030,195],['CHECK',700,475]].forEach(([t,x,y])=>{ const w=word(x,y,t,'g-word g-mono'); items.push(w); }); path('M 430 275 C 540 275, 620 240, 815 280'); [0,1,2].forEach(i=>{const angle=i*2.1; const x=880+Math.cos(angle)*210; const y=280+Math.sin(angle)*210; circle(x,y,18,'warm');}); items.push(d,core,o); }
if(v==='timeline'){ const base=line(80,330,1600,330); const steps=[['SCRIPT',220,'#56d6ff'],['STORYBOARD',700,'#ffb84d'],['NARRATION',1200,'#83e27e']]; steps.forEach(([label,x,color],i)=>{ const n=node(x,150,260,180,label,'artifact '+String(i+1).padStart(2,'0')); n.style.borderColor=color; items.push(n); line(x+130,330,x+130,430); }); }
if(v==='quality'){ const title=word(40,60,'QUALITY IS PART OF THE PIPELINE'); const labels=[['MOTION',220,'#56d6ff'],['BRAND',650,'#ffb84d'],['TEACHING',1050,'#83e27e'],['TRUST',1400,'#56d6ff']]; const points=[]; labels.forEach(([label,x,color],i)=>{ const n=node(x,220,220,150,label,'verified'); n.style.borderColor=color; items.push(n); points.push([x+110,220]); }); for(let i=0;i<points.length-1;i++) path('M '+points[i][0]+' '+(points[i][1]+75)+' C '+(points[i][0]+110)+' '+(points[i][1]-60)+', '+(points[i+1][0]-110)+' '+(points[i+1][1]+210)+', '+points[i+1][0]+' '+(points[i+1][1]+75)); const read=word(580,500,'clear  /  consistent  /  trustworthy','g-word g-mono'); items.push(title,read); }
if(v==='outcome'){ const a=node(70,160,420,190,'WRITTEN','knowledge'); const b=node(1190,160,420,190,'VISUAL','learning'); path('M 490 255 C 740 40, 980 40, 1190 255'); circle(770,120,18); circle(1000,140,12); const t=word(380,470,'EXPLAIN COMPLEX IDEAS FASTER'); const s=word(525,555,'WITHOUT LOSING RIGOR','g-word g-mono'); items.push(a,b,t,s); }
items.forEach((el,i)=>{ el.style.opacity='0'; el.style.transform='translateY(22px) scale(.97)'; master.to(el,{opacity:1,y:0,scale:1,duration:.55,ease:'power3.out'},SCENE_START+Math.min(i*.16,.9)); });
const paths=[...svg.querySelectorAll('path')]; paths.forEach((p,i)=>{ const len=p.getTotalLength(); p.style.strokeDasharray=len; p.style.strokeDashoffset=len; master.to(p,{strokeDashoffset:0,duration:1.15,ease:'power2.out'},SCENE_START+0.6+i*.12); });
