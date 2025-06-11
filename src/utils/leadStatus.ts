
import { Lead } from "@/types/lead";

export const getLeadStatus = (lead: Lead) => {
  // REGOLA PRINCIPALE: Se ha una call prenotata, NON è mai assegnabile
  if (lead.booked_call === 'SI') {
    return {
      label: 'Call Prenotata',
      className: 'bg-green-100 text-green-800 border-green-200'
    };
  }
  
  // Priorità: se ha un venditore, è assegnato
  if (lead.venditore) {
    return {
      label: 'Assegnato',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  }
  
  // Per i lead senza call prenotate, usa la logica assignable
  if (lead.assignable) {
    return {
      label: 'Assegnabile',
      className: 'bg-green-100 text-green-800 border-green-200'
    };
  }
  
  // Altrimenti usa il campo stato dal database come fallback
  switch (lead.stato) {
    case 'assegnato':
      return {
        label: 'Assegnato',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      };
    case 'nuovo':
      return {
        label: 'Nuovo',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      };
    case 'lavorato':
      return {
        label: 'Lavorato',
        className: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    case 'prenotato':
      return {
        label: 'Call Prenotata',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    default:
      return {
        label: 'Non assegnabile',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
  }
};
