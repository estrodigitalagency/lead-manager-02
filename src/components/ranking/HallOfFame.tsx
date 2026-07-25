import { Star } from "lucide-react";

function driveUrlToEmbed(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  return url;
}

interface HallOfFameProps {
  images: string[];
}

export const HallOfFame = ({ images }: HallOfFameProps) => {
  if (images.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-center gap-2 mb-6">
        <Star className="w-6 h-6 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">Hall of Fame</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((url, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden border border-border bg-card transition-transform hover:scale-[1.02]"
          >
            <img
              src={driveUrlToEmbed(url)}
              alt={`Hall of Fame ${i + 1}`}
              className="w-full h-auto object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
