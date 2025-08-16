import fs from "fs";
import path from "path";

function fixSockets() {
  const socketDir = path.join(process.cwd(), "pages/api/sockets");
  if (!fs.existsSync(socketDir)) fs.mkdirSync(socketDir, { recursive: true });
  
  const wsFile = path.join(socketDir, "index.js");
  if (!fs.existsSync(wsFile)) {
    fs.writeFileSync(wsFile, `
      import { Server } from "socket.io";
      export default function handler(req, res) {
        if (!res.socket.server.io) {
          const io = new Server(res.socket.server);
          io.on("connection", socket => console.log("Socket connected ✅"));
          res.socket.server.io = io;
        }
        res.end();
      }
    `);
    console.log("WebSocket endpoint created ✅");
  } else console.log("WebSocket endpoint already exists ✅");
}

fixSockets();