/* Realtime relay shared by the TV (host) and the phones.
   Messages go through a free public MQTT broker over secure WebSockets, so phones can join
   from any network. Topics: fandomonium/v1/ROOM/hello (host presence, retained),
   .../h (phones to host) and .../p/PLAYERID (host to one phone). */
const NET={
  // Tried in order. EMQX's public broker is the one verified end to end (test/e2e.py on GitHub).
  // HiveMQ's and Eclipse's public brokers failed that test, so they're left out on purpose:
  // a relay that connects but doesn't deliver would show a room code nobody can join.
  brokers:["wss://broker.emqx.io:8084/mqtt"],
  prefix:"fandomonium/v1/",
  joinUrl:"https://matthewsleclair-hue.github.io/fandomonium/join/",
  // ?broker=ws://... points both sides at a test relay
  override(){try{return new URLSearchParams(location.search).get("broker")||null;}catch(e){return null;}},
  // ?debug in the page address logs relay activity to the browser console
  debug:(()=>{try{return new URLSearchParams(location.search).has("debug");}catch(e){return false;}})(),
  log(...a){if(NET.debug)console.info("[fdm]",...a);},
  id(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);},
  connectOne(url){return new Promise(res=>{let c=null,settled=false,t=0;
    const fin=v=>{if(settled)return;settled=true;clearTimeout(t);if(!v&&c){try{c.end(true);}catch(e){}}res(v);};
    try{c=mqtt.connect(url,{clientId:"fdm_"+NET.id(),clean:true,connectTimeout:6000,reconnectPeriod:0,keepalive:30,protocolVersion:4});}catch(e){res(null);return;}
    t=setTimeout(()=>{NET.log("timeout",url);fin(null);},7500);
    c.once("connect",()=>{NET.log("connected",url);c.options.reconnectPeriod=2000;fin(c);});
    c.once("error",e=>{NET.log("error",url,e&&e.message);fin(null);});
    c.once("close",()=>{NET.log("closed",url);fin(null);});
  });}
};
