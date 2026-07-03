import { JSDOM } from "jsdom";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@ekolglass.local";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "EkolGlass2026!";

function mergeCookies(existingCookies, setCookieHeaders) {
  for (const header of setCookieHeaders) {
    const pair = header.split(";")[0];
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex > 0) {
      existingCookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
    }
  }
}

function serializeCookies(cookieJar) {
  return Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join("; ");
}

function getSetCookieHeaders(response) {
  return response.headers.getSetCookie?.() ?? [];
}

async function request(path, options = {}) {
  return fetch(new URL(path, baseUrl), {
    redirect: "manual",
    ...options,
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const cookieJar = new Map();

const healthResponse = await request("/api/health");
assert(healthResponse.status === 200, `Health check failed with ${healthResponse.status}`);

const adminGuestResponse = await request("/admin");
assert(adminGuestResponse.status === 307, `Guest /admin should redirect, got ${adminGuestResponse.status}`);
const guestRedirectUrl = new URL(adminGuestResponse.headers.get("location") ?? "", baseUrl);
assert(
  guestRedirectUrl.pathname === "/giris" && guestRedirectUrl.searchParams.get("next") === "/admin",
  `Guest /admin redirected to ${adminGuestResponse.headers.get("location")}`,
);

const loginResponse = await request("/giris?next=/admin");
assert(loginResponse.status === 200, `Login page failed with ${loginResponse.status}`);
mergeCookies(cookieJar, getSetCookieHeaders(loginResponse));

const loginHtml = await loginResponse.text();
const dom = new JSDOM(loginHtml);
const form = dom.window.document.querySelector("form");
assert(form, "Login form not found");

const formData = new FormData();
for (const input of form.querySelectorAll("input")) {
  const name = input.getAttribute("name");

  if (name) {
    formData.append(name, input.getAttribute("value") ?? "");
  }
}

formData.set("email", adminEmail);
formData.set("password", adminPassword);

const loginSubmitResponse = await request("/giris?next=/admin", {
  method: "POST",
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
  body: formData,
});

mergeCookies(cookieJar, getSetCookieHeaders(loginSubmitResponse));
assert(loginSubmitResponse.status === 303, `Admin login should redirect, got ${loginSubmitResponse.status}`);
assert(loginSubmitResponse.headers.get("location") === "/admin", `Admin login redirected to ${loginSubmitResponse.headers.get("location")}`);
assert(cookieJar.has("ekolglass_session"), "Admin login did not set ekolglass_session cookie");

const adminResponse = await request("/admin", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(adminResponse.status === 200, `Authenticated /admin failed with ${adminResponse.status}`);

const adminHtml = await adminResponse.text();
assert(adminHtml.includes("Operasyon merkezi"), "Admin operations dashboard content not rendered");
assert(adminHtml.includes("Bayi Başvuruları"), "Admin sidebar navigation not rendered");

console.log(
  JSON.stringify(
    {
      status: "ok",
      baseUrl,
      checks: ["health", "guest-admin-redirect", "login-form", "admin-login", "authenticated-admin-dashboard"],
    },
    null,
    2,
  ),
);
