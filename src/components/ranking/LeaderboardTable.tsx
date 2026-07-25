import { motion } from "framer-motion";
import { RankedMember, MetricKey, METRIC_LABELS } from "@/lib/ranking/googleSheets";

interface LeaderboardTableProps {
  members: RankedMember[];
  metric: MetricKey;
}

export function LeaderboardTable({ members, metric }: LeaderboardTableProps) {
  const format = METRIC_LABELS[metric].format;

  return (
    <div className="space-y-2">
      {members.map((member, i) => (
        <motion.div
          key={member.name}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex items-center gap-4 rounded-lg bg-card border border-border px-4 py-3 hover:border-primary/30 transition-colors"
        >
          <span className="font-display font-bold text-lg w-8 text-center text-muted-foreground">
            {member.rank}
          </span>
          <span className="flex-1 font-medium text-foreground truncate">
            {member.name}
          </span>
          <span className="font-display font-semibold text-primary text-sm sm:text-base">
            {format(member[metric])}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
