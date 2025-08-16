
      import { Server } from "socket.io";
      export default function handler(req, res) {
        if (!res.socket.server.io) {
          const io = new Server(res.socket.server);
          io.on("connection", socket => console.log("Socket connected ✅"));
          res.socket.server.io = io;
        }
        res.end();
      }
    