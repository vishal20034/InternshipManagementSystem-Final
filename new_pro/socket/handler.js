const { Server: SocketIOServer } = require("socket.io");
const { verifyChatIdentity, roomsAllowedFor, canAccessRoom, canDeleteIn } = require("../src/middleware/auth");
const Message = require("../../models/Message");
const BlockList = require("../../models/BlockList");

function setupSocket(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.use(async (socket, nextM) => {
    try {
      const identity = await verifyChatIdentity(socket.handshake.auth || {});
      if (!identity) return nextM(new Error("unauthorized"));
      socket.data.identity = identity;
      roomsAllowedFor(identity).forEach(r => socket.join(r));
      nextM();
    } catch (e) { nextM(new Error("auth_error")); }
  });

  io.on("connection", (socket) => {
    const identity = socket.data.identity;

    socket.on("join_room", (p) => {
      if (canAccessRoom(identity, p?.room)) socket.join(p.room);
    });

    socket.on("send_message", async (p, ack) => {
      try {
        const room = p?.room;
        const text = (p?.text || "").toString().trim().slice(0, 4000);
        if (!room || !text || !canAccessRoom(identity, room)) {
          if (ack) ack({ success: false });
          return;
        }
        const blocked = await BlockList.findOne({ chatRoom: room, blockedUser: identity.id });
        if (blocked) {
          if (ack) ack({ success: false, blocked: true });
          return;
        }
        const doc = await Message.create({
          chatRoom: room, senderId: identity.id, senderName: identity.name,
          senderRole: identity.role, senderDomain: identity.domain || "",
          message: text, timestamp: new Date()
        });
        io.to(room).emit("receive_message", doc);
        if (ack) ack({ success: true, messageId: String(doc._id) });
      } catch (e) { if (ack) ack({ success: false }); }
    });

    socket.on("delete_message", async (p, ack) => {
      try {
        const msg = p?.messageId ? await Message.findById(p.messageId) : null;
        if (!msg || !canDeleteIn(identity, msg.chatRoom)) {
          if (ack) ack({ success: false });
          return;
        }
        await Message.findByIdAndDelete(msg._id);
        io.to(msg.chatRoom).emit("message_deleted", { messageId: String(msg._id), room: msg.chatRoom });
        if (ack) ack({ success: true });
      } catch (e) { if (ack) ack({ success: false }); }
    });
  });

  return io;
}

module.exports = { setupSocket };