import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('ws-test')
export class WsTestController {
  @Get()
  serve(@Res() res: Response) {
    res.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WebSocket Chat Test</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #333; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 16px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .5px; color: #666; margin-bottom: 8px; }
  section { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .row + .row { margin-top: 8px; }
  label { font-size: 12px; font-weight: 600; color: #555; min-width: 60px; }
  input, select, textarea { font-size: 13px; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; }
  input[type="text"], input[type="url"] { flex: 1; min-width: 200px; }
  textarea { width: 100%; min-height: 80px; resize: vertical; margin-top: 6px; }
  button { padding: 6px 14px; border-radius: 4px; border: 1px solid #ccc; background: #fff; font-size: 13px; cursor: pointer; }
  button:hover:not(:disabled) { background: #eee; }
  button:disabled { opacity: .5; cursor: default; }
  button.primary { background: #0066ff; color: #fff; border-color: #0066ff; }
  button.primary:hover:not(:disabled) { background: #0052cc; }
  button.danger { background: #e53e3e; color: #fff; border-color: #e53e3e; }
  button.danger:hover:not(:disabled) { background: #c53030; }
  #status { font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 12px; }
  #status.connected { background: #c6f6d5; color: #22543d; }
  #status.disconnected { background: #fed7d7; color: #742a2a; }
  #status.connecting { background: #fefcbf; color: #744210; }
  #log { background: #1a1a2e; color: #e0e0e0; font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; padding: 12px; border-radius: 4px; max-height: 400px; overflow-y: auto; line-height: 1.6; }
  #log .time { color: #888; }
  #log .inbound { color: #48bb78; }
  #log .outbound { color: #63b3ed; }
  #log .ack { color: #ecc94b; }
  #log .error { color: #fc8181; }
  #log .info { color: #b794f4; }
</style>
</head>
<body>
<h1>WebSocket Chat Test</h1>

<section>
  <h2>Connection</h2>
  <div class="row">
    <label>Server</label>
    <input type="url" id="url" value="ws://localhost:3000/chat" placeholder="ws://..." />
  </div>
  <div class="row">
    <label>Token</label>
    <input type="text" id="token" placeholder="JWT auth token" />
  </div>
  <div class="row">
    <button class="primary" id="connectBtn" onclick="connect()">Connect</button>
    <button class="danger" id="disconnectBtn" onclick="disconnect()" disabled>Disconnect</button>
    <span id="status" class="disconnected">Disconnected</span>
  </div>
</section>

<section>
  <h2>Send Event</h2>
  <div class="row">
    <label>Event</label>
    <select id="eventSelect" onchange="updatePayload()">
      <option value="joinGroup">joinGroup</option>
      <option value="leaveGroup">leaveGroup</option>
      <option value="sendMessage">sendMessage</option>
      <option value="typing">typing</option>
    </select>
  </div>
  <textarea id="payload" spellcheck="false"></textarea>
  <div class="row" style="margin-top:8px">
    <button class="primary" id="sendBtn" onclick="sendEvent()" disabled>Send</button>
  </div>
</section>

<section>
  <h2>Event Log</h2>
  <div id="log"></div>
  <div class="row" style="margin-top:8px">
    <button onclick="clearLog()">Clear</button>
  </div>
</section>

<script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
<script>
  let socket = null;

  const TEMPLATES = {
    joinGroup: JSON.stringify({ groupId: '' }, null, 2),
    leaveGroup: JSON.stringify({ groupId: '' }, null, 2),
    sendMessage: JSON.stringify({ groupId: '', content: '' }, null, 2),
    typing: JSON.stringify({ groupId: '', isTyping: true }, null, 2),
  };

  function updatePayload() {
    const event = document.getElementById('eventSelect').value;
    document.getElementById('payload').value = TEMPLATES[event];
  }
  updatePayload();

  function log(type, msg) {
    const el = document.getElementById('log');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const div = document.createElement('div');
    div.innerHTML = '<span class="time">[' + time + ']</span> <span class="' + type + '">' + escapeHtml(msg) + '</span>';
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function setStatus(text, cls) {
    const el = document.getElementById('status');
    el.textContent = text;
    el.className = cls;
  }

  function connect() {
    const url = document.getElementById('url').value.trim();
    const token = document.getElementById('token').value.trim();
    if (!url) return alert('Server URL is required');

    setStatus('Connecting...', 'connecting');
    document.getElementById('connectBtn').disabled = true;

    try {
      socket = io(url, {
        auth: token ? { token } : undefined,
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        setStatus('Connected (' + socket.id + ')', 'connected');
        document.getElementById('disconnectBtn').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        log('info', 'Connected: ' + socket.id);
      });

      socket.on('disconnect', (reason) => {
        setStatus('Disconnected', 'disconnected');
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('disconnectBtn').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        log('info', 'Disconnected: ' + reason);
        socket = null;
      });

      socket.on('connect_error', (err) => {
        setStatus('Error: ' + err.message, 'disconnected');
        document.getElementById('connectBtn').disabled = false;
        log('error', 'Connection error: ' + err.message);
        socket = null;
      });

      // Server → Client events
      socket.on('newMessage', (data) => {
        log('inbound', '→ newMessage: ' + JSON.stringify(data));
      });

      socket.on('typingIndicator', (data) => {
        log('inbound', '→ typingIndicator: ' + JSON.stringify(data));
      });

      socket.on('error', (data) => {
        log('error', '→ error: ' + JSON.stringify(data));
      });
    } catch (err) {
      setStatus('Error', 'disconnected');
      document.getElementById('connectBtn').disabled = false;
      log('error', 'Exception: ' + err.message);
    }
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    setStatus('Disconnected', 'disconnected');
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
    document.getElementById('sendBtn').disabled = true;
  }

  function sendEvent() {
    if (!socket || !socket.connected) {
      alert('Not connected');
      return;
    }
    const event = document.getElementById('eventSelect').value;
    let payload;
    try {
      payload = JSON.parse(document.getElementById('payload').value);
    } catch (e) {
      alert('Invalid JSON payload');
      return;
    }
    log('outbound', '← ' + event + ': ' + JSON.stringify(payload));
    socket.emit(event, payload, (ack) => {
      log('ack', '✓ ack ' + event + ': ' + JSON.stringify(ack));
    });
  }

  function clearLog() {
    document.getElementById('log').innerHTML = '';
  }
</script>
</body>
</html>`);
  }
}
