// Local MQTT-over-WebSocket relay for testing phones without the internet.
// Usage: node test/broker.js 8888   then open play/?broker=ws://127.0.0.1:8888
const { Aedes } = require('aedes');
const { WebSocketServer, createWebSocketStream } = require('ws');

(async () => {
  const port = Number(process.argv[2] || 8888);
  const broker = await Aedes.createBroker();
  const wss = new WebSocketServer({ port, handleProtocols: (protocols) => (protocols.has('mqtt') ? 'mqtt' : false) });
  wss.on('connection', (socket) => broker.handle(createWebSocketStream(socket)));
  console.log('test relay on ws://127.0.0.1:' + port);
})();
