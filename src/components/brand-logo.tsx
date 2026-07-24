export function BrandLogo({
  compact = false,
  inverse = false,
  className = "",
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <span
        aria-hidden="true"
        className={`brand-mark ${inverse ? "brand-mark-inverse" : ""} ${className}`}
      >
        <Image src="/brand/ekolglass-mark.svg" alt="" width={32} height={28} unoptimized />
      </span>
    );
  }

  return (
    <span className={`brand-logo ${className}`}>
      <Image
        src="/brand/ekolglass-logo.svg"
        alt="EkolGlass Oto Cam"
        width={1437}
        height={526}
        unoptimized
      />
    </span>
  );
}
import Image from "next/image";
