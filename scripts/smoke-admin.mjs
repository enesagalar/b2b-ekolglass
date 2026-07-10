import { JSDOM } from "jsdom";
import Database from "better-sqlite3";

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
  assert(dealerApplicationsResponse.status === 200, `Authenticated dealer applications failed with ${dealerApplicationsResponse.status}`);
  const dealerApplicationsHtml = await dealerApplicationsResponse.text();
  assert(dealerApplicationsHtml.includes("Bayi başvuruları"), "Dealer application list heading not rendered");
  assert(dealerApplicationsHtml.includes(smokeDealerCompanyName), "Smoke dealer application not rendered in list");
  assert(dealerApplicationsHtml.includes("İncele"), "Dealer application detail action not rendered");

  const dealerApplicationDetailResponse = await request(`/admin/bayi-basvurulari/${smokeDealerApplicationId}`, {
    headers: {
      Cookie: serializeCookies(cookieJar),
    },
  });
  assert(dealerApplicationDetailResponse.status === 200, `Authenticated dealer application detail failed with ${dealerApplicationDetailResponse.status}`);
  const dealerApplicationDetailHtml = await dealerApplicationDetailResponse.text();
  assert(dealerApplicationDetailHtml.includes(smokeDealerCompanyName), "Dealer application detail did not render company");
  assert(dealerApplicationDetailHtml.includes("Durum ve ticari koşullar"), "Dealer review panel not rendered");
  assert(dealerApplicationDetailHtml.includes("Kararı kaydet"), "Dealer review submit action not rendered");
} finally {
  const dealerCleanupDb = new Database("dev.db");
  dealerCleanupDb.prepare("delete from DealerApplication where id = ?").run(smokeDealerApplicationId);
  dealerCleanupDb.close();
}

const productsResponse = await request("/admin/urunler", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(productsResponse.status === 200, `Authenticated /admin/urunler failed with ${productsResponse.status}`);
const productsHtml = await productsResponse.text();
assert(productsHtml.includes("Kategori ekranina git"), "Admin category shortcut not rendered");
assert(productsHtml.includes("Fiyat listelerine git"), "Admin price list shortcut not rendered");

const categoriesResponse = await request("/admin/urunler/kategoriler", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(categoriesResponse.status === 200, `Authenticated /admin/urunler/kategoriler failed with ${categoriesResponse.status}`);
const categoriesHtml = await categoriesResponse.text();
assert(categoriesHtml.includes("Kategori yonetimi"), "Admin product categories screen not rendered");
assert(categoriesHtml.includes("Kategori ekle"), "Admin category create form not rendered");

const priceListsResponse = await request("/admin/urunler/fiyat-listeleri", {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(priceListsResponse.status === 200, `Authenticated /admin/urunler/fiyat-listeleri failed with ${priceListsResponse.status}`);
const priceListsHtml = await priceListsResponse.text();
assert(priceListsHtml.includes("Fiyat listeleri"), "Admin price lists screen not rendered");
assert(priceListsHtml.includes("Fiyat listesi ekle"), "Admin price list create form not rendered");

const db = new Database("dev.db");
const firstProduct = db.prepare("select id, code, name from Product order by createdAt asc limit 1").get();
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
  .run(smokeCompatibilityId, firstProduct.id, "Smoke Marka", "Smoke Model", 2020, 2026, smokeOemReference, "Smoke uyumluluk kaydi");
compatibilityDb.close();

try {
  const compatibilityResponse = await request(`/admin/urunler/${firstProduct.id}?tab=uyumluluk`, {
    headers: {
      Cookie: serializeCookies(cookieJar),
    },
  });
  assert(compatibilityResponse.status === 200, `Authenticated product compatibility tab failed with ${compatibilityResponse.status}`);
  const compatibilityHtml = await compatibilityResponse.text();
  assert(compatibilityHtml.includes("Uyumluluk veya OEM referansi ekle"), "Product compatibility create form not rendered");
  assert(compatibilityHtml.includes("Uyumluluk ekle"), "Product compatibility submit action not rendered");
  assert(compatibilityHtml.includes("Uyumlulugu sil"), "Product compatibility delete action not rendered");
  assert(compatibilityHtml.includes(smokeOemReference), "Product compatibility smoke OEM reference not rendered");

  const catalogCompatibilityResponse = await request(`/katalog?q=${encodeURIComponent(smokeOemReference)}`);
  assert(catalogCompatibilityResponse.status === 200, `Catalog compatibility search failed with ${catalogCompatibilityResponse.status}`);
  const catalogCompatibilityHtml = await catalogCompatibilityResponse.text();
  assert(catalogCompatibilityHtml.includes(firstProduct.code), "Catalog compatibility search did not render owning product");
} finally {
  const cleanupDb = new Database("dev.db");
  cleanupDb.prepare("delete from ProductCompatibility where id = ?").run(smokeCompatibilityId);
  cleanupDb.close();
}

const mediaResponse = await request(`/admin/urunler/${firstProduct.id}?tab=medya`, {
  headers: {
    Cookie: serializeCookies(cookieJar),
  },
});
assert(mediaResponse.status === 200, `Authenticated product media tab failed with ${mediaResponse.status}`);
const mediaHtml = await mediaResponse.text();
assert(mediaHtml.includes("Medya veya teknik dosya ekle"), "Product media create form not rendered");
assert(mediaHtml.includes("Medya ekle"), "Product media submit action not rendered");

console.log(
  JSON.stringify(
    {
      status: "ok",
      baseUrl,
      checks: [
        "health",
        "guest-admin-redirect",
        "login-form",
        "admin-login",
        "authenticated-admin-dashboard",
        "authenticated-dealer-application-list",
        "authenticated-dealer-application-detail",
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
