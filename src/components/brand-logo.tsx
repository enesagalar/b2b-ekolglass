import Image from "next/image";

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
        <Image src="/brand/ekolglass-icon.ico" alt="" width={28} height={28} />
      </span>
    );
  }

  return (
    <span className={`brand-logo ${className}`}>
      <Image
        src="/brand/ekolglass-logo-source.jpg"
        alt="EkolGlass Oto Cam"
        width={1920}
        height={1080}
        priority
        sizes="176px"
      />
    </span>
  );
}
