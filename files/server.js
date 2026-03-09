const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { maxHttpBufferSize: 5e6 });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory store ──────────────────────────────────────────
const users      = {};   // socketId → { id, username, color }
const messages   = [];   // public chat history (last 100)
const reactions  = {};   // msgId → { emoji: [socketIds] }
const dmMessages = {};   // "id1-id2" → [msgs]
const MAX_MSGS   = 100;

function dmKey(a, b) { return [a, b].sort().join('-'); }

function generateColor(name) {
  const colors = [
    '#60a5fa','#34d399','#f472b6','#fb923c',
    '#a78bfa','#38bdf8','#4ade80','#facc15',
    '#f87171','#c084fc','#2dd4bf','#fb7185'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ── Socket.io ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`+ connected: ${socket.id}`);

  // ── Join ────────────────────────────────────────────────────
  socket.on('user:join', (username) => {
    const name = String(username || '').trim().substring(0, 20);
    if (!name) return;

    const taken = Object.values(users).some(
      u => u.username.toLowerCase() === name.toLowerCase()
    );
    if (taken) {
      socket.emit('join:error', 'Username already taken — try another!');
      return;
    }

    users[socket.id] = {
      id: socket.id,
      username: name,
      color: generateColor(name),
      joinedAt: Date.now()
    };

    socket.emit('join:ok');
    socket.emit('history', messages);
    io.emit('users:update', Object.values(users));
    io.emit('system:message', {
      text: `${name} joined`,
      timestamp: new Date().toISOString()
    });
    console.log(`JOIN  ${name}`);
  });

  // ── Public message ──────────────────────────────────────────
  socket.on('message:send', ({ text, imageData, replyTo } = {}) => {
    const user = users[socket.id];
    if (!user) return;

    const cleanText = String(text || '').trim().substring(0, 2000);
    if (!cleanText && !imageData) return;
    if (imageData && !String(imageData).startsWith('data:image/')) return;

    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: socket.id,
      username: user.username,
      color: user.color,
      text: cleanText,
      imageData: imageData || null,
      replyTo: replyTo ? {
        id: replyTo.id,
        username: String(replyTo.username || '').substring(0, 20),
        text: String(replyTo.text || '').substring(0, 100)
      } : null,
      timestamp: new Date().toISOString()
    };

    messages.push(msg);
    if (messages.length > MAX_MSGS) messages.shift();
    io.emit('message:receive', msg);
  });

  // ── Direct message ──────────────────────────────────────────
  socket.on('dm:send', ({ to, text, imageData, replyTo } = {}) => {
    const user   = users[socket.id];
    const target = users[to];
    if (!user || !target) return;

    const cleanText = String(text || '').trim().substring(0, 2000);
    if (!cleanText && !imageData) return;
    if (imageData && !String(imageData).startsWith('data:image/')) return;

    const msg = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from: socket.id,
      to: to,
      fromName: user.username,
      toName: target.username,
      text: cleanText,
      imageData: imageData || null,
      replyTo: replyTo ? {
        id: replyTo.id,
        username: String(replyTo.username || '').substring(0, 20),
        text: String(replyTo.text || '').substring(0, 100)
      } : null,
      timestamp: new Date().toISOString()
    };

    const key = dmKey(socket.id, to);
    if (!dmMessages[key]) dmMessages[key] = [];
    dmMessages[key].push(msg);

    socket.emit('dm:receive', msg);
    io.to(to).emit('dm:receive', msg);
    console.log(`DM  ${user.username} → ${target.username}`);
  });

  // ── Reactions ───────────────────────────────────────────────
  socket.on('reaction:add', ({ msgId, emoji } = {}) => {
    if (!reactions[msgId]) reactions[msgId] = {};
    if (!reactions[msgId][emoji]) reactions[msgId][emoji] = [];

    const idx = reactions[msgId][emoji].indexOf(socket.id);
    if (idx === -1) reactions[msgId][emoji].push(socket.id);
    else reactions[msgId][emoji].splice(idx, 1);

    io.emit('reaction:update', { msgId, reactions: reactions[msgId] });
  });

  // ── Typing ──────────────────────────────────────────────────
  socket.on('typing:start', () => {
    const user = users[socket.id];
    if (user) {
      socket.broadcast.emit('typing:update', {
        userId: socket.id,
        username: user.username,
        isTyping: true
      });
    }
  });

  socket.on('typing:stop', () => {
    socket.broadcast.emit('typing:update', {
      userId: socket.id,
      isTyping: false
    });
  });

  // ── History on demand ───────────────────────────────────────
  socket.on('get:history', () => {
    socket.emit('history', messages);
  });

  // ── WebRTC Signaling ────────────────────────────────────────
  // Server only relays tiny JSON messages — never touches audio/video
  socket.on('call:offer-request', ({ to, from, fromName, fromColor, callType } = {}) => {
    io.to(to).emit('call:incoming', { from, fromName, fromColor, callType });
  });

  socket.on('call:accepted', ({ to } = {}) => {
    io.to(to).emit('call:accepted');
  });

  socket.on('call:rejected', ({ to } = {}) => {
    io.to(to).emit('call:rejected');
  });

  socket.on('call:offer', ({ to, offer } = {}) => {
    io.to(to).emit('call:offer', { from: socket.id, offer });
  });

  socket.on('call:answer', ({ to, answer } = {}) => {
    io.to(to).emit('call:answer', { answer });
  });

  socket.on('call:ice', ({ to, candidate } = {}) => {
    io.to(to).emit('call:ice', { candidate });
  });

  socket.on('call:end', ({ to } = {}) => {
    io.to(to).emit('call:ended');
  });

  socket.on('call:busy', ({ to } = {}) => {
    io.to(to).emit('call:busy');
  });

  // ── Disconnect ──────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      console.log(`LEAVE ${user.username}`);
      delete users[socket.id];
      io.emit('users:update', Object.values(users));
      io.emit('system:message', {
        text: `${user.username} left`,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀  Chat server running → http://localhost:${PORT}\n`);
});
