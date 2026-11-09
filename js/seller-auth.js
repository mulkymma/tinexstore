window.TINEX_ADMIN_AUTH = {
  authenticate(password, username) {
    const saved = localStorage.getItem("tinex_seller_users");
    const users = saved
      ? JSON.parse(saved)
      : [{ id: "seller-demo", name: "Demo Seller", username: "seller", password: "seller-demo", active: true }];
    if (!Array.isArray(users)) throw new Error("Saved seller accounts must be a list.");
    const normalizedUsername = username.trim().toLowerCase();
    const user = users.find(account =>
      account.active && account.username.toLowerCase() === normalizedUsername && account.password === password
    );
    return user ? {
      role: user.role || "seller",
      name: user.name,
      username: user.username,
      userId: user.id
    } : null;
  }
};
