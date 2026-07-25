import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RankedMember, MetricKey, METRIC_LABELS } from "@/lib/ranking/googleSheets";
import { MoneyBurst } from "./MoneyBurst";

interface PodiumProps {
  members: RankedMember[];
  metric: MetricKey;
}

const podiumConfig = [
  {
    rank: 2,
    medal: "🥈",
    height: "h-28",
    colorClass: "border-silver shadow-[0_0_20px_hsl(var(--silver)/0.3)]",
    bgClass: "bg-gradient-to-b from-silver/20 to-transparent",
    delay: 0.2,
  },
  {
    rank: 1,
    medal: "🥇",
    height: "h-36",
    colorClass: "border-gold shadow-[0_0_30px_hsl(var(--gold)/0.4)]",
    bgClass: "bg-gradient-to-b from-gold/20 to-transparent",
    delay: 0,
  },
  {
    rank: 3,
    medal: "🥉",
    height: "h-24",
    colorClass: "border-bronze shadow-[0_0_20px_hsl(var(--bronze)/0.3)]",
    bgClass: "bg-gradient-to-b from-bronze/20 to-transparent",
    delay: 0.4,
  },
];

export function Podium({ members, metric }: PodiumProps) {
  const format = METRIC_LABELS[metric].format;
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    setShowBurst(false);
    const timer = setTimeout(() => setShowBurst(true), 600);
    return () => clearTimeout(timer);
  }, [metric]);

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6 px-4 pb-2">
      {podiumConfig.map((config) => {
        const member = members.find((m) => m.rank === config.rank);
        if (!member) return null;

        return (
          <motion.div
            key={config.rank}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: config.delay, duration: 0.5, ease: "easeOut" }}
            className="relative flex flex-col items-center flex-1 max-w-[180px]"
          >
            {config.rank === 1 && <MoneyBurst isVisible={showBurst} />}
            <div className="text-3xl sm:text-4xl mb-2">{config.medal}</div>
            <p className="font-display font-bold text-sm sm:text-base text-foreground truncate max-w-full text-center">
              {member.name}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-3">
              {format(member[metric])}
            </p>
            <div
              className={`w-full ${config.height} rounded-t-lg border-t-2 border-x-2 ${config.colorClass} ${config.bgClass}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
