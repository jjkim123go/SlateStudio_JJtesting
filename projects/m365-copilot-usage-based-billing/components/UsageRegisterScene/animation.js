// One eligible interaction activates a service and is visibly counted.
const ursScope = '.scene-' + SCENE_ID;
const ursScale = SCENE_DURATION / 7;
const ursAt = (seconds) => SCENE_START + seconds * ursScale;

master.fromTo(ursScope+' h1',{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.55*ursScale,ease:'power2.out'},ursAt(.35));
master.fromTo(ursScope+' .urs-flow',{autoAlpha:0,y:28},{autoAlpha:1,y:0,duration:.55*ursScale,ease:'power2.out'},ursAt(1));
master.to(ursScope+' .urs-service:nth-child(1)',{className:'urs-service urs-chat is-active',duration:.01},ursAt(2));
master.fromTo(ursScope+' .urs-pulse',{autoAlpha:0,scale:.6},{autoAlpha:1,scale:1,duration:.25*ursScale,ease:'power2.out'},ursAt(2.15));
master.to(ursScope+' .urs-pulse',{x:610,duration:1.25*ursScale,ease:'power1.inOut'},ursAt(2.45));
master.to(ursScope+' .urs-meter-track i:nth-child(1)',{className:'is-counted',scaleY:3.4,duration:.35*ursScale,ease:'power2.out'},ursAt(3.65));
master.to(ursScope+' .urs-meter-total span:nth-child(1)',{className:'is-counted',duration:.01},ursAt(3.8));
master.to(ursScope+' .urs-service:nth-child(2)',{className:'urs-service urs-doc is-active',duration:.01},ursAt(4.25));
master.to(ursScope+' .urs-meter-track i:nth-child(2)',{className:'is-counted',scaleY:2.4,duration:.35*ursScale,ease:'power2.out'},ursAt(4.65));
master.to(ursScope+' .urs-meter-total span:nth-child(2)',{className:'is-counted',duration:.01},ursAt(4.8));
master.to(ursScope+' .urs-service:nth-child(3)',{className:'urs-service urs-search is-active',duration:.01},ursAt(5.15));
master.to(ursScope+' .urs-meter-track i:nth-child(3)',{className:'is-counted',scaleY:4,duration:.35*ursScale,ease:'power2.out'},ursAt(5.55));
master.to(ursScope+' .urs-meter-total span:nth-child(3)',{className:'is-counted',duration:.01},ursAt(5.7));