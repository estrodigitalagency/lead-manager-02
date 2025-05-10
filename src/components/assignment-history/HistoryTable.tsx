
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryTableProps {
  historyItems: string[];
}

const HistoryTable = ({ historyItems }: HistoryTableProps) => (
  <ScrollArea className="h-[400px]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dettagli Assegnazione</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {historyItems.map((entry, index) => (
          <TableRow key={index}>
            <TableCell>{entry}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

export default HistoryTable;
