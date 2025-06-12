
import { Lead } from "@/types/lead";

export const getLeadStatus = (lead: Lead, daysBeforeAssignable: number = 7) => {
  const now = new Date();
  const leadCreatedAt = new Date(lead.created_at);
  const hoursSinceCreation = (now.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
  const daysSinceCreation = hoursSinceCreation / 24;

  // 1. NUOVO: lead entrato nelle ultime 24 ore
  if (hoursSinceCreation < 24) {
    return {
      label: 'Nuovo',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    };
  }

  // 2. Se ha una call prenotata = SI -> ASSEGNATO (viene gestito dal trigger DB)
  if (lead.booked_call === 'SI') {
    return {
      label: 'Assegnato',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  }

  // 3. Se ha già un venditore -> ASSEGNATO
  if (lead.venditore) {
    return {
      label: 'Assegnato',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  }

  // 4. Call = NO e è passato il tempo minimo -> ASSEGNABILE
  if (lead.booked_call === 'NO' && daysSinceCreation >= daysBeforeAssignable) {
    return {
      label: 'Assegnabile',
      className: 'bg-green-100 text-green-800 border-green-200'
    };
  }

  // 5. Call = NO ma non è passato il tempo minimo -> NON ASSEGNABILE (ma manteniamo la logica di business)
  return {
    label: 'Non assegnabile',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };
};
