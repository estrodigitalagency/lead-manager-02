import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

const EMOJIS = ["💰", "💵", "💶", "🪙", "💸"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface MoneyBurstProps {
  isVisible: boolean;
}

export function MoneyBurst({ isVisible }: MoneyBurstProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: randomBetween(-150, 150),
        y: randomBetween(-200, -50),
        rotation: randomBetween(-180, 180),
        duration: randomBetween(1, 2),
        delay: randomBetween(0, 0.3),
      })),
    []
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-10">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute text-xl sm:text-2xl select-none"
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{
                x: p.x,
                y: p.y,
                scale: 0,
                opacity: 0,
                rotate: p.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
