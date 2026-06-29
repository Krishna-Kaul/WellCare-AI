import wellcareLogo from "@/assets/wellcare-logo.png";

export function Logo({ className = "h-16" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={wellcareLogo}
        alt="WellCare AI"
        className="h-full w-auto object-contain"
        width={400}
        height={1200}
      />
    </div>
  );
}
