
import { Lead } from "@/types/lead";

export const getLeadStatus = (lead: Lead) => {
  // Priorità: se ha un venditore, è assegnato
  if (lead.venditore) {
    return {
      label: 'Assegnato',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  }
  
  // Altrimenti usa il campo stato dal database
  switch (lead.stato) {
    case 'assegnato':
      return {
        label: 'Assegnato',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'nuovo':
      return {
        label: 'Nuovo',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    case 'lavorato':
      return {
        label: 'Lavorato',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    default:
      // Fallback per backward compatibility
      if (lead.assignable) {
        return {
          label: 'Assegnabile',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      } else {
        return {
          label: 'Non assegnabile',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      }
  }
};
