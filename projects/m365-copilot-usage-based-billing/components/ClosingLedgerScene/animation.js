// Verified permissions lead through three plainly labeled operating steps.
const clsScope='.scene-'+SCENE_ID;const clsScale=SCENE_DURATION/9;const clsAt=(s)=>SCENE_START+s*clsScale;
master.fromTo(clsScope+' .cls-permissions div',{autoAlpha:0,y:-30},{autoAlpha:1,y:0,duration:.6*clsScale,ease:'power1.out',stagger:.2*clsScale},clsAt(.3));
master.fromTo(clsScope+' .cls-permissions i',{autoAlpha:0,scale:1.25},{autoAlpha:1,scale:1,duration:.6*clsScale,ease:'power1.out',stagger:.2*clsScale},clsAt(1.1));
master.fromTo(clsScope+' .cls-steps>div',{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.5*clsScale,ease:'power2.out',stagger:.65*clsScale},clsAt(2));
master.fromTo(clsScope+' .cls-steps>b',{scaleX:0},{scaleX:1,duration:.45*clsScale,ease:'power1.inOut',stagger:.65*clsScale},clsAt(2.5));
master.fromTo(clsScope+' .cls-final',{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.65*clsScale,ease:'power2.out'},clsAt(5.3));