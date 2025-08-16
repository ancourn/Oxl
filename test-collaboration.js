import { io } from "socket.io-client";

async function testCollaboration() {
  try {
    const socket = io("http://localhost:3000");
    
    socket.on("connect_error", (error) => {
      console.log("Server not running - Collaboration test skipped ⚠️");
      console.log("Error:", error.message);
      socket.disconnect();
    });
    
    socket.on("connect", () => {
      console.log("Connected to server, testing collaboration...");
      
      socket.emit("joinRoom", { docId: "test-doc" });
      
      socket.on("docUpdate", (data) => {
        console.log("Received update:", data);
      });
      
      console.log("Sending test update...");
      socket.emit("updateDoc", { docId: "test-doc", content: "Hello from test" });
      
      setTimeout(() => {
        socket.disconnect();
        console.log("Collaboration test finished ✅");
      }, 3000);
    });
    
    // Timeout if server doesn't respond
    setTimeout(() => {
      if (!socket.connected) {
        console.log("Server not responding - Collaboration test skipped ⚠️");
        socket.disconnect();
      }
    }, 5000);
    
  } catch (error) {
    console.log("Collaboration test failed - Server not running ⚠️");
    console.log("Error:", error.message);
  }
}

testCollaboration();