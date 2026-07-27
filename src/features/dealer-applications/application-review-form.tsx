"use client";

import {
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Mail,
  MessageSquareMore,
  Save,
  SearchCheck,
  XCircle,
} from "lucide-react";
import { useActionState, useState } from "react";

import {
  getAllowedDealerApplicationTransitions,
  getRecommendedDealerApplicationStatus,
  type DealerApplicationStatus,
} from "@/domain/dealer-application-workflow";
import { getStatusLabel } from "@/domain/statuses";
import {
  reviewDealerApplicationForm,
  type DealerApplicationAdminState,
} from "@/features/dealer-applications/admin-actions";

const initialState: DealerApplicationAdminState = { ok: false, message: "" };
const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-500";
const labelClass = "grid gap-1.5 text-xs font-semibold text-slate-700";

const decisionCopy: Record<
  DealerApplicationStatus,
  {
    title: string;
    description: string;
    button: string;
    tone: string;
    icon: typeof SearchCheck;
  }
> = {
  NEW: {
    title: "Başvuruyu yeni olarak bırak",
    description: "Henüz bir inceleme kararı verilmez ve firma hesabı oluşturulmaz.",
    button: "Notları kaydet",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    icon: CircleAlert,
  },
  IN_REVIEW: {
    title: "İncelemeye al",
    description: "Başvurunun iç ekip tarafından değerlendirildiği kaydedilir. Firma hesabı henüz açılmaz.",
    button: "İncelemeye al",
    tone: "border-blue-200 bg-blue-50 text-blue-900",
    icon: SearchCheck,
  },
  NEEDS_INFO: {
    title: "Ek bilgi bekle",
    description: "Başvuru bilgi bekliyor olarak işaretlenir. Başvuru sahibine otomatik e-posta gönderilmez.",
    button: "Bilgi bekliyor olarak kaydet",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    icon: MessageSquareMore,
  },
  APPROVED: {
    title: "Başvuruyu onayla",
    description: "Firma kaydı ve aktivasyon bekleyen bayi sahibi hesabı aynı işlemde oluşturulur.",
    button: "Başvuruyu onayla",
    tone: "border-teal-200 bg-teal-50 text-teal-900",
    icon: CheckCircle2,
  },
  REJECTED: {
    title: "Başvuruyu reddet",
    description: "Firma veya kullanıcı hesabı oluşturulmaz. Başvuru daha sonra yeniden incelemeye alınabilir.",
    button: "Başvuruyu reddet",
    tone: "border-red-200 bg-red-50 text-red-900",
    icon: XCircle,
  },
};

export function DealerApplicationReviewForm({
  applicationId,
  expectedUpdatedAt,
  currentStatus,
  customerGroups,
  defaultCustomerGroupId,
  defaultPaymentTerms,
  defaultCreditLimit,
  defaultInternalNotes,
}: {
  applicationId: string;
  expectedUpdatedAt: string;
  currentStatus: DealerApplicationStatus;
  customerGroups: Array<{ id: string; name: string }>;
  defaultCustomerGroupId: string;
  defaultPaymentTerms: string;
  defaultCreditLimit: string;
  defaultInternalNotes: string;
}) {
  const [state, action, pending] = useActionState(reviewDealerApplicationForm, initialState);
  const [selectedStatus, setSelectedStatus] = useState<DealerApplicationStatus>(
    getRecommendedDealerApplicationStatus(currentStatus),
  );
  const allowedStatuses = getAllowedDealerApplicationTransitions(currentStatus);
  const decision = decisionCopy[selectedStatus];
  const DecisionIcon = decision.icon;
  const approving = selectedStatus === "APPROVED";

  return (
    <form
      action={action}
      className="grid gap-5 p-5"
      aria-busy={pending}
      onSubmit={(event) => {
        if (
          (selectedStatus === "APPROVED" || selectedStatus === "REJECTED") &&
          !window.confirm(`${decision.title}: Bu karar kaydedilsin mi?`)
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={applicationId} />
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />

      <label className={labelClass}>
        Vereceğiniz karar
        <select
          name="status"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value as DealerApplicationStatus)}
          className={inputClass}
        >
          {allowedStatuses.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <div className={`flex items-start gap-3 rounded-md border p-4 ${decision.tone}`}>
        <DecisionIcon size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">{decision.title}</p>
          <p className="mt-1 text-xs leading-5">{decision.description}</p>
        </div>
      </div>

      {approving ? (
        <div className="grid gap-4 border-y border-slate-200 py-5">
          <div>
            <p className="text-sm font-semibold text-slate-950">Açılacak hesabın ticari koşulları</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Bu bilgiler yeni firmanın sipariş fiyatı ve ticari onay akışında kullanılır.
            </p>
          </div>
          <label className={labelClass}>
            Müşteri grubu
            <select
              name="customerGroupId"
              defaultValue={defaultCustomerGroupId}
              required
              className={inputClass}
            >
              <option value="">Müşteri grubu seçin</option>
              {customerGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Vade
              <input
                name="paymentTerms"
                defaultValue={defaultPaymentTerms}
                className={inputClass}
                placeholder="Örn. 30 gün"
              />
            </label>
            <label className={labelClass}>
              Kredi limiti (TRY)
              <input
                name="creditLimit"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                defaultValue={defaultCreditLimit}
                className={inputClass}
                placeholder="Örn. 250000"
              />
            </label>
          </div>
          <div className="grid gap-2 text-xs leading-5 text-slate-600">
            <p className="flex items-start gap-2">
              <CreditCard size={15} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />
              Limit boş bırakılırsa siparişler otomatik onaylanmaz; her sipariş ticari incelemeye düşer.
            </p>
            <p className="flex items-start gap-2">
              <Mail size={15} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />
              Bayi sahibi aktivasyon bekleyen hesap olarak açılır; aktivasyon bağlantısı firma detayından üretilir.
            </p>
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="customerGroupId" value={defaultCustomerGroupId} />
          <input type="hidden" name="paymentTerms" value={defaultPaymentTerms} />
          <input type="hidden" name="creditLimit" value={defaultCreditLimit} />
        </>
      )}

      <label className={labelClass}>
        İç inceleme notu
        <textarea
          name="internalNotes"
          defaultValue={defaultInternalNotes}
          rows={4}
          maxLength={2000}
          className="min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          placeholder="Kararın dayanağını ve takip edilmesi gereken bilgileri yazın"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60 ${
          selectedStatus === "REJECTED"
            ? "bg-red-700 hover:bg-red-600"
            : "bg-slate-950 hover:bg-slate-800"
        }`}
      >
        <Save size={16} aria-hidden="true" />
        {pending ? "Kaydediliyor" : decision.button}
      </button>

      {state.message ? (
        <p
          role="status"
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            state.ok ? "bg-teal-50 text-teal-900" : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

