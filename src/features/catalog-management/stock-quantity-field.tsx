"use client";

import { useState } from "react";

import {
  deriveStockStatus,
  lowStockAvailableThreshold,
} from "@/domain/stock-status";
import { getStatusLabel } from "@/domain/statuses";

export function StockQuantityField({
  defaultQuantity,
  reservedQuantity,
  inputClassName,
}: {
  defaultQuantity: number;
  reservedQuantity: number;
  inputClassName: string;
}) {
  const [quantityInput, setQuantityInput] = useState(String(defaultQuantity));
  const parsedQuantity = Number(quantityInput);
  const safeQuantity = Number.isFinite(parsedQuantity)
    ? Math.max(0, parsedQuantity)
    : 0;
  const availableQuantity = Math.max(0, safeQuantity - reservedQuantity);
  const status = deriveStockStatus(safeQuantity, reservedQuantity);

  return (
    <div className="grid gap-1.5">
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Fiziksel stok
        <input
          name="quantity"
          type="number"
          min={reservedQuantity}
          required
          value={quantityInput}
          onChange={(event) => setQuantityInput(event.target.value)}
          className={inputClassName}
        />
      </label>
      <p className="text-xs leading-5 text-slate-500" aria-live="polite">
        {availableQuantity} kullanılabilir ·{" "}
        <strong className="font-semibold text-slate-700">
          {getStatusLabel(status)}
        </strong>
      </p>
      <p className="sr-only">
        Kullanılabilir stok 1 ile {lowStockAvailableThreshold} arasındaysa az
        stok, daha yüksekse stokta olarak hesaplanır.
      </p>
    </div>
  );
}
