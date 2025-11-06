
import { Lead } from "@/types/lead";

export const getLeadStatus = (lead: Lead, daysBeforeAssignable: number = 7) => {
  const now = new Date();
  const leadCreatedAt = new Date(lead.created_at);
  const daysSinceCreation = (now.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

  // 0. Se è stato manualmente marcato come non assegnabile
  if (lead.manually_not_assignable) {
    return {
      label: 'Non assegnabile (manuale)',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    };
  }

  // 1. Se ha una call prenotata = SI -> ASSEGNATO (viene gestito dal trigger DB)
  if (lead.booked_call === 'SI') {
    return {
      label: 'Assegnato',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    };
  }

  // 2. Se ha già un venditore -> ASSEGNATO
  if (lead.venditore) {
    return {
      label: 'Assegnato',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    };
  }

  // 3. Call = NO e è passato il tempo minimo -> ASSEGNABILE
  if (lead.booked_call === 'NO' && daysSinceCreation >= daysBeforeAssignable) {
    return {
      label: 'Assegnabile',
      className: 'bg-green-100 text-green-800 border-green-200'
    };
  }

  // 4. Call = NO ma non è passato il tempo minimo -> NON ASSEGNABILE
  return {
    label: 'Non assegnabile',
    className: 'bg-red-100 text-red-800 border-red-200'
  };
};
