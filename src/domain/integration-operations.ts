export type IntegrationOperationalInput = {
  dead: number;
  retry: number;
  overdue: number;
  unsupportedReady: number;
  manualCityShipmentCount: number;
  systemJobsAlertLevel: "none" | "warning" | "critical";
};

export type IntegrationPrimaryTask = {
  tone: "danger" | "warning" | "success";
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
};

export function getIntegrationPrimaryTask(
  input: IntegrationOperationalInput,
): IntegrationPrimaryTask {
  if (input.dead > 0) {
    return {
      tone: "danger",
      eyebrow: "Müdahale gerekiyor",
      title: `${input.dead} teslimat işlemi kalıcı olarak başarısız`,
      description:
        "Hata nedenini kontrol edin. Sorun giderildiyse gerekçe yazarak işlemi yeniden kuyruğa alın.",
      href: "/admin/entegrasyonlar?status=DEAD#teslimat-islemleri",
      action: "Hatalı işlemleri incele",
    };
  }

  if (input.systemJobsAlertLevel !== "none") {
    return {
      tone: input.systemJobsAlertLevel === "critical" ? "danger" : "warning",
      eyebrow: "Otomatik işler gecikiyor",
      title:
        input.systemJobsAlertLevel === "critical"
          ? "Kritik zamanlanmış iş alarmı var"
          : "Zamanlanmış işler kontrol edilmeli",
      description:
        "E-posta, bakım veya yedekleme işlerinin son çalışma zamanını teknik sağlık bölümünden kontrol edin.",
      href: "#teknik-saglik",
      action: "Teknik sağlığı aç",
    };
  }

  if (input.manualCityShipmentCount > 0) {
    return {
      tone: "warning",
      eyebrow: "Manuel sevkiyat bekliyor",
      title: `${input.manualCityShipmentCount} sipariş City Lojistik işlemi bekliyor`,
      description:
        "Canlı City API bağlantısı kapalı olduğu için bu siparişlerin sevkiyatını sipariş detayından yönetin.",
      href: "/admin/siparisler?cityManual=1",
      action: "Siparişleri görüntüle",
    };
  }

  if (input.overdue > 0 || input.retry > 0) {
    return {
      tone: "warning",
      eyebrow: "Teslimat gecikmesi var",
      title: `${input.overdue + input.retry} işlem takip edilmeli`,
      description:
        "Sistem tekrar denemeye devam ediyor. Son hata ve deneme sayısını olay listesinden kontrol edin.",
      href: "/admin/entegrasyonlar?status=RETRY#teslimat-islemleri",
      action: "Kuyruğu incele",
    };
  }

  if (input.unsupportedReady > 0) {
    return {
      tone: "warning",
      eyebrow: "Bağlantı bekleniyor",
      title: `${input.unsupportedReady} işlem için aktif sağlayıcı yok`,
      description:
        "Bu kayıtlar sağlayıcı yapılandırılana kadar gönderilemez. Teknik sağlık ayrıntılarını kontrol edin.",
      href: "#teknik-saglik",
      action: "Bağlantıları kontrol et",
    };
  }

  return {
    tone: "success",
    eyebrow: "İşlem gerekmiyor",
    title: "Entegrasyon teslimatları normal çalışıyor",
    description:
      "Kalıcı hata, gecikme veya manuel sevkiyat bekleyen sipariş bulunmuyor.",
    href: "#teslimat-islemleri",
    action: "Teslimat geçmişini görüntüle",
  };
}
