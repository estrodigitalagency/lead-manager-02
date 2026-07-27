import { motion } from "framer-motion";
import { RankedMember, MetricKey, METRIC_LABELS } from "@/lib/ranking/googleSheets";

interface LeaderboardTableProps {
  members: RankedMember[];
  metric: MetricKey;
  highlightName?: string | null;
}

export function LeaderboardTable({ members, metric, highlightName }: LeaderboardTableProps) {
  const format = METRIC_LABELS[metric].format;

  return (
    <div className="space-y-2">
      {members.map((member, i) => {
        const isMe = highlightName && member.name === highlightName;
        return (
          <motion.div
            key={member.name}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
              isMe ? "bg-primary/15 border-primary/50 ring-1 ring-primary/40" : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <span className={`font-display font-bold text-lg w-8 text-center ${isMe ? "text-primary" : "text-muted-foreground"}`}>
              {member.rank}
            </span>
            <span className={`flex-1 font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>
              {member.name}{isMe ? " (tu)" : ""}
            </span>
            <span className="font-display font-semibold text-primary text-sm sm:text-base">
              {format(member[metric])}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
