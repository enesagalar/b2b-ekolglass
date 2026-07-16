export const cityLogisticsImplementationStatus = "AWAITING_VERIFIED_CONTRACT" as const;

export type CityLogisticsEnvironment = {
  CITY_LOJISTIK_ENABLED?: string;
  CITY_LOJISTIK_API_BASE_URL?: string;
  CITY_LOJISTIK_API_KEY?: string;
  CITY_LOJISTIK_ACCOUNT_NUMBER?: string;
  CITY_LOJISTIK_CONTRACT_VERSION?: string;
};

export type CityLogisticsReadinessCheck = {
  key: "activation" | "contract" | "endpoint" | "credentials" | "account" | "implementation";
  label: string;
  status: "ready" | "missing" | "blocked";
  detail: string;
};

function hasHttpsUrl(value: string | undefined) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function getCityLogisticsReadiness(
  env: CityLogisticsEnvironment = process.env as CityLogisticsEnvironment,
) {
  const enabled = env.CITY_LOJISTIK_ENABLED === "true";
  const checks: CityLogisticsReadinessCheck[] = [
    {
      key: "activation",
      label: "Canlı aktarım anahtarı",
      status: enabled ? "ready" : "missing",
      detail: enabled ? "Ortamda açık." : "Güvenli varsayılan olarak kapalı.",
    },
    {
      key: "contract",
      label: "Doğrulanmış API sözleşmesi",
      status: env.CITY_LOJISTIK_CONTRACT_VERSION?.trim() ? "ready" : "missing",
      detail: env.CITY_LOJISTIK_CONTRACT_VERSION?.trim()
        ? "Sözleşme sürümü kayıtlı."
        : "City ekibinden sürümlü teknik doküman bekleniyor.",
    },
    {
      key: "endpoint",
      label: "Canlı servis adresi",
      status: hasHttpsUrl(env.CITY_LOJISTIK_API_BASE_URL) ? "ready" : "missing",
      detail: hasHttpsUrl(env.CITY_LOJISTIK_API_BASE_URL)
        ? "HTTPS servis adresi tanımlı."
        : "Doğrulanmış HTTPS base URL gerekli.",
    },
    {
      key: "credentials",
      label: "Kimlik bilgisi",
      status: env.CITY_LOJISTIK_API_KEY?.trim() ? "ready" : "missing",
      detail: env.CITY_LOJISTIK_API_KEY?.trim()
        ? "Gizli kimlik bilgisi tanımlı."
        : "Test ve canlı ortam kimlik bilgileri gerekli.",
    },
    {
      key: "account",
      label: "Müşteri hesap numarası",
      status: env.CITY_LOJISTIK_ACCOUNT_NUMBER?.trim() ? "ready" : "missing",
      detail: env.CITY_LOJISTIK_ACCOUNT_NUMBER?.trim()
        ? "Hesap eşleşmesi tanımlı."
        : "EkolGlass müşteri/sözleşme kodu gerekli.",
    },
    {
      key: "implementation",
      label: "Adapter kabul testleri",
      status: "blocked",
      detail: "DTO, hata kodları ve idempotency sözleşmesi doğrulanmadan kilitli.",
    },
  ];

  return {
    status: !enabled ? ("disabled" as const) : ("blocked" as const),
    enabled,
    canDispatch: false,
    configured: checks
      .filter((check) => check.key !== "activation" && check.key !== "implementation")
      .every((check) => check.status === "ready"),
    implementationStatus: cityLogisticsImplementationStatus,
    checks,
  };
}
