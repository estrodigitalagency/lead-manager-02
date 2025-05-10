
import { useEffect } from "react";
import { useAssignmentHistory } from "@/hooks/useAssignmentHistory";
import LoadingState from "@/components/assignment-history/LoadingState";
import EmptyState from "@/components/assignment-history/EmptyState";
import HistoryTable from "@/components/assignment-history/HistoryTable";

interface AssignmentHistoryProps {
  key?: string;
}

const AssignmentHistory = ({ key }: AssignmentHistoryProps) => {
  const { history, loading, refreshHistory } = useAssignmentHistory();

  // Refresh history when key prop changes
  useEffect(() => {
    if (key) {
      refreshHistory();
    }
  }, [key, refreshHistory]);

  if (loading) {
    return <LoadingState />;
  }

  if (history.length === 0) {
    return <EmptyState />;
  }

  return <HistoryTable historyItems={history} />;
};

export default AssignmentHistory;
