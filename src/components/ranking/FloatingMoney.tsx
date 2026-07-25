import { motion } from "framer-motion";
import { useMemo } from "react";

const EMOJIS = ["💰", "💵", "💶", "🪙", "💸"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function FloatingMoney() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: randomBetween(2, 98),
        duration: randomBetween(8, 15),
        delay: randomBetween(0, 10),
        size: randomBetween(16, 28),
        opacity: randomBetween(0.15, 0.3),
      })),
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none"
          style={{ left: `${p.x}%`, fontSize: p.size, top: -40 }}
          initial={{ y: -50, opacity: 0, rotate: 0 }}
          animate={{
            y: "110vh",
            opacity: [0, p.opacity, p.opacity, 0],
            rotate: 360,
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}
