
      export function checkPermission(user, action) {
        if (!user) return false;
        if (user.role === "OWNER") return true;
        if (user.role === "MEMBER" && action !== "ADMIN_ACTION") return true;
        return false;
      }
    