# Agent Reports

Bu klasor arka plan Codex advisor calismalarinin raporlarini tutar.

Kullanim:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-advisor.ps1
```

Sureli arka plan calismasi icin:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-advisor.ps1 -Continuous -IntervalMinutes 30 -MaxRuns 4
```

Notlar:

- Advisor kod dosyalarini read-only inceler.
- Kod degistirmez, git islemi yapmaz.
- Codex CLI bu ortamda read-only calistigi icin raporu stdout marker'lariyla basar; Windows script'i marker arasindaki metni `.md` olarak yazar.
- Periyodik `advisor-*.md` raporlari varsayilan olarak git disinda tutulur. Kalici proje hafizasina alinacak raporlar bilincli olarak `git add -f docs/agent-reports/<rapor>.md` ile eklenir.
- Ana ajan raporlari okuyup uygulanacak maddeleri secer.
- Sonsuz calisma icin `-MaxRuns 0` kullanilabilir, ancak token/kaynak tuketimi nedeniyle bilincli tercih edilmelidir.
