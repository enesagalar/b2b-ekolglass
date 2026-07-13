import { JSDOM } from "jsdom";
import Database from "better-sqlite3";
import { hash } from "bcryptjs";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const adminEmail =
  process.env.SMOKE_ADMIN_EMAIL ??
  process.env.SEED_ADMIN_EMAIL ??
  "admin@ekolglass.local";
const adminPassword =
  process.env.SMOKE_ADMIN_PASSWORD ??
  process.env.SEED_ADMIN_PASSWORD ??
  "EkolGlass2026!";

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
assert(
  healthResponse.status === 200,
  `Health check failed with ${healthResponse.status}`,
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
    adminIntegrationsHtml.includes('href="/admin/entegrasyonlar"'),
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

const smokeAdminOrderId = `smoke-admin-order-${Date.now()}`;
const smokeAdminOrderNumber = `SMOKE-ORDER-${Date.now()}`;
const smokeAdminOrderTimestamp = new Date().toISOString();
const smokeAdminOrderDb = new Database("dev.db");
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
  const cleanupAdminOrderDb = new Database("dev.db");
  cleanupAdminOrderDb
    .prepare('delete from "Order" where id = ?')
    .run(smokeAdminOrderId);
  cleanupAdminOrderDb.close();
}

const smokeQuoteId = `smoke-admin-quote-${Date.now()}`;
const smokeQuoteItemId = `smoke-admin-quote-item-${Date.now()}`;
const smokeQuoteNumber = `SMOKE-QUOTE-${Date.now()}`;
const smokeQuoteTimestamp = new Date().toISOString();
const smokeQuoteDb = new Database("dev.db");
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
  const cleanupQuoteDb = new Database("dev.db");
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
const companyUserDb = new Database("dev.db");
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
    (await dealerProductDetailResponse.text()).includes("Teklife ekle"),
    "Dealer product detail did not render quote cart action",
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
    dealerQuoteCartResponse.status === 200,
    `Dealer quote cart failed with ${dealerQuoteCartResponse.status}`,
  );
  assert(
    (await dealerQuoteCartResponse.text()).includes("Teklif sepetiniz boş"),
    "Dealer empty quote cart state not rendered",
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
    dealerPortalHtml.includes("Operasyon özeti"),
    "Dealer dashboard heading not rendered",
  );
  assert(
    dealerPortalHtml.includes("Anadolu Oto Cam"),
    "Dealer company context not rendered",
  );

  for (const [path, expectedText] of [
    ["/bayi/siparisler", "Sipariş ve sevkiyat takibi"],
    ["/bayi/teklifler", "Teklif talepleri"],
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
  const companyUserCleanupDb = new Database("dev.db");
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
const dealerDb = new Database("dev.db");
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
  const dealerCleanupDb = new Database("dev.db");
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
  productsHtml.includes("Fiyat listelerine git"),
  "Admin price list shortcut not rendered",
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
  priceListsHtml.includes("Fiyat listeleri"),
  "Admin price lists screen not rendered",
);
assert(
  priceListsHtml.includes("Fiyat listesi ekle"),
  "Admin price list create form not rendered",
);

const db = new Database("dev.db");
const firstProduct = db
  .prepare("select id, code, name from Product order by createdAt asc limit 1")
  .get();
db.close();
assert(firstProduct, "Smoke database has no product");

const smokeCompatibilityId = `smoke-compat-${Date.now()}`;
const smokeOemReference = `SMOKE-OEM-${Date.now()}`;

const compatibilityDb = new Database("dev.db");
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
  const cleanupDb = new Database("dev.db");
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
        "authenticated-admin-order-detail",
        "authenticated-admin-quotes",
        "authenticated-admin-quote-detail",
        "admin-dealer-redirect",
        "authenticated-dealer-application-list",
        "authenticated-dealer-application-detail",
        "authenticated-company-list",
        "authenticated-company-detail",
        "invalid-activation-state",
        "dealer-login-role-redirect",
        "authenticated-dealer-commerce-home",
        "authenticated-dealer-products",
        "public-product-detail",
        "authenticated-dealer-product-detail",
        "authenticated-dealer-quote-cart",
        "authenticated-dealer-order-cart",
        "authenticated-dealer-dashboard",
        "authenticated-dealer-orders",
        "authenticated-dealer-quotes",
        "authenticated-dealer-account",
        "dealer-admin-access-rejected",
        "authenticated-product-management",
        "authenticated-product-categories",
        "authenticated-price-lists",
        "authenticated-product-compatibility-tab",
        "public-catalog-compatibility-search",
        "authenticated-product-media-tab",
      ],
    },
    null,
    2,
  ),
);
