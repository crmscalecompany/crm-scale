import Image from "next/image";

/** Icon + "Scale" wordmark — ported from the commercial dashboard. Uses
 * Inter (via --font-display) rather than the dashboard's Canela cut, which
 * is trial-licensed and not yet cleared for reuse in a second product. */
export function ScaleLogo({ size = "md" }: { size?: "md" | "lg" }) {
  const iconPx = size === "lg" ? 34 : 27;
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/scale-icon.png" alt="" width={iconPx} height={iconPx} priority />
      <span
        className={`font-display font-semibold leading-none tracking-tight text-primary ${size === "lg" ? "text-[26px]" : "text-[20px]"}`}
      >
        Scale
      </span>
    </span>
  );
}
