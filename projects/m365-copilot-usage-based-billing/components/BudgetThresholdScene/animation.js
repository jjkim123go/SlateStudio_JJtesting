// Usage events advance in order; the alert appears without stopping later events.
const btsScope='.scene-'+SCENE_ID;const btsScale=SCENE_DURATION/11;const btsAt=(s)=>SCENE_START+s*btsScale;
master.fromTo(btsScope+' .bts-window',{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.55*btsScale,ease:'power2.out'},btsAt(.35));
master.fromTo(btsScope+' .bts-scope div',{autoAlpha:0,y:16},{autoAlpha:1,y:0,duration:.4*btsScale,ease:'power2.out',stagger:.25*btsScale},btsAt(1.1));
master.fromTo(btsScope+' .bts-threshold',{autoAlpha:0,scaleY:0,transformOrigin:'bottom'},{autoAlpha:1,scaleY:1,duration:.5*btsScale,ease:'power2.out'},btsAt(2));
master.fromTo(btsScope+' .bts-events i',{autoAlpha:0,scale:.4},{autoAlpha:1,scale:1,duration:.3*btsScale,ease:'power2.out',stagger:.72*btsScale},btsAt(2.4));
master.fromTo(btsScope+' .bts-alert',{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.45*btsScale,ease:'power2.out'},btsAt(6.1));
master.fromTo(btsScope+' .bts-events i:nth-child(n+5)',{backgroundColor:'#2563eb'},{backgroundColor:'#16855b',duration:.25*btsScale,stagger:.72*btsScale},btsAt(6.5));