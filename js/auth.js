/* ═══════════════════════════════════════════════════════════════
   Wavely — accounts
   Supabase Auth with Google OAuth and email/password. Exposes
   window.WavelyAuth so the player can react to sign in / sign out.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const client = window.supabaseClient;
  const listeners = new Set();
  const $ = (selector) => document.querySelector(selector);

  let mode = "login";

  const auth = { user: null, ready: null, displayName };
  window.WavelyAuth = auth;

  function displayName(user) {
    if (!user) return "";
    const meta = user.user_metadata || {};
    return meta.full_name || meta.name || (user.email || "").split("@")[0];
  }

  function emit() {
    listeners.forEach((fn) => {
      try {
        fn(auth.user);
      } catch (err) {
        console.error(err);
      }
    });
    window.dispatchEvent(new CustomEvent("authChanged", { detail: { user: auth.user } }));
  }

  function setMessage(text, type) {
    const el = $("#authMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "auth-msg" + (type ? " " + type : "");
  }

  function renderAuthUI() {
    const loggedIn = Boolean(auth.user);
    const authBtn = $("#authBtn");
    const avatar = $("#avatarBtn");
    const menu = $("#accountMenu");

    if (authBtn) authBtn.hidden = loggedIn;

    if (avatar) {
      avatar.hidden = !loggedIn;
      const name = displayName(auth.user);
      avatar.textContent = loggedIn ? (name.trim().charAt(0).toUpperCase() || "U") : "B";
      avatar.title = loggedIn ? name : "Account";
    }

    if (menu) {
      menu.hidden = true;
      if (avatar) avatar.setAttribute("aria-expanded", "false");
    }

    const nameEl = $("#accountName");
    const emailEl = $("#accountEmail");
    if (nameEl) nameEl.textContent = loggedIn ? displayName(auth.user) : "";
    if (emailEl) emailEl.textContent = loggedIn ? auth.user.email || "" : "";
  }

  function setMode(next) {
    mode = next === "signup" ? "signup" : "login";
    const signup = mode === "signup";

    const title = $("#authTitle");
    const submit = $("#authSubmit");
    const switchText = $("#authSwitchText");
    const switchBtn = $("#authSwitch");
    const password = $("#authPassword");

    if (title) title.textContent = signup ? "Create your account" : "Log in to Wavely";
    if (submit) submit.textContent = signup ? "Sign up" : "Log in";
    if (switchText) switchText.textContent = signup ? "Already have an account?" : "New here?";
    if (switchBtn) switchBtn.textContent = signup ? "Log in" : "Create an account";
    if (password) password.autocomplete = signup ? "new-password" : "current-password";
  }

  function openModal(nextMode = "login") {
    const modal = $("#authModal");
    if (!modal) return;
    setMode(nextMode);
    setMessage("");
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setTimeout(() => $("#authEmail")?.focus(), 40);
  }

  function closeModal() {
    const modal = $("#authModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    closeModal();
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    if (data && data.session) closeModal();
    else setMessage("Confirmation email bheja gaya hai — confirm karke log in karo.", "success");
  }

  async function signInWithGoogle() {
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname + location.search }
    });
    if (error) setMessage(error.message, "error");
  }

  async function signOut() {
    try {
      await client.auth.signOut();
    } finally {
      closeModal();
    }
  }

  function bind() {
    $("#authBtn")?.addEventListener("click", () => openModal("login"));
    $("#authClose")?.addEventListener("click", closeModal);
    $("#authModal")?.addEventListener("click", (event) => {
      if (event.target.id === "authModal") closeModal();
    });
    $("#authSwitch")?.addEventListener("click", () => setMode(mode === "signup" ? "login" : "signup"));
    $("#authGoogle")?.addEventListener("click", signInWithGoogle);

    $("#authForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = ($("#authEmail")?.value || "").trim();
      const password = $("#authPassword")?.value || "";
      const submit = $("#authSubmit");
      const label = submit ? submit.textContent : "";

      if (submit) {
        submit.disabled = true;
        submit.textContent = "Please wait…";
      }
      setMessage("");

      try {
        if (mode === "signup") await signUp(email, password);
        else await signIn(email, password);
      } catch (err) {
        setMessage(err?.message || String(err), "error");
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = label;
        }
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  Object.assign(auth, {
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    openModal,
    closeModal,
    setMode
  });

  if (!client) {
    console.error("Supabase client missing — accounts disabled");
    return;
  }

  bind();
  renderAuthUI();

  auth.ready = (async () => {
    const { data } = await client.auth.getSession();
    auth.user = data?.session?.user || null;
    renderAuthUI();
    emit();

    client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      const changed = (nextUser && nextUser.id) !== (auth.user && auth.user.id);
      auth.user = nextUser;
      renderAuthUI();
      if (changed) emit();
    });
  })();
})();
