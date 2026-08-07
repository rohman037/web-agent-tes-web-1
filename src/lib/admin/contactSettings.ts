export interface ContactSettings {
  whatsappNumber: string;
  whatsappTemplate: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_CONTACT_KEY = 'satset_contact_settings';

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  whatsappNumber: '6281234567890',
  whatsappTemplate: 'Halo Admin Tools Satset, saya ingin konsultasi mengenai Kode Akses.'
};

/**
 * Normalizes a WhatsApp phone number:
 * - Removes spaces, dashes, plus signs, and non-digit characters
 * - Converts leading '0' to '62' (Indonesian country code)
 * - E.g. "+62 812-3456-7890" -> "6281234567890"
 * - E.g. "081234567890" -> "6281234567890"
 */
export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, ''); // keep only digits
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Validates whether a WhatsApp number is valid (must be digits, at least 10 digits after normalization)
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const normalized = normalizeWhatsAppNumber(phone);
  return /^\d{10,15}$/.test(normalized);
}

export function getContactSettings(): ContactSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONTACT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          whatsappNumber: parsed.whatsappNumber ? normalizeWhatsAppNumber(parsed.whatsappNumber) : DEFAULT_CONTACT_SETTINGS.whatsappNumber,
          whatsappTemplate: typeof parsed.whatsappTemplate === 'string' ? parsed.whatsappTemplate : DEFAULT_CONTACT_SETTINGS.whatsappTemplate,
          updatedAt: parsed.updatedAt
        };
      }
    }
  } catch (e) {
    console.error('[ContactSettings] Error reading contact settings:', e);
  }

  return DEFAULT_CONTACT_SETTINGS;
}

/**
 * Async fetch settings from backend API and update local cache
 */
export async function syncContactSettingsWithBackend(): Promise<ContactSettings> {
  try {
    const res = await fetch('/api/admin/contact-settings');
    if (res.ok) {
      const data = await res.json();
      if (data && data.whatsappNumber) {
        const payload: ContactSettings = {
          whatsappNumber: normalizeWhatsAppNumber(data.whatsappNumber),
          whatsappTemplate: data.whatsappTemplate || DEFAULT_CONTACT_SETTINGS.whatsappTemplate,
          updatedAt: data.updatedAt
        };
        localStorage.setItem(LOCAL_STORAGE_CONTACT_KEY, JSON.stringify(payload));
        window.dispatchEvent(new Event('satset_contact_settings_updated'));
        return payload;
      }
    }
  } catch (e) {
    console.warn('[ContactSettings] Error syncing from backend API:', e);
  }
  return getContactSettings();
}

export function saveContactSettings(settings: ContactSettings): { success: boolean; error?: string } {
  try {
    const normalizedNumber = normalizeWhatsAppNumber(settings.whatsappNumber);
    if (!isValidWhatsAppNumber(normalizedNumber)) {
      return { 
        success: false, 
        error: 'Nomor WhatsApp tidak valid. Format harus minimal 10 digit (contoh: 0812xxxxxxx atau 62812xxxxxxx).' 
      };
    }

    const payload: ContactSettings = {
      whatsappNumber: normalizedNumber,
      whatsappTemplate: settings.whatsappTemplate.trim() || DEFAULT_CONTACT_SETTINGS.whatsappTemplate,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(LOCAL_STORAGE_CONTACT_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event('satset_contact_settings_updated'));

    // Asynchronously sync with backend API
    fetch('/api/admin/contact-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((err) => console.warn('[ContactSettings] Error persisting to backend API:', err));

    return { success: true };
  } catch (e: any) {
    console.error('[ContactSettings] Error saving settings:', e);
    return { success: false, error: e.message || 'Gagal menyimpan pengaturan WhatsApp.' };
  }
}

export function getWhatsAppUrl(settings?: ContactSettings): string {
  const cfg = settings || getContactSettings();
  const num = normalizeWhatsAppNumber(cfg.whatsappNumber);
  if (!num) return '#';
  const text = encodeURIComponent(cfg.whatsappTemplate || DEFAULT_CONTACT_SETTINGS.whatsappTemplate);
  return `https://wa.me/${num}?text=${text}`;
}
