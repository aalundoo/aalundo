// Aalundo brand mark: a microphone in the brand gradient on a rounded square.
export default function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} shadow-glow`} aria-hidden>
      <defs>
        <linearGradient id="aalundoLogo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#aalundoLogo)" />
      <rect x="13" y="6" width="6" height="13" rx="3" fill="#fff" />
      <path d="M9 15a7 7 0 0 0 14 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 22v4M12 26h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
