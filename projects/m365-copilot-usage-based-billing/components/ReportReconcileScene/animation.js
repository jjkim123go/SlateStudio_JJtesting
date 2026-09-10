// Microsoft 365 usage appears first, followed by delayed Azure cost reporting.
const rrsScope='.scene-'+SCENE_ID;const rrsScale=SCENE_DURATION/10;const rrsAt=(s)=>SCENE_START+s*rrsScale;
master.fromTo(rrsScope+' .rrs-m365',{autoAlpha:0,x:-24},{autoAlpha:1,x:0,duration:.55*rrsScale,ease:'power2.out'},rrsAt(.4));
master.fromTo(rrsScope+' .rrs-row',{autoAlpha:0,x:-18},{autoAlpha:1,x:0,duration:.35*rrsScale,ease:'power2.out',stagger:.35*rrsScale},rrsAt(1.3));
master.fromTo(rrsScope+' .rrs-delay',{autoAlpha:0},{autoAlpha:1,duration:.45*rrsScale,ease:'power2.out'},rrsAt(3));
master.fromTo(rrsScope+' .rrs-delay-line i',{autoAlpha:.25,scale:.7},{autoAlpha:1,scale:1,duration:.3*rrsScale,ease:'power2.out',stagger:.55*rrsScale},rrsAt(3.4));
master.fromTo(rrsScope+' .rrs-azure',{autoAlpha:0,x:24},{autoAlpha:1,x:0,duration:.55*rrsScale,ease:'power2.out'},rrsAt(5));
master.fromTo(rrsScope+' .rrs-bar',{scaleY:0},{scaleY:1,duration:.45*rrsScale,ease:'power2.out',stagger:.2*rrsScale},rrsAt(5.7));