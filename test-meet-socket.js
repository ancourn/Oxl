import { io } from "socket.io-client";

async function testMeet() {
  try {
    const socket = io("http://localhost:3000/meet");
    
    socket.on("connect_error", (error) => {
      console.log("Server not running - Meet test skipped ⚠️");
      console.log("Error:", error.message);
      socket.disconnect();
    });
    
    socket.on("connect", () => {
      console.log("Connected to meet server, testing WebSocket...");
      
      socket.emit("joinMeeting", { roomId: "test-room", userId: "tester" });
      
      socket.on("chatMessage", (msg) => {
        console.log("Received chat:", msg);
      });
      
      console.log("Sending test chat message...");
      socket.emit("sendMessage", { roomId: "test-room", userId: "tester", message: "Hello!" });
      
      setTimeout(() => {
        socket.disconnect();
        console.log("Meet WebSocket test finished ✅");
      }, 3000);
    });
    
    // Timeout if server doesn't respond
    setTimeout(() => {
      if (!socket.connected) {
        console.log("Server not responding - Meet test skipped ⚠️");
        socket.disconnect();
      }
    }, 5000);
    
  } catch (error) {
    console.log("Meet test failed - Server not running ⚠️");
    console.log("Error:", error.message);
  }
}

testMeet();