window.TINEX_ADMIN_AUTH = {
  authenticate(password) {
    return password === "tinex-demo"
      ? { role: "super-admin", name: "Super admin", username: "admin" }
      : null;
  }
};
