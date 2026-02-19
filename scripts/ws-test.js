/* apps/api-nest/scripts/ws-test.js */
const { io } = require('socket.io-client');

const TOKEN = process.env.TOKEN;
const CONV_ID = process.env.CONV_ID;

const WS_URL = process.env.WS_URL || 'http://127.0.0.1:3000';
const WS_PATH = process.env.WS_PATH || '/socket.io';
const TRANSPORT = process.env.WS_TRANSPORT || 'websocket';
const ROLE = process.env.WS_ROLE || 'sender'; // sender | receiver

if (!TOKEN) {
  console.error('❌ Missing TOKEN in env file');
  process.exit(1);
}
if (!CONV_ID) {
  console.error('❌ Missing CONV_ID in env file');
  process.exit(1);
}

const transports =
  TRANSPORT === 'both'
    ? ['polling', 'websocket']
    : TRANSPORT === 'polling'
      ? ['polling']
      : ['websocket'];

console.log('WS_URL =', WS_URL);
console.log('WS_PATH =', WS_PATH);
console.log('TRANSPORTS =', transports.join(', '));
console.log('ROLE =', ROLE);

const socket = io(WS_URL, {
  path: WS_PATH,
  transports,
  auth: { token: TOKEN },
  reconnection: false,
  timeout: 10000,
});

function emitAck(event, payload) {
  return new Promise((resolve) =>
    socket.emit(event, payload, (ack) => resolve(ack)),
  );
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// keep "me" here (set on connect)
let me = null;

// =========================
// Connect flow
// =========================
socket.on('connect', async () => {
  console.log('✅ connected:', socket.id);
  console.log('engine transport:', socket.io.engine.transport.name);

  try {
    console.log('\n== BASIC ==');
    console.log('pong ack:', await emitAck('ping', { t: Date.now() }));

    const meAck = await emitAck('me', {});
    console.log('me ack:', meAck);
    me = meAck?.data || null;

    console.log(
      'join ack:',
      await emitAck('join', { conversationId: CONV_ID }),
    );

    // =========================
    // RECEIVER MODE (stay connected)
    // =========================
    if (ROLE === 'receiver') {
      console.log('\n✅ Receiver ready. Waiting incoming messages...');
      return; // keep alive, don't disconnect
    }

    // =========================
    // SENDER MODE
    // =========================
    console.log('\n== TYPING TEST ==');
    console.log(
      'typing on ack:',
      await emitAck('typing', { conversationId: CONV_ID, isTyping: true }),
    );
    await sleep(600);
    console.log(
      'typing off ack:',
      await emitAck('typing', { conversationId: CONV_ID, isTyping: false }),
    );

    console.log('\n== SEND MESSAGE ==');
    const clientMsgId = `m_${Date.now()}`;
    const sendAck = await emitAck('sendMessage', {
      conversationId: CONV_ID,
      clientMsgId,
      text: 'Salam from WS ✅ (WhatsApp receipts mode)',
    });
    console.log('send ack:', sendAck);

    console.log('\n⏳ Waiting receipt updates (3s)...');
    await sleep(3000);

    socket.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ ws test error:', e?.message ?? e);
    socket.disconnect();
    process.exit(1);
  }
});

// =========================
// Events (common)
// =========================
socket.on('typing', (p) => console.log('⌨️ typing event:', p));
socket.on('receipt:update', (p) => console.log('✅ receipt:update:', p));

// =========================
// Receiver behavior: auto delivered/read (WhatsApp-like)
// =========================
socket.on('message:new', async (msg) => {
  console.log('📩 message:new:', msg);

  // ✅ لا تدير receipts للرسائل تاعك
  if (me?.id && msg.senderId === me.id) return;

  // ✅ receiver فقط يدير auto-receipts
  if (ROLE !== 'receiver') return;

  try {
    const d = await emitAck('message:delivered', { messageId: msg.id });
    console.log('✅ auto delivered ack:', d);

    // simulate opening chat shortly
    await sleep(400);

    const r = await emitAck('message:read', {
      conversationId: msg.conversationId,
      messageIds: [msg.id],
    });
    console.log('✅ auto read ack:', r);
  } catch (e) {
    console.log('⚠️ auto receipt failed:', e?.message ?? e);
  }
});

// =========================
// Errors / disconnect
// =========================
socket.on('connect_error', (err) => {
  console.error('❌ connect_error:', err.message);
  console.error('details:', err);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 disconnected:', reason);
});
