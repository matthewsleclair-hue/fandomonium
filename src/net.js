/* Realtime relay shared by the TV (host) and the phones.
   Messages go through a free public MQTT broker over secure WebSockets, so phones can join
   from any network. Topics: fandomonium/v1/ROOM/hello (host presence, retained),
   .../h (phones to host) and .../p/PLAYERID (host to one phone). */
const NET={
  brokers:["wss://broker.emqx.io:8084/mqtt","wss://broker.hivemq.com:8884/mqtt"],
  prefix:"fandomonium/v1/",
  joinUrl:"https://matthewsleclair-hue.github.io/fandomonium/join/",
  // ?broker=ws://... points both sides at a test relay
  override(){try{return new URLSearchParams(location.search).get("broker")||null;}catch(e){return null;}},
  id(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);},
  connectOne(url){return new Promise(res=>{let c=null,settled=false,t=0;
    const fin=v=>{if(settled)return;settled=true;clearTimeout(t);if(!v&&c){try{c.end(true);}catch(e){}}res(v);};
    try{c=mqtt.connect(url,{clientId:"fdm_"+NET.id(),clean:true,connectTimeout:6000,reconnectPeriod:0,keepalive:30,protocolVersion:4});}catch(e){res(null);return;}
    t=setTimeout(()=>fin(null),7500);
    c.once("connect",()=>{c.options.reconnectPeriod=2000;fin(c);});
    c.once("error",()=>fin(null));
    c.once("close",()=>fin(null));
  });}
};
