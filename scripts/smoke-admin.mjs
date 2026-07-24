import { JSDOM } from "jsdom";
import Database from "better-sqlite3";
import { hash } from "bcryptjs";
import { resolveTestDatabasePath } from "./sqlite-database-path.mjs";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const adminEmail =
  process.env.SMOKE_ADMIN_EMAIL ??
  process.env.SEED_ADMIN_EMAIL ??
  "admin@ekolglass.local";
const adminPassword =
  process.env.SMOKE_ADMIN_PASSWORD ??
  process.env.SEED_ADMIN_PASSWORD ??
  "EkolGlass2026!";
const databasePath = resolveTestDatabasePath();

function mergeCookies(existingCookies, setCookieHeaders) {
  for (const header of setCookieHeaders) {
    const pair = header.split(";")[0];
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex > 0) {
      existingCookies.set(
        pair.slice(0, separatorIndex),
        pair.slice(separatorIndex + 1),
      );
    }
  }
}

function serializeCookies(cookieJar) {
  return Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join(
    "; ",
  );
}

function getSetCookieHeaders(response) {
  return response.headers.getSetCookie?.() ?? [];
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  const method = options.method?.toUpperCase() ?? "GET";

  if (!["GET", "HEAD"].includes(method) && !headers.has("Origin")) {
    headers.set("Origin", new URL(baseUrl).origin);
  }

  return fetch(new URL(path, baseUrl), {
    redirect: "manual",
    ...options,
    headers,
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const cookieJar = new Map();

const healthResponse = await request("/api/health");
assert(
  healthResponse.status === 200,
  `Health check failed with ${healthResponse.status}`,
);
const health = await healthResponse.json();

const livenessResponse = await request("/api/health/live");
assert(livenessResponse.status === 200, `Liveness check failed with ${livenessResponse.status}`);
assert((await livenessResponse.json()).status === "ok", "Liveness response is not ok");
assert(
  ["ok", "degraded"].includes(health.authentication),
  "Health check did not expose authentication status",
);
assert(
  health.mediaStorage === "ok" && ["LOCAL", "S3"].includes(health.mediaStorageProvider),
  "Health check did not expose a ready media storage provider",
);

const adminGuestResponse = await request("/admin");
assert(
  adminGuestResponse.status === 307,
  `Guest /admin should redirect, got ${adminGuestResponse.status}`,
);
const guestRedirectUrl = new URL(
  adminGuestResponse.headers.get("location") ?? "",
  baseUrl,
);
assert(
  guestRedirectUrl.pathname === "/yonetim/giris" &&
    guestRedirectUrl.searchParams.get("next") === "/admin",
  `Guest /admin redirected to ${adminGuestResponse.headers.get("location")}`,
);

const dealerGuestResponse = await request("/bayi");
assert(
  dealerGuestResponse.status === 307,
  `Guest /bayi should redirect, got ${dealerGuestResponse.status}`,
);
const dealerGuestRedirectUrl = new URL(
  dealerGuestResponse.headers.get("location") ?? "",
  baseUrl,
);
assert(
  dealerGuestRedirectUrl.pathname === "/giris" &&
    dealerGuestRedirectUrl.searchParams.get("next") === "/bayi",
  `Guest /bayi redirected to ${dealerGuestResponse.headers.get("location")}`,
);

const publicHomeResponse = await request("/");
assert(
  publicHomeResponse.status === 200,
  `Public home failed with ${publicHomeResponse.status}`,
);
for (const [header, expected] of [
  ["strict-transport-security", "max-age=63072000; includeSubDomains"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
]) {
  assert(
    publicHomeResponse.headers.get(header) === expected,
    `Public home security header ${header} is missing or invalid`,
  );
}
assert(
  publicHomeResponse.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"),
  "Public home CSP does not block framing",
);
const publicHomeHtml = await publicHomeResponse.text();
assert(
  publicHomeHtml.includes("EkolGlass Otomotiv Cam Çözümleri"),
  "Commerce home banner not rendered",
);
assert(
  !publicHomeHtml.includes('href="/admin"'),
  "Public home exposed an admin link",
);

const sitemapResponse = await request("/sitemap.xml");
assert(
  sitemapResponse.status === 200,
  `Sitemap failed with ${sitemapResponse.status}`,
);
const sitemapXml = await sitemapResponse.text();
assert(
  sitemapXml.includes("/urunler"),
  "Sitemap does not include public products",
);
assert(
  !sitemapXml.includes("/admin") &&
    !sitemapXml.includes("/bayi/") &&
    !sitemapXml.includes("/giris"),
  "Sitemap exposed private routes",
);

const robotsResponse = await request("/robots.txt");
assert(robotsResponse.status === 200, `Robots failed with ${robotsResponse.status}`);
const robotsText = await robotsResponse.text();
for (const privateRoute of ["/admin", "/yonetim", "/bayi/", "/giris", "/aktivasyon/", "/parola-sifirla/", "/api/"]) {
  assert(robotsText.includes(`Disallow: ${privateRoute}`), `Robots does not disallow ${privateRoute}`);
}
assert(robotsText.includes("Sitemap:"), "Robots does not advertise the canonical sitemap");

const loginResponse = await request("/yonetim/giris?next=/admin");
assert(
  loginResponse.status === 200,
  `Login page failed with ${loginResponse.status}`,
);
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

const loginSubmitResponse = await request("/yonetim/giris?next=/admin", {
  method: "POST",
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
  body: formData,
});

mergeCookies(cookieJar, getSetCookieHeaders(loginSubmitResponse));
assert(
  loginSubmitResponse.status === 303,
  `Admin login should redirect, got ${loginSubmitResponse.status}`,
);
assert(
  loginSubmitResponse.headers.get("location") === "/admin",
  `Admin login redirected to ${loginSubmitResponse.headers.get("location")}`,
);
assert(
  cookieJar.has("ekolglass_session"),
  "Admin login did not set ekolglass_session cookie",
);

const adminResponse = await request("/admin", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(
  adminResponse.status === 200,
  `Authenticated /admin failed with ${adminResponse.status}`,
);

const adminHtml = await adminResponse.text();
const adminIntegrationsResponse = await request("/admin/entegrasyonlar", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  adminIntegrationsResponse.status === 200,
  `Authenticated admin integrations failed with ${adminIntegrationsResponse.status}`,
);
const adminIntegrationsHtml = await adminIntegrationsResponse.text();
assert(
  adminIntegrationsHtml.includes("Entegrasyon kuyruğu") &&
    adminIntegrationsHtml.includes('href="/admin/entegrasyonlar"') &&
    adminIntegrationsHtml.includes('data-testid="system-alert-delivery"') &&
    adminIntegrationsHtml.includes("City Lojistik aktivasyon hazırlığı") &&
    adminIntegrationsHtml.includes("Canlı aktarım kilitli"),
  "Admin integrations page or navigation not rendered",
);
const adminOrdersResponse = await request("/admin/siparisler", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  adminOrdersResponse.status === 200,
  `Authenticated admin orders failed with ${adminOrdersResponse.status}`,
);
assert(
  (await adminOrdersResponse.text()).includes("/admin/siparisler"),
  "Admin orders navigation not rendered",
);

const adminReportsResponse = await request("/admin/raporlar", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  adminReportsResponse.status === 200,
  `Authenticated admin reports failed with ${adminReportsResponse.status}`,
);
const adminReportsHtml = await adminReportsResponse.text();
assert(
  adminReportsHtml.includes("Satış ve sipariş raporları") &&
    adminReportsHtml.includes('href="/admin/raporlar"'),
  "Admin reports page or navigation not rendered",
);
const adminStockReportResponse = await request("/admin/raporlar?view=stock", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  adminStockReportResponse.status === 200,
  `Authenticated admin stock report failed with ${adminStockReportResponse.status}`,
);
const adminStockReportHtml = await adminStockReportResponse.text();
assert(
  adminStockReportHtml.includes("Stok ve depo raporu") &&
    adminStockReportHtml.includes("Fiziksel stok") &&
    adminStockReportHtml.includes("Kullanılabilir"),
  "Admin stock report content not rendered",
);
const adminStockMovementResponse = await request("/admin/raporlar?view=stock-movements", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  adminStockMovementResponse.status === 200,
  `Authenticated admin stock movement report failed with ${adminStockMovementResponse.status}`,
);
const adminStockMovementHtml = await adminStockMovementResponse.text();
assert(
  adminStockMovementHtml.includes("Stok hareket defteri") &&
    adminStockMovementHtml.includes("Tüm hareketler") &&
    adminStockMovementHtml.includes("Tüm kaynaklar"),
  "Admin stock movement report content not rendered",
);

const smokeAdminOrderId = `smoke-admin-order-${Date.now()}`;
const smokeAdminOrderNumber = `SMOKE-ORDER-${Date.now()}`;
const smokeAdminOrderTimestamp = new Date().toISOString();
const smokeAdminOrderDb = new Database(databasePath);
smokeAdminOrderDb
  .prepare(
    `insert into "Order" (id, orderNumber, companyId, status, currency, subtotal, version, createdAt, updatedAt)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  .run(
    smokeAdminOrderId,
    smokeAdminOrderNumber,
    "seed-ekolglass-demo-dealer",
    "SUBMITTED",
    "TRY",
    0,
    1,
    smokeAdminOrderTimestamp,
    smokeAdminOrderTimestamp,
  );
smokeAdminOrderDb.close();

try {
  const adminOrderDetailResponse = await request(
    `/admin/siparisler/${smokeAdminOrderId}`,
    {
      headers: { Cookie: serializeCookies(cookieJar) },
    },
  );
  assert(
    adminOrderDetailResponse.status === 200,
    `Admin order detail failed with ${adminOrderDetailResponse.status}`,
  );
  const adminOrderDetailHtml = await adminOrderDetailResponse.text();
  assert(
    adminOrderDetailHtml.includes(smokeAdminOrderNumber),
    "Admin order detail number not rendered",
  );
  assert(
    adminOrderDetailHtml.includes('name="expectedVersion"'),
    "Admin order version control not rendered",
  );
  assert(
    adminOrderDetailHtml.includes('name="idempotencyKey"'),
    "Admin order idempotency control not rendered",
  );
} finally {
  const cleanupAdminOrderDb = new Database(databasePath);
  cleanupAdminOrderDb
    .prepare('delete from "Order" where id = ?')
    .run(smokeAdminOrderId);
  cleanupAdminOrderDb.close();
}

const smokeQuoteId = `smoke-admin-quote-${Date.now()}`;
const smokeQuoteItemId = `smoke-admin-quote-item-${Date.now()}`;
const smokeQuoteNumber = `SMOKE-QUOTE-${Date.now()}`;
const smokeQuoteTimestamp = new Date().toISOString();
const smokeQuoteDb = new Database(databasePath);
smokeQuoteDb
  .prepare(
    `insert into QuoteRequest (
      id, quoteNumber, companyId, requesterName, requesterEmail, status,
      currency, estimatedSubtotal, hasUnpricedItems, submittedAt, version,
      createdAt, updatedAt
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  .run(
    smokeQuoteId,
    smokeQuoteNumber,
    "seed-ekolglass-demo-dealer",
    "Smoke Quote User",
    "smoke-quote@example.com",
    "IN_REVIEW",
    "TRY",
    100,
    0,
    smokeQuoteTimestamp,
    1,
    smokeQuoteTimestamp,
    smokeQuoteTimestamp,
  );
smokeQuoteDb
  .prepare(
    `insert into QuoteRequestItem (
      id, quoteRequestId, customTitle, quantity, unitPrice, lineTotal, priceScope
    ) values (?, ?, ?, ?, ?, ?, ?)`,
  )
  .run(smokeQuoteItemId, smokeQuoteId, "Smoke Quote Item", 2, 50, 100, "COMPANY");
smokeQuoteDb.close();

try {
  const adminQuotesResponse = await request("/admin/teklifler", {
    headers: { Cookie: serializeCookies(cookieJar) },
  });
  assert(
    adminQuotesResponse.status === 200,
    `Authenticated admin quotes failed with ${adminQuotesResponse.status}`,
  );
  assert(
    (await adminQuotesResponse.text()).includes(smokeQuoteNumber),
    "Admin quote queue did not render smoke quote",
  );

  const adminQuoteDetailResponse = await request(
    `/admin/teklifler/${smokeQuoteId}`,
    { headers: { Cookie: serializeCookies(cookieJar) } },
  );
  assert(
    adminQuoteDetailResponse.status === 200,
    `Admin quote detail failed with ${adminQuoteDetailResponse.status}`,
  );
  const adminQuoteDetailHtml = await adminQuoteDetailResponse.text();
  assert(
    adminQuoteDetailHtml.includes(smokeQuoteNumber) &&
      adminQuoteDetailHtml.includes("Smoke Quote Item"),
    "Admin quote detail did not render quote data",
  );
  assert(
    adminQuoteDetailHtml.includes('name="expectedVersion"') &&
      adminQuoteDetailHtml.includes('name="idempotencyKey"') &&
      adminQuoteDetailHtml.includes('name="unitPrice"'),
    "Admin quote operation controls not rendered",
  );
} finally {
  const cleanupQuoteDb = new Database(databasePath);
  cleanupQuoteDb
    .prepare("delete from QuoteRequestItem where quoteRequestId = ?")
    .run(smokeQuoteId);
  cleanupQuoteDb
    .prepare("delete from QuoteRequest where id = ?")
    .run(smokeQuoteId);
  cleanupQuoteDb.close();
}
assert(
  adminHtml.includes("Operasyon merkezi"),
  "Admin operations dashboard content not rendered",
);
assert(
  adminHtml.includes("Giriş güvenliği"),
  "Admin login security metric not rendered",
);
assert(
  adminHtml.includes("Bayi Başvuruları"),
  "Admin sidebar navigation not rendered",
);

const adminDealerResponse = await request("/bayi", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  adminDealerResponse.status === 307,
  `Admin /bayi should redirect, got ${adminDealerResponse.status}`,
);
assert(
  new URL(adminDealerResponse.headers.get("location") ?? "", baseUrl)
    .pathname === "/admin",
  "Admin dealer access was not redirected",
);

const smokeInvitedUserId = `smoke-invited-user-${Date.now()}`;
const smokeActiveDealerId = `smoke-active-dealer-${Date.now()}`;
const smokeInvitedEmail = `smoke-invited-${Date.now()}@example.com`;
const smokeDealerEmail = `smoke-dealer-${Date.now()}@example.com`;
const smokeDealerPassword = "SmokeDealer2026!";
const smokeDealerPasswordHash = await hash(smokeDealerPassword, 12);
const smokeUserTimestamp = new Date().toISOString();
const companyUserDb = new Database(databasePath);
const smokeProduct = companyUserDb
  .prepare(
    "select id, code from Product where status = 'ACTIVE' order by createdAt asc limit 1",
  )
  .get();
assert(smokeProduct, "Active smoke product not found");
companyUserDb
  .prepare(
    `
      insert into User (id, email, name, role, status, passwordHash, companyId, createdAt, updatedAt)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
  .run(
    smokeInvitedUserId,
    smokeInvitedEmail,
    "Smoke Davet Kullanıcısı",
    "DEALER_OWNER",
    "INVITED",
    null,
    "seed-ekolglass-demo-dealer",
    smokeUserTimestamp,
    smokeUserTimestamp,
  );
companyUserDb
  .prepare(
    `
      insert into User (id, email, name, role, status, passwordHash, companyId, createdAt, updatedAt)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
  .run(
    smokeActiveDealerId,
    smokeDealerEmail,
    "Smoke Aktif Bayi",
    "DEALER_OWNER",
    "ACTIVE",
    smokeDealerPasswordHash,
    "seed-ekolglass-demo-dealer",
    smokeUserTimestamp,
    smokeUserTimestamp,
  );
companyUserDb.close();

try {
  const companiesResponse = await request("/admin/firmalar", {
    headers: { Cookie: serializeCookies(cookieJar) },
  });
  assert(
    companiesResponse.status === 200,
    `Authenticated companies screen failed with ${companiesResponse.status}`,
  );
  const companiesHtml = await companiesResponse.text();
  assert(
    companiesHtml.includes("Firmalar ve bayi hesapları"),
    "Companies screen heading not rendered",
  );
  assert(
    companiesHtml.includes("Anadolu Oto Cam"),
    "Seed company not rendered",
  );

  const companyDetailResponse = await request(
    "/admin/firmalar/seed-ekolglass-demo-dealer",
    {
      headers: { Cookie: serializeCookies(cookieJar) },
    },
  );
  assert(
    companyDetailResponse.status === 200,
    `Authenticated company detail failed with ${companyDetailResponse.status}`,
  );
  const companyDetailHtml = await companyDetailResponse.text();
  assert(
    companyDetailHtml.includes("Firma kullanıcıları"),
    "Company users panel not rendered",
  );
  assert(
    companyDetailHtml.includes(smokeInvitedEmail),
    "Invited company user not rendered",
  );
  assert(
    companyDetailHtml.includes("Aktivasyon bağlantısı üret"),
    "Activation invitation action not rendered",
  );
  assert(
    companyDetailHtml.includes("Kullanıcı ekle"),
    "Dealer user create action not rendered",
  );
  assert(
    companyDetailHtml.includes("Parola bağlantısı"),
    "Dealer password reset action not rendered",
  );
  assert(
    companyDetailHtml.includes("Müşteri iskontosu") &&
      companyDetailHtml.includes('name="discountRate"'),
    "Company discount management control not rendered",
  );
  assert(
    companyDetailHtml.includes("Firma erişimini askıya al") &&
      companyDetailHtml.includes('name="expectedStatus"') &&
      companyDetailHtml.includes('name="expectedUpdatedAt"') &&
      companyDetailHtml.includes('name="changeReason"'),
    "Company lifecycle controls not rendered",
  );

  const invalidActivationResponse = await request(
    `/aktivasyon/${"x".repeat(43)}`,
  );
  assert(
    invalidActivationResponse.status === 200,
    `Invalid activation page failed with ${invalidActivationResponse.status}`,
  );
  const invalidActivationHtml = await invalidActivationResponse.text();
  assert(
    invalidActivationHtml.includes("Aktivasyon bağlantısı kullanılamıyor"),
    "Invalid activation state not rendered",
  );

  const dealerCookieJar = new Map();
  const dealerLoginResponse = await request("/giris");
  assert(
    dealerLoginResponse.status === 200,
    `Dealer login page failed with ${dealerLoginResponse.status}`,
  );
  mergeCookies(dealerCookieJar, getSetCookieHeaders(dealerLoginResponse));
  const dealerLoginDom = new JSDOM(await dealerLoginResponse.text());
  const dealerLoginForm = dealerLoginDom.window.document.querySelector("form");
  assert(dealerLoginForm, "Dealer login form not found");
  const dealerFormData = new FormData();
  for (const input of dealerLoginForm.querySelectorAll("input")) {
    const name = input.getAttribute("name");
    if (name) dealerFormData.append(name, input.getAttribute("value") ?? "");
  }
  dealerFormData.set("email", smokeDealerEmail);
  dealerFormData.set("password", smokeDealerPassword);

  const dealerLoginSubmitResponse = await request("/giris", {
    method: "POST",
    headers: { Cookie: serializeCookies(dealerCookieJar) },
    body: dealerFormData,
  });
  mergeCookies(dealerCookieJar, getSetCookieHeaders(dealerLoginSubmitResponse));
  assert(
    dealerLoginSubmitResponse.status === 303,
    `Dealer login should redirect, got ${dealerLoginSubmitResponse.status}`,
  );
  assert(
    dealerLoginSubmitResponse.headers.get("location") === "/",
    `Dealer login redirected to ${dealerLoginSubmitResponse.headers.get("location")}`,
  );
  assert(
    dealerCookieJar.has("ekolglass_session"),
    "Dealer login did not set session cookie",
  );

  const dealerHomeResponse = await request("/", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    dealerHomeResponse.status === 200,
    `Authenticated dealer home failed with ${dealerHomeResponse.status}`,
  );
  const dealerHomeHtml = await dealerHomeResponse.text();
  assert(
    dealerHomeHtml.includes("Anadolu Oto Cam"),
    "Authenticated home did not render dealer company identity",
  );
  assert(
    dealerHomeHtml.includes("Siparişlerim"),
    "Authenticated commerce navigation not rendered",
  );

  const legacyDealerProductsResponse = await request("/bayi/urunler", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    legacyDealerProductsResponse.status === 308,
    `Legacy dealer products should redirect, got ${legacyDealerProductsResponse.status}`,
  );
  assert(
    new URL(legacyDealerProductsResponse.headers.get("location") ?? "", baseUrl)
      .pathname === "/urunler",
    "Legacy dealer products redirect target is invalid",
  );
  const dealerProductsResponse = await request("/urunler", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    dealerProductsResponse.status === 200,
    `Dealer products failed with ${dealerProductsResponse.status}`,
  );

  const publicProductDetailResponse = await request(
    `/urunler/${smokeProduct.id}`,
  );
  assert(
    publicProductDetailResponse.status === 200,
    `Public product detail failed with ${publicProductDetailResponse.status}`,
  );
  assert(
    (await publicProductDetailResponse.text()).includes(smokeProduct.code),
    "Public product detail did not render product code",
  );

  const legacyDealerProductDetailResponse = await request(
    `/bayi/urunler/${smokeProduct.id}`,
    { headers: { Cookie: serializeCookies(dealerCookieJar) } },
  );
  assert(
    legacyDealerProductDetailResponse.status === 308,
    `Legacy dealer product detail should redirect, got ${legacyDealerProductDetailResponse.status}`,
  );
  const dealerProductDetailResponse = await request(
    `/urunler/${smokeProduct.id}`,
    { headers: { Cookie: serializeCookies(dealerCookieJar) } },
  );
  assert(
    dealerProductDetailResponse.status === 200,
    `Dealer product detail failed with ${dealerProductDetailResponse.status}`,
  );
  assert(
    (await dealerProductDetailResponse.text()).includes("Sipariş sepetine ekle"),
    "Dealer product detail did not render direct order action",
  );

  const legacyDealerQuoteCartResponse = await request("/bayi/teklif-sepeti", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    legacyDealerQuoteCartResponse.status === 308,
    `Legacy dealer quote cart should redirect, got ${legacyDealerQuoteCartResponse.status}`,
  );
  const dealerQuoteCartResponse = await request("/teklif-sepeti", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  const dealerOrderCartResponse = await request("/sepet", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    dealerOrderCartResponse.status === 200,
    `Dealer order cart failed with ${dealerOrderCartResponse.status}`,
  );
  assert(
    (await dealerOrderCartResponse.text()).includes("/urunler"),
    "Dealer order cart empty-state action not rendered",
  );
  assert(
    dealerQuoteCartResponse.status === 307,
    `Disabled dealer quote cart should redirect, got ${dealerQuoteCartResponse.status}`,
  );
  assert(
    dealerQuoteCartResponse.headers.get("location") === "/urunler",
    "Disabled dealer quote cart did not redirect to products",
  );

  const dealerPortalResponse = await request("/bayi", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    dealerPortalResponse.status === 200,
    `Dealer dashboard failed with ${dealerPortalResponse.status}`,
  );
  const dealerPortalHtml = await dealerPortalResponse.text();
  assert(
    dealerPortalHtml.includes("Firma özeti"),
    "Dealer dashboard heading not rendered",
  );
  assert(
    dealerPortalHtml.includes("Anadolu Oto Cam"),
    "Dealer company context not rendered",
  );

  for (const [path, expectedText] of [
    ["/bayi/siparisler", "Sipariş ve sevkiyat takibi"],
    ["/bayi/teklifler", "Teklif ar"],
    ["/bayi/hesabim", "Ticari koşullar"],
  ]) {
    const response = await request(path, {
      headers: { Cookie: serializeCookies(dealerCookieJar) },
    });
    assert(
      response.status === 200,
      `Dealer page ${path} failed with ${response.status}`,
    );
    assert(
      (await response.text()).includes(expectedText),
      `Dealer page ${path} did not render ${expectedText}`,
    );
  }

  const dealerOrderFilterResponse = await request(
    "/bayi/siparisler?q=SMOKE&status=CONFIRMED&dateFrom=2026-01-01&dateTo=2026-12-31&page=999",
    { headers: { Cookie: serializeCookies(dealerCookieJar) } },
  );
  assert(
    dealerOrderFilterResponse.status === 200,
    `Dealer order filters failed with ${dealerOrderFilterResponse.status}`,
  );
  const dealerOrderFilterHtml = await dealerOrderFilterResponse.text();
  assert(
    dealerOrderFilterHtml.includes('name="q"') &&
      dealerOrderFilterHtml.includes('name="status"') &&
      dealerOrderFilterHtml.includes('name="dateFrom"') &&
      dealerOrderFilterHtml.includes('name="dateTo"'),
    "Dealer order filter controls not rendered",
  );

  const dealerAdminResponse = await request("/admin", {
    headers: { Cookie: serializeCookies(dealerCookieJar) },
  });
  assert(
    dealerAdminResponse.status === 307,
    `Dealer /admin should redirect, got ${dealerAdminResponse.status}`,
  );
  assert(
    new URL(dealerAdminResponse.headers.get("location") ?? "", baseUrl)
      .pathname === "/",
    "Dealer admin access was not rejected",
  );
} finally {
  const companyUserCleanupDb = new Database(databasePath);
  companyUserCleanupDb
    .prepare(
      "delete from AuditLog where actorUserId in (?, ?) or metadata like ? or metadata like ?",
    )
    .run(
      smokeInvitedUserId,
      smokeActiveDealerId,
      `%${smokeInvitedEmail}%`,
      `%${smokeDealerEmail}%`,
    );
  companyUserCleanupDb
    .prepare("delete from AuthSession where userId in (?, ?)")
    .run(smokeInvitedUserId, smokeActiveDealerId);
  companyUserCleanupDb
    .prepare("delete from UserActivationToken where userId in (?, ?)")
    .run(smokeInvitedUserId, smokeActiveDealerId);
  companyUserCleanupDb
    .prepare("delete from UserPasswordResetToken where userId in (?, ?)")
    .run(smokeInvitedUserId, smokeActiveDealerId);
  companyUserCleanupDb
    .prepare("delete from User where id in (?, ?)")
    .run(smokeInvitedUserId, smokeActiveDealerId);
  companyUserCleanupDb.close();
}

const smokeDealerApplicationId = `smoke-dealer-${Date.now()}`;
const smokeDealerCompanyName = `Smoke Cam ${Date.now()}`;
const smokeDealerTimestamp = new Date().toISOString();
const dealerDb = new Database(databasePath);
dealerDb
  .prepare(
    `
      insert into DealerApplication (
        id,
        companyName,
        contactName,
        email,
        phone,
        city,
        customerType,
        status,
        createdAt,
        updatedAt
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
  .run(
    smokeDealerApplicationId,
    smokeDealerCompanyName,
    "Smoke Yetkili",
    `smoke-${Date.now()}@example.com`,
    "+90 212 000 00 00",
    "İstanbul",
    "Bayi",
    "NEW",
    smokeDealerTimestamp,
    smokeDealerTimestamp,
  );
dealerDb.close();

try {
  const dealerApplicationsResponse = await request("/admin/bayi-basvurulari", {
    headers: {
      Cookie: serializeCookies(cookieJar),
    },
  });
  assert(
    dealerApplicationsResponse.status === 200,
    `Authenticated dealer applications failed with ${dealerApplicationsResponse.status}`,
  );
  const dealerApplicationsHtml = await dealerApplicationsResponse.text();
  assert(
    dealerApplicationsHtml.includes("Bayi başvuruları"),
    "Dealer application list heading not rendered",
  );
  assert(
    dealerApplicationsHtml.includes(smokeDealerCompanyName),
    "Smoke dealer application not rendered in list",
  );
  assert(
    dealerApplicationsHtml.includes("İncele"),
    "Dealer application detail action not rendered",
  );

  const dealerApplicationDetailResponse = await request(
    `/admin/bayi-basvurulari/${smokeDealerApplicationId}`,
    {
      headers: {
        Cookie: serializeCookies(cookieJar),
      },
    },
  );
  assert(
    dealerApplicationDetailResponse.status === 200,
    `Authenticated dealer application detail failed with ${dealerApplicationDetailResponse.status}`,
  );
  const dealerApplicationDetailHtml =
    await dealerApplicationDetailResponse.text();
  assert(
    dealerApplicationDetailHtml.includes(smokeDealerCompanyName),
    "Dealer application detail did not render company",
  );
  assert(
    dealerApplicationDetailHtml.includes("Durum ve ticari koşullar"),
    "Dealer review panel not rendered",
  );
  assert(
    dealerApplicationDetailHtml.includes("Kararı kaydet"),
    "Dealer review submit action not rendered",
  );
} finally {
  const dealerCleanupDb = new Database(databasePath);
  dealerCleanupDb
    .prepare("delete from DealerApplication where id = ?")
    .run(smokeDealerApplicationId);
  dealerCleanupDb.close();
}

const productsResponse = await request("/admin/urunler", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(
  productsResponse.status === 200,
  `Authenticated /admin/urunler failed with ${productsResponse.status}`,
);
const productsHtml = await productsResponse.text();
assert(
  productsHtml.includes("Kategori ekranina git"),
  "Admin category shortcut not rendered",
);
assert(
  productsHtml.includes("Fiyat yönetimini aç"),
  "Admin price list shortcut not rendered",
);
assert(
  productsHtml.includes("Excel/CSV ile toplu ürün ekle") && productsHtml.includes('type="file"'),
  "Admin product CSV upload control not rendered",
);
assert(
  productsHtml.includes("Ürünleri satışa aç") &&
    productsHtml.includes("/admin/urunler/yayin-hazirligi"),
  "Admin product publication readiness shortcut not rendered",
);

const publicationReadinessResponse = await request(
  "/admin/urunler/yayin-hazirligi",
  { headers: { Cookie: serializeCookies(cookieJar) } },
);
assert(
  publicationReadinessResponse.status === 200,
  `Authenticated product publication readiness failed with ${publicationReadinessResponse.status}`,
);
const publicationReadinessHtml = await publicationReadinessResponse.text();
const publicationReadinessMarkers = [
  "Toplu yayın hazırlığı",
  "Seçilenleri yayınla",
  "Genel fiyatı eksik",
];
const missingPublicationReadinessMarkers = publicationReadinessMarkers.filter(
  (marker) => !publicationReadinessHtml.includes(marker),
);
assert(
  missingPublicationReadinessMarkers.length === 0,
  `Admin product publication readiness controls not rendered: ${missingPublicationReadinessMarkers.join(", ")}`,
);

const contentResponse = await request("/admin/icerik", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(contentResponse.status === 200, `Authenticated /admin/icerik failed with ${contentResponse.status}`);
const contentHtml = await contentResponse.text();
assert(
  contentHtml.includes("Bilgisayardan görsel seç") && contentHtml.includes('accept="image/jpeg,image/png,image/webp"'),
  "Admin CMS file upload control not rendered",
);

const categoriesResponse = await request("/admin/urunler/kategoriler", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(
  categoriesResponse.status === 200,
  `Authenticated /admin/urunler/kategoriler failed with ${categoriesResponse.status}`,
);
const categoriesHtml = await categoriesResponse.text();
assert(
  categoriesHtml.includes("Kategori yonetimi"),
  "Admin product categories screen not rendered",
);
assert(
  categoriesHtml.includes("Kategori ekle"),
  "Admin category create form not rendered",
);

const priceListsResponse = await request("/admin/urunler/fiyat-listeleri", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(
  priceListsResponse.status === 200,
  `Authenticated /admin/urunler/fiyat-listeleri failed with ${priceListsResponse.status}`,
);
const priceListsHtml = await priceListsResponse.text();
assert(
  priceListsHtml.includes("Ne yapmak istiyorsunuz?"),
  "Admin price lists screen not rendered",
);
assert(
  priceListsHtml.includes("Gelişmiş fiyat ayarları"),
  "Admin price list create form not rendered",
);
assert(
  priceListsHtml.includes("Fiyat yönetimi") &&
    priceListsHtml.includes("Ürün fiyatlarını Excel ile güncelle") &&
    priceListsHtml.includes("Bir firmaya iskonto tanımla") &&
    priceListsHtml.includes("Toplu zam veya indirim"),
  "Admin price hierarchy, company discount, or bulk adjustment controls not rendered",
);

const priceImportResponse = await request("/admin/urunler/fiyat-aktarimi", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  priceImportResponse.status === 200,
  `Authenticated Excel price import failed with ${priceImportResponse.status}`,
);
const priceImportHtml = await priceImportResponse.text();
assert(
  priceImportHtml.includes("Excel ile fiyat güncelle") &&
    priceImportHtml.includes('accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"'),
  "Excel price import controls not rendered",
);

const priceTemplateDb = new Database(databasePath, { readonly: true });
const smokePriceList = priceTemplateDb
  .prepare("select id from PriceList where isActive = 1 order by priority desc limit 1")
  .get();
priceTemplateDb.close();
assert(smokePriceList, "Smoke database has no active price list");
const priceTemplateResponse = await request(
  `/api/admin/price-template.xlsx?priceListId=${encodeURIComponent(smokePriceList.id)}`,
  { headers: { Cookie: serializeCookies(cookieJar) } },
);
assert(
  priceTemplateResponse.status === 200,
  `Excel price template failed with ${priceTemplateResponse.status}`,
);
assert(
  priceTemplateResponse.headers
    .get("content-type")
    ?.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
  "Excel price template content type is invalid",
);

const stockOperationsResponse = await request("/admin/stok", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  stockOperationsResponse.status === 200,
  `Authenticated /admin/stok failed with ${stockOperationsResponse.status}`,
);
const stockOperationsHtml = await stockOperationsResponse.text();
assert(
  stockOperationsHtml.includes("Stok ve depo raporu") &&
    stockOperationsHtml.includes("Toplu stok aktar") &&
    stockOperationsHtml.includes("Hareketleri izle"),
  "Stock and warehouse operation controls not rendered",
);

const priceStockImportResponse = await request("/admin/urunler/fiyat-stok-aktarimi", {
  headers: { Cookie: serializeCookies(cookieJar) },
});
assert(
  priceStockImportResponse.status === 200,
  `Authenticated price/stock import failed with ${priceStockImportResponse.status}`,
);
const priceStockImportHtml = await priceStockImportResponse.text();
assert(
  priceStockImportHtml.includes('name="priceListId"') &&
    priceStockImportHtml.includes('name="file"') &&
    priceStockImportHtml.includes("ekolglass-fiyat-stok-sablonu.csv"),
  "Price/stock import controls not rendered",
);
const importTemplateResponse = await request("/templates/ekolglass-fiyat-stok-sablonu.csv");
assert(importTemplateResponse.status === 200, "Price/stock CSV template is not downloadable");
assert(
  (await importTemplateResponse.text()).includes("urun_kodu,net_bayi_fiyati,stok_miktari"),
  "Price/stock CSV template contract is invalid",
);

const db = new Database(databasePath);
const firstProduct = db
  .prepare("select id, code, name from Product order by createdAt asc limit 1")
  .get();
db.close();
assert(firstProduct, "Smoke database has no product");

const smokeCompatibilityId = `smoke-compat-${Date.now()}`;
const smokeOemReference = `SMOKE-OEM-${Date.now()}`;

const compatibilityDb = new Database(databasePath);
compatibilityDb
  .prepare(
    `
      insert into ProductCompatibility (
        id,
        productId,
        vehicleBrand,
        vehicleModel,
        yearStart,
        yearEnd,
        oemReference,
        notes
      ) values (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
  .run(
    smokeCompatibilityId,
    firstProduct.id,
    "Smoke Marka",
    "Smoke Model",
    2020,
    2026,
    smokeOemReference,
    "Smoke uyumluluk kaydi",
  );
compatibilityDb.close();

try {
  const compatibilityResponse = await request(
    `/admin/urunler/${firstProduct.id}?tab=uyumluluk`,
    {
      headers: {
        Cookie: serializeCookies(cookieJar),
      },
    },
  );
  assert(
    compatibilityResponse.status === 200,
    `Authenticated product compatibility tab failed with ${compatibilityResponse.status}`,
  );
  const compatibilityHtml = await compatibilityResponse.text();
  assert(
    compatibilityHtml.includes("Uyumluluk veya OEM referansi ekle"),
    "Product compatibility create form not rendered",
  );
  assert(
    compatibilityHtml.includes("Uyumluluk ekle"),
    "Product compatibility submit action not rendered",
  );
  assert(
    compatibilityHtml.includes("Uyumlulugu sil"),
    "Product compatibility delete action not rendered",
  );
  assert(
    compatibilityHtml.includes(smokeOemReference),
    "Product compatibility smoke OEM reference not rendered",
  );
  assert(
    compatibilityHtml.includes("Yayın hazırlığı") &&
      compatibilityHtml.includes('name="targetStatus"'),
    "Admin product publication controls not rendered",
  );

  const catalogCompatibilityResponse = await request(
    `/urunler?q=${encodeURIComponent(smokeOemReference)}`,
  );
  assert(
    catalogCompatibilityResponse.status === 200,
    `Catalog compatibility search failed with ${catalogCompatibilityResponse.status}`,
  );
  const catalogCompatibilityHtml = await catalogCompatibilityResponse.text();
  assert(
    catalogCompatibilityHtml.includes(firstProduct.code),
    "Catalog compatibility search did not render owning product",
  );
} finally {
  const cleanupDb = new Database(databasePath);
  cleanupDb
    .prepare("delete from ProductCompatibility where id = ?")
    .run(smokeCompatibilityId);
  cleanupDb.close();
}

const mediaResponse = await request(
  `/admin/urunler/${firstProduct.id}?tab=medya`,
  {
    headers: {
      Cookie: serializeCookies(cookieJar),
    },
  },
);
assert(
  mediaResponse.status === 200,
  `Authenticated product media tab failed with ${mediaResponse.status}`,
);
const mediaHtml = await mediaResponse.text();
assert(
  mediaHtml.includes("Medya veya teknik dosya ekle"),
  "Product media create form not rendered",
);
assert(
  mediaHtml.includes("Medya ekle"),
  "Product media submit action not rendered",
);

console.log(
  JSON.stringify(
    {
      status: "ok",
      baseUrl,
      checks: [
        "health",
        "public-commerce-home",
        "public-sitemap-boundary",
        "guest-admin-redirect",
        "guest-dealer-redirect",
        "login-form",
        "admin-login",
        "authenticated-admin-dashboard",
        "authenticated-admin-integrations",
        "authenticated-admin-orders",
        "authenticated-admin-reports",
        "authenticated-admin-stock-report",
        "authenticated-admin-stock-movements",
        "authenticated-admin-order-detail",
        "authenticated-admin-quote-archive",
        "authenticated-admin-quote-detail",
        "admin-dealer-redirect",
        "authenticated-dealer-application-list",
        "authenticated-dealer-application-detail",
        "authenticated-company-list",
        "authenticated-company-detail",
        "authenticated-company-lifecycle",
        "invalid-activation-state",
        "dealer-login-role-redirect",
        "authenticated-dealer-commerce-home",
        "authenticated-dealer-products",
        "public-product-detail",
        "authenticated-dealer-product-detail",
        "disabled-dealer-quote-cart-redirect",
        "authenticated-dealer-order-cart",
        "authenticated-dealer-dashboard",
        "authenticated-dealer-orders",
        "authenticated-dealer-quote-archive",
        "authenticated-dealer-account",
        "dealer-admin-access-rejected",
        "authenticated-product-management",
        "authenticated-product-publication-readiness",
        "authenticated-product-categories",
        "authenticated-price-lists",
        "authenticated-excel-price-import",
        "excel-price-template",
        "authenticated-stock-operations",
        "authenticated-price-stock-import",
        "price-stock-import-template",
        "authenticated-product-compatibility-tab",
        "public-catalog-compatibility-search",
        "authenticated-product-media-tab",
      ],
    },
    null,
    2,
  ),
);
