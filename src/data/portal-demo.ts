import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileText,
  PackageSearch,
  ShieldCheck,
  Truck,
  UsersRound,
} from "lucide-react";

export const portalModules = [
  {
    title: "Bayi onay akışı",
    description: "Başvuruları inceleyin, müşteri grubu ve satış temsilcisi atayın.",
    icon: UsersRound,
  },
  {
    title: "Katalog ve güçlü arama",
    description: "Ürün kodu, araç marka/model, ölçü ve cam tipine göre hızlı arama.",
    icon: PackageSearch,
  },
  {
    title: "Teklif ve özel üretim",
    description: "Dosya, ölçü, fotoğraf ve teknik not içeren teklif talepleri.",
    icon: FileText,
  },
  {
    title: "Sipariş operasyonu",
    description: "Onay, hazırlık, üretim, sevk ve teslim durumlarını izleyin.",
    icon: ClipboardCheck,
  },
  {
    title: "Stok görünürlüğü",
    description: "Bayiye sade, ekibe detaylı stok görünürlüğü sağlayan temel.",
    icon: Boxes,
  },
  {
    title: "Güvenli rol mimarisi",
    description: "Admin, satış, depo, muhasebe, bayi sahibi ve bayi personeli ayrımı.",
    icon: ShieldCheck,
  },
];

export const catalogPreview = [
  {
    code: "EGL-OT-1458",
    name: "Fiat Ducato Ön Cam Lamine",
    category: "Otomotiv Camı",
    vehicle: "Fiat Ducato 2014-2026",
    type: "Lamine / Yeşil",
    stock: "Stokta",
    mode: "Sipariş veya teklif",
  },
  {
    code: "EGL-BUS-2204",
    name: "Mercedes Sprinter Yan Sürgülü Cam",
    category: "Otobüs ve Minibüs Camı",
    vehicle: "Sprinter 2018-2026",
    type: "Temperli / Privacy",
    stock: "Stokta",
    mode: "Sipariş veya teklif",
  },
  {
    code: "EGL-CAR-0901",
    name: "Karavan Açılır Yan Cam 900x450",
    category: "Karavan Camı",
    vehicle: "Özel üretim",
    type: "Temperli / Füme",
    stock: "Üretime uygun",
    mode: "Sadece teklif",
  },
  {
    code: "EGL-MAR-0012",
    name: "Marine Lamine Kavisli Cam",
    category: "Yat / Marine Camı",
    vehicle: "Proje bazlı",
    type: "Lamine / Kavisli",
    stock: "Stok sorunuz",
    mode: "Sadece teklif",
  },
];

export const adminQueues = [
  { label: "Onay bekleyen bayi", value: "9", icon: UsersRound },
  { label: "Yeni teklif talebi", value: "24", icon: FileText },
  { label: "Yeni sipariş", value: "13", icon: ClipboardCheck },
  { label: "Düşük stok alarmı", value: "7", icon: Boxes },
  { label: "Sevke hazır", value: "18", icon: Truck },
  { label: "Aylık satış görünümü", value: "₺4.8M", icon: BarChart3 },
];

export const contentSettings = [
  {
    key: "homepage.hero.title",
    label: "Ana banner başlığı",
    value: "EkolGlass B2B Bayi Portalı",
  },
  {
    key: "homepage.hero.subtitle",
    label: "Ana banner açıklaması",
    value:
      "Otomotiv, karavan, otobüs-minibüs ve özel üretim cam siparişlerini tek merkezden yönetin.",
  },
  {
    key: "homepage.hero.cta",
    label: "Birincil aksiyon metni",
    value: "Bayi başvurusu yap",
  },
];
