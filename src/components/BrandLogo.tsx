import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  variant?: "black" | "green" | "green-dark";
};

export default function BrandLogo({ className = "", compact = false, variant = "black" }: BrandLogoProps) {
  return (
    <span
      className={`ori-brand ${compact ? "ori-brand-compact" : ""} ${className}`.trim()}
      role="img"
      aria-label={compact ? "ORI" : "ORI CRUIT HUB"}
    >
      <Image
        className="ori-brand-image"
        src={compact ? `/ori-cruit-hub-mark-${variant}.png` : `/ori-cruit-hub-logo-${variant}.png`}
        alt=""
        width={compact ? 168 : 480}
        height={compact ? 156 : 250}
        unoptimized
      />
    </span>
  );
}
