import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function layout(title: string, body: string, action?: { label: string; url: string }) {
  const actionText = action ? `\n\n${action.label}: ${action.url}` : "";
  const actionHtml = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#111827;color:#fff;padding:12px 18px;text-decoration:none">${escapeHtml(action.label)}</a></p>`
    : "";
  return {
    text: `${title}\n\n${body}${actionText}\n\nEkolGlass B2B`,
    html: `<!doctype html><html lang="tr"><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #dfe3e8;padding:28px"><p style="font-size:13px;font-weight:700;letter-spacing:.08em">EKOLGLASS B2B</p><h1 style="font-size:24px;margin:20px 0">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.6">${escapeHtml(body)}</p>${actionHtml}<p style="font-size:12px;color:#667085;margin-top:28px">Bu e-posta EkolGlass B2B işlem bildirimi olarak gönderildi.</p></div></div></body></html>`,
  };
}

export function credentialTemplate(input: {
  kind: "activation" | "password-reset";
  name: string;
  url: string;
  expiresAt: Date;
}) {
  const activation = input.kind === "activation";
  const title = activation ? "Bayi hesabınızı etkinleştirin" : "Parolanızı sıfırlayın";
  const body = `${input.name}, güvenli bağlantınız ${input.expiresAt.toLocaleString("tr-TR")} tarihine kadar geçerlidir. Bu işlemi siz başlatmadıysanız e-postayı dikkate almayın.`;
  return {
    subject: `EkolGlass B2B | ${title}`,
    ...layout(title, body, {
      label: activation ? "Hesabı etkinleştir" : "Parolayı sıfırla",
      url: input.url,
    }),
  };
}

export function commerceTemplate(input: {
  kind: "order" | "quote";
  name: string;
  reference: string;
  statusLabel: string;
  url: string;
  submitted?: boolean;
}) {
  const entity = input.kind === "order" ? "Sipariş" : "Teklif";
  const title = input.submitted
    ? `${entity} talebiniz alındı`
    : `${entity} durumunuz güncellendi`;
  const body = `${input.name}, ${input.reference} numaralı ${entity.toLocaleLowerCase("tr-TR")} kaydınızın güncel durumu: ${input.statusLabel}.`;
  return {
    subject: `EkolGlass B2B | ${input.reference} | ${input.statusLabel}`,
    ...layout(title, body, { label: `${entity} detayını aç`, url: input.url }),
  };
}
