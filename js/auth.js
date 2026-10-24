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

  // Provider availability from the Supabase project (null = not known yet).
  const providers = { google: null, facebook: null, signupDisabled: null, autoconfirm: null };

  const SOCIAL_PROVIDERS = [
    { key: "google", button: "#authGoogle", label: "Google" },
    { key: "facebook", button: "#authFacebook", label: "Facebook" }
  ];

  const auth = { user: null, ready: null, displayName };
  window.WavelyAuth = auth;

  const ERROR_TEXT = {
    invalid_credentials: "Email ya password galat hai — dobara try karo.",
    email_not_confirmed: "Email abhi confirm nahi hua. Inbox me link kholo, phir log in karo.",
    user_already_exists: "Ye email pehle se registered hai — log in karo.",
    email_exists: "Ye email pehle se registered hai — log in karo.",
    weak_password: "Password kamzor hai — kam se kam 6 characters rakho.",
    signup_disabled: "Naye accounts abhi band hain. Thodi der baad try karo.",
    provider_disabled: "Ye login option abhi setup nahi hua — email se log in karo.",
    validation_failed: "Ye login option abhi setup nahi hua — email se log in karo.",
    over_email_send_rate_limit: "Bahut zyada emails bheje gaye — kuch minute baad try karo.",
    over_request_rate_limit: "Bahut zyada attempts — kuch der baad try karo.",
    same_password: "Naya password purane se alag hona chahiye.",
    otp_expired: "Link expire ho gaya — dobara bhejwao.",
    access_denied: "Google login cancel ho gaya — dobara try karo."
  };

  // Turn Supabase's raw API strings into something a visitor can act on.
  function friendlyMessage(error) {
    const code = (error && (error.code || error.error_code)) || "";
    const raw = (error && (error.message || error.msg)) || String(error || "");

    if (ERROR_TEXT[code]) return ERROR_TEXT[code];
    if (/access_denied|user denied|denied access/i.test(raw) || code === "access_denied")
      return ERROR_TEXT.access_denied;
    if (/unsupported provider|provider is not enabled|provider.*disabled/i.test(raw))
      return ERROR_TEXT.provider_disabled;
    if (/signups? not allowed|signups? disabled|signup.*not allowed/i.test(raw))
      return ERROR_TEXT.signup_disabled;
    if (/invalid login credentials/i.test(raw)) return ERROR_TEXT.invalid_credentials;
    if (/email not confirmed/i.test(raw)) return ERROR_TEXT.email_not_confirmed;
    if (/user already registered|already registered/i.test(raw)) return ERROR_TEXT.user_already_exists;
    if (/password should be at least|weak password/i.test(raw)) return ERROR_TEXT.weak_password;
    if (/rate limit|too many requests/i.test(raw)) return ERROR_TEXT.over_request_rate_limit;
    if (/failed to fetch|networkerror|load failed/i.test(raw))
      return "Network error — internet check karke dobara try karo.";
    return raw || "Kuch galat ho gaya — dobara try karo.";
  }

  function showNote(text) {
    const note = $("#authNote");
    if (!note) return;
    note.textContent = text || "";
    note.hidden = !text;
  }

  function applyProviderUI() {
    // Hide only the methods this project has not enabled (unknown = assume available).
    const noneAvailable = SOCIAL_PROVIDERS.every(({ key, button }) => {
      const available = providers[key] !== false;
      const el = $(button);
      if (el) el.hidden = !available;
      return !available;
    });

    const divider = $("#authOr");
    if (divider) divider.hidden = noneAvailable;

    if (mode === "signup" && providers.signupDisabled) {
      showNote("Naye accounts abhi band hain — sirf existing account se log in ho sakta hai.");
    } else if (noneAvailable) {
      showNote("Social login abhi available nahi hai — email aur password se log in karo.");
    } else {
      showNote("");
    }
  }

  async function loadProviders() {
    const base = client.supabaseUrl;
    const key = client.supabaseKey;
    if (!base || !key) return;
    try {
      const res = await fetch(base + "/auth/v1/settings", { headers: { apikey: key } });
      if (!res.ok) return;
      const data = await res.json();
      const external = data.external || {};
      providers.google = Boolean(external.google);
      providers.facebook = Boolean(external.facebook);
      providers.signupDisabled = Boolean(data.disable_signup);
      providers.autoconfirm = data.mailer_autoconfirm !== false;
      applyProviderUI();
    } catch (err) {
      console.warn("Auth settings unavailable", err);
    }
  }

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

    applyProviderUI();
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

  async function signInWithProvider(provider) {
    const entry = SOCIAL_PROVIDERS.find((item) => item.key === provider);
    const button = entry ? $(entry.button) : null;
    const label = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;
      button.textContent = (entry ? entry.label : "Provider") + " par le ja rahe hain…";
    }
    setMessage("");

    // supabase-js redirects the whole tab to /auth/v1/authorize, which answers with a raw
    // JSON error page when the provider is off. Make sure we know before we navigate.
    try {
      if (providers[provider] === null) await loadProviders();

      if (providers[provider] === false) {
        if (button) {
          button.disabled = false;
          button.innerHTML = label;
        }
        setMessage(friendlyMessage({ code: "provider_disabled" }), "error");
        applyProviderUI();
        return;
      }
    } catch (err) {
      console.warn("Provider check failed", err);
    }

    try {
      const redirectTo = location.origin + location.pathname;
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      });
      if (error) setMessage(friendlyMessage(error), "error");
    } catch (err) {
      setMessage(friendlyMessage(err), "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = label;
      }
    }
  }

  const signInWithGoogle = () => signInWithProvider("google");
  const signInWithFacebook = () => signInWithProvider("facebook");

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
    $("#authFacebook")?.addEventListener("click", signInWithFacebook);

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
        setMessage(friendlyMessage(err), "error");
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
    signInWithFacebook,
    signOut,
    openModal,
    closeModal,
    setMode
  });

  const AUTH_URL_KEYS = [
    "error", "error_code", "error_description", "error_uri", "code", "state",
    "access_token", "refresh_token", "expires_in", "expires_at", "token_type",
    "type", "provider_token", "provider_refresh_token"
  ];

  // Read (but do not touch) what Supabase put in the URL after a redirect, so we can
  // explain a failed Google round-trip instead of silently landing back on the site.
  function parseAuthRedirect() {
    const hash = location.hash.startsWith("#") ? location.hash.slice(1) : "";
    const search = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(hash);
    const get = (key) => search.get(key) || hashParams.get(key);

    return {
      error: get("error_description") || get("error"),
      errorCode: get("error_code"),
      hadToken: Boolean(get("code") || get("access_token")),
      present: AUTH_URL_KEYS.some((key) => search.has(key) || hashParams.has(key))
    };
  }

  // Only safe once Supabase has finished reading the URL (i.e. after getSession()).
  function cleanAuthUrl(info) {
    if (!info.present) return;

    const search = new URLSearchParams(location.search);
    const hash = location.hash.startsWith("#") ? location.hash.slice(1) : "";
    const hashParams = new URLSearchParams(hash);
    AUTH_URL_KEYS.forEach((key) => {
      search.delete(key);
      hashParams.delete(key);
    });

    const route = location.hash.startsWith("#/") ? location.hash : "";
    const qs = search.toString();
    const rest = hashParams.toString();
    const nextHash = rest ? "#" + rest : route;

    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + nextHash);
  }

  if (!client) {
    console.error("Supabase client missing — accounts disabled");
    return;
  }

  const redirectInfo = parseAuthRedirect();

  bind();
  renderAuthUI();

  auth.ready = (async () => {
    loadProviders();

    const { data } = await client.auth.getSession();
    auth.user = data?.session?.user || null;
    renderAuthUI();
    emit();

    cleanAuthUrl(redirectInfo);

    if (redirectInfo.error) {
      openModal("login");
      setMessage(friendlyMessage({ code: redirectInfo.errorCode, message: redirectInfo.error }), "error");
    } else if (redirectInfo.hadToken && !auth.user) {
      openModal("login");
      setMessage("Google login complete nahi ho paya — dobara try karo.", "error");
    }

    client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      const changed = (nextUser && nextUser.id) !== (auth.user && auth.user.id);
      auth.user = nextUser;
      renderAuthUI();
      if (changed) emit();
    });
  })();
})();
