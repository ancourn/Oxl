import { io } from "socket.io-client";

async function testCollaboration() {
  const socket = io("http://localhost:3000");
  
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
}

testCollaboration();