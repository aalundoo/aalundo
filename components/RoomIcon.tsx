const SIZES = {
  sm: "h-10 w-10 rounded-xl text-lg",
  md: "h-12 w-12 rounded-xl text-xl",
  lg: "h-16 w-16 rounded-2xl text-3xl",
  xl: "h-24 w-24 rounded-3xl text-5xl",
} as const;

export default function RoomIcon({
  emoji,
  image,
  gradient,
  size = "md",
  glow = false,
}: {
  emoji: string;
  image?: string | null;
  gradient: string;
  size?: keyof typeof SIZES;
  glow?: boolean;
}) {
  const base = `${SIZES[size]} shrink-0 ${glow ? "shadow-glow" : ""}`;
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className={`${base} object-cover ring-1 ring-white/10`}
      />
    );
  }
  return (
    <div
      className={`${base} flex items-center justify-center bg-gradient-to-br ${gradient}`}
    >
      {emoji}
    </div>
  );
}
