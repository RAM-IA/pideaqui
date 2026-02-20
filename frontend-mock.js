(() => {
  const USERS_KEY = "pideaqui_mock_users";
  const SESSION_KEY = "pideaqui_mock_session";

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getUsers() {
    const list = safeParse(localStorage.getItem(USERS_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    return safeParse(localStorage.getItem(SESSION_KEY), null);
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function normalizeSubdomain(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeAccount(value) {
    return String(value || "").trim().toLowerCase();
  }

  function showMessage(container, text, type) {
    if (!container) return;
    container.textContent = text;
    container.className = "form-message " + (type || "info");
    container.hidden = false;
  }

  function initRegistro() {
    const form = document.getElementById("registroForm");
    if (!form) return;

    const message = document.getElementById("registroMessage");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const ownerName = String(document.getElementById("ownerName")?.value || "").trim();
      const storeName = String(document.getElementById("storeName")?.value || "").trim();
      const email = normalizeEmail(document.getElementById("email")?.value);
      const phone = String(document.getElementById("phone")?.value || "").trim();
      const subdomain = normalizeSubdomain(document.getElementById("subdomain")?.value);
      const password = String(document.getElementById("password")?.value || "").trim();
      const category = String(document.getElementById("category")?.value || "").trim();
      const city = String(document.getElementById("city")?.value || "").trim();
      const notes = String(document.getElementById("notes")?.value || "").trim();

      if (!ownerName || !storeName || !email || !subdomain || !password) {
        showMessage(message, "Completa nombre, tienda, correo, subdominio y contraseña.", "error");
        return;
      }

      const users = getUsers();
      const exists = users.some(
        (user) => user.email === email || user.subdomain === subdomain
      );

      if (exists) {
        showMessage(message, "Ya existe una cuenta con ese correo o subdominio.", "error");
        return;
      }

      users.push({
        ownerName,
        storeName,
        email,
        phone,
        subdomain,
        password,
        category,
        city,
        notes,
        createdAt: new Date().toISOString()
      });
      saveUsers(users);

      saveSession({
        ownerName,
        storeName,
        email,
        subdomain,
        loggedAt: new Date().toISOString()
      });

      showMessage(message, "Registro guardado en modo local. Redirigiendo al panel...", "success");

      setTimeout(() => {
        window.location.href = "dashboard-demo.html";
      }, 700);
    });
  }

  function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const message = document.getElementById("loginMessage");

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const account = normalizeAccount(document.getElementById("account")?.value);
      const password = String(document.getElementById("password")?.value || "").trim();

      if (!account || !password) {
        showMessage(message, "Ingresa correo o subdominio y contraseña.", "error");
        return;
      }

      const users = getUsers();
      const user = users.find(
        (item) =>
          item.email === account ||
          item.subdomain === account ||
          (item.subdomain + ".pidoaqui.com") === account
      );

      if (!user || user.password !== password) {
        showMessage(message, "Credenciales inválidas en modo local.", "error");
        return;
      }

      saveSession({
        ownerName: user.ownerName,
        storeName: user.storeName,
        email: user.email,
        subdomain: user.subdomain,
        loggedAt: new Date().toISOString()
      });

      showMessage(message, "Sesión iniciada. Redirigiendo al panel...", "success");
      setTimeout(() => {
        window.location.href = "dashboard-demo.html";
      }, 500);
    });
  }

  function initDashboard() {
    const root = document.getElementById("sessionBanner");
    if (!root) return;

    const session = getSession();
    const title = document.getElementById("dashboardTitle");

    if (session && title) {
      title.textContent =
        "Panel de control · " + session.subdomain + ".pidoaqui.com";
    }

    if (session) {
      root.innerHTML =
        '<strong>Sesión local:</strong> ' +
        session.storeName +
        " · " +
        session.email +
        ' <button class="btn btn-outline" id="logoutBtn" type="button">Cerrar sesión</button>';
    } else {
      root.innerHTML =
        'No hay sesión activa en este navegador. <a class="btn btn-outline" href="login.html">Ir a login</a>';
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        clearSession();
        window.location.href = "login.html";
      });
    }
  }

  function bootstrap() {
    initRegistro();
    initLogin();
    initDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();