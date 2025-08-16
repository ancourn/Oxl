import fs from "fs";
import path from "path";

function fixPermissions() {
  const permDir = path.join(process.cwd(), "utils");
  const permFile = path.join(permDir, "permissions.js");
  
  if (!fs.existsSync(permDir)) fs.mkdirSync(permDir, { recursive: true });
  
  if (!fs.existsSync(permFile)) {
    fs.writeFileSync(permFile, `
      export function checkPermission(user, action) {
        if (!user) return false;
        if (user.role === "OWNER") return true;
        if (user.role === "MEMBER" && action !== "ADMIN_ACTION") return true;
        return false;
      }
    `);
    console.log("Permissions utility created ✅");
  } else console.log("Permissions utility already exists ✅");
}

fixPermissions();