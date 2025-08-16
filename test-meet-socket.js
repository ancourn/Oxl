import { io } from "socket.io-client";

async function testMeet() {
  const socket = io("http://localhost:3000/meet");
  
  socket.emit("joinMeeting", { roomId: "test-room", userId: "tester" });
  
  socket.on("chatMessage", (msg) => console.log("Received chat:", msg));
  
  console.log("Sending test chat message...");
  socket.emit("sendMessage", { roomId: "test-room", userId: "tester", message: "Hello!" });
  
  setTimeout(() => {
    socket.disconnect();
    console.log("Meet WebSocket test finished ✅");
  }, 3000);
}

testMeet();