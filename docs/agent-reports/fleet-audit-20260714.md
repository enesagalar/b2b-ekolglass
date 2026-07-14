# Fleet Audit - 2026-07-14

## Amac

Yol haritasi ile gercek kod durumunu, production risklerini ve admin/bayi kullanici akislarini uc bagimsiz subagent ile karsilastirmak.

## Agent Hatlari

- Dirac: roadmap ve kod gercegi karsilastirmasi.
- Noether: security ve production readiness incelemesi.
- Aristotle: guest, bayi ve admin is akisi incelemesi.

## Ortak Sonuc

Ana auth, katalog, siparis, teklif arsivi, stok ve admin operasyonlari roadmap dokumanlarindan daha ileridedir. Eski `eksik` maddeler uygulanmis olmasina ragmen roadmap'te acik gorundugu icin faz secimi guvenilir degildi.

## Oncelik Sirasi

1. Bayi siparis gecmisinde sinirsiz sorguyu filtre ve sayfalama ile sinirla.
2. SQLite backup/restore tatbikati ve medya manifest/reconciliation kur.
3. Firma kredi limiti ile acik siparis exposure hesabini ticari onay kapisina bagla.
4. External credential gerektiren SMTP, S3/R2, City ve DNS adimlarini deployment girdileri geldiginde tamamla.

## Kanitlanan Riskler

- `/bayi/siparisler` tum firma siparislerini sinirsiz getiriyor; buyuyen hesaplarda performans ve tarama ergonomisi bozulur.
- SQLite ve lokal medya icin calisan backup/restore komutu ve restore tatbikati yok.
- Expired session/token/import staging kayitlari icin login-failure disinda genel cleanup yok.
- Medya health yalniz konfigurasyonu kontrol ediyor; storage erisilebilirligini kanitlamiyor.
- Firma kredi limiti ve odeme kosulu kayitli ve gorunur, ancak siparis onayinda uygulanmiyor.
- Bayi teklif arsivi metni yeni teklif olusturma kapali kararini her yerde tutarli anlatmiyor.

## Delegasyon Notu

Repo `codex.md` uyarinca Codex CLI delegasyonu denendi; Windows Store uygulama binary'si `Erisim engellendi` hatasi verdi. Incelemeler Codex Desktop multi-agent araci uzerinden uc ayri subagent ile tamamlandi.
