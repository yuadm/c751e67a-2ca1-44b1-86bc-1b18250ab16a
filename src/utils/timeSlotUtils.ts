import { supabase } from "@/integrations/supabase/client";

// Cache for time slot mappings
let timeSlotCache: Record<string, string> | null = null;

export async function getTimeSlotMappings(): Promise<Record<string, string>> {
  if (timeSlotCache) {
    return timeSlotCache;
  }

  try {
    const { data, error } = await supabase
      .from('application_shift_settings')
      .select('id, label')
      .eq('is_active', true);

    if (error) throw error;

    timeSlotCache = {};
    data?.forEach(slot => {
      if (timeSlotCache) {
        timeSlotCache[slot.id] = slot.label;
      }
    });

    return timeSlotCache || {};
  } catch (error) {
    console.error('Error fetching time slot mappings:', error);
    return {};
  }
}

export function mapTimeSlotIds(timeSlots: Record<string, any>, mappings: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  Object.entries(timeSlots).forEach(([slotId, days]) => {
    const label = mappings[slotId] || slotId; // Fallback to UUID if mapping not found
    mapped[label] = days;
  });
  
  return mapped;
}