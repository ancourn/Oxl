import fs from "fs";
import path from "path";

function fixNotifications() {
  const notifDir = path.join(process.cwd(), "utils");
  const notifFile = path.join(notifDir, "notifications.js");
  
  if (!fs.existsSync(notifDir)) fs.mkdirSync(notifDir, { recursive: true });
  
  if (!fs.existsSync(notifFile)) {
    fs.writeFileSync(notifFile, `
      export function notify(userId, message) {
        console.log("Notify", userId, message);
        // TODO: Replace with real push/websocket notification
      }
    `);
    console.log("Notifications utility created ✅");
  } else console.log("Notifications utility already exists ✅");
}

fixNotifications();