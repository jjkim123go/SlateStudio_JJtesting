// A test request is validated by the connected policy before consumption appears.
const vrsScope='.scene-'+SCENE_ID;const vrsScale=SCENE_DURATION/9;const vrsAt=(s)=>SCENE_START+s*vrsScale;
master.fromTo(vrsScope+' .vrs-window',{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.55*vrsScale,ease:'power2.out'},vrsAt(.35));
master.fromTo(vrsScope+' .vrs-user',{autoAlpha:0,x:-20},{autoAlpha:1,x:0,duration:.4*vrsScale,ease:'power2.out'},vrsAt(1.1));
master.fromTo(vrsScope+' .vrs-request',{autoAlpha:0,y:15},{autoAlpha:1,y:0,duration:.4*vrsScale,ease:'power2.out'},vrsAt(1.7));
master.fromTo(vrsScope+' .vrs-connector',{scaleX:0},{scaleX:1,duration:.7*vrsScale,ease:'power1.inOut'},vrsAt(2.5));
master.to(vrsScope+' .vrs-connector i',{x:76,duration:.7*vrsScale,ease:'power1.inOut'},vrsAt(2.5));
master.fromTo(vrsScope+' .vrs-policy',{autoAlpha:0,x:20},{autoAlpha:1,x:0,duration:.4*vrsScale,ease:'power2.out'},vrsAt(3.1));
master.fromTo(vrsScope+' .vrs-result',{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.5*vrsScale,ease:'power2.out'},vrsAt(4));
master.fromTo(vrsScope+' .vrs-row i',{autoAlpha:0,scale:.4},{autoAlpha:1,scale:1,duration:.25*vrsScale,ease:'power2.out',stagger:.16*vrsScale},vrsAt(4.8));