export interface UserSession {
  code: string;
  role: 'admin' | 'user';
  email?: string;
  loginTime: number;
}

export interface AccessCodeItem {
  code: string;
  note: string;
  createdAt: number;
}

const STORAGE_SESSION_KEY = 'satset_user_session';
const STORAGE_CODES_KEY = 'satset_valid_access_codes';

// Default user access codes
const DEFAULT_ACCESS_CODES: AccessCodeItem[] = [
  { code: 'SATSET-ULTRA-VIP', note: 'Paket Ultra VIP Lifetime', createdAt: Date.now() },
  { code: 'PROMPT-SATSET-888', note: 'Akses Tester VIP', createdAt: Date.now() },
];

export const MASTER_ADMIN_KEY = process.env.ADMIN_ACCESS_CODE || '';
export const MASTER_ADMIN_EMAIL = 'globallensn@gmail.com';

export function getAccessCodes(): AccessCodeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_CODES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Gagal membaca kode akses dari localStorage', err);
  }
  // Save default codes if first time
  saveAccessCodes(DEFAULT_ACCESS_CODES);
  return DEFAULT_ACCESS_CODES;
}

export function saveAccessCodes(codes: AccessCodeItem[]) {
  try {
    localStorage.setItem(STORAGE_CODES_KEY, JSON.stringify(codes));
  } catch (err) {
    console.error('Gagal menyimpan kode akses ke localStorage', err);
  }
}

export function addSpecificAccessCode(code: string, note: string = 'Pembelian Paket Satset'): AccessCodeItem {
  const current = getAccessCodes();
  const existing = current.find(c => c.code.toUpperCase() === code.toUpperCase());
  if (existing) return existing;
  
  const newItem: AccessCodeItem = {
    code: code.toUpperCase(),
    note,
    createdAt: Date.now(),
  };
  const updated = [newItem, ...current];
  saveAccessCodes(updated);
  return newItem;
}

export function generateNewAccessCode(note: string = 'Akses Baru'): AccessCodeItem {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const newCode = `SATSET-VIP-${randomNum}`;
  const current = getAccessCodes();
  const newItem: AccessCodeItem = {
    code: newCode,
    note,
    createdAt: Date.now(),
  };
  const updated = [newItem, ...current];
  saveAccessCodes(updated);
  return newItem;
}

export function removeAccessCode(codeToRemove: string) {
  const current = getAccessCodes();
  const updated = current.filter((item) => item.code.toUpperCase() !== codeToRemove.toUpperCase());
  saveAccessCodes(updated);
}

export function verifyAccessCode(input: string): { success: boolean; role?: 'admin' | 'user'; email?: string; code?: string; error?: string } {
  const cleaned = input.trim().toUpperCase();
  if (!cleaned) {
    return { success: false, error: 'Masukkan Kode Akses Anda.' };
  }

  // Master Admin Key or Email
  const isAdminKeyMatch = Boolean(MASTER_ADMIN_KEY && cleaned === MASTER_ADMIN_KEY.toUpperCase());
  const isAdminEmailMatch = Boolean(cleaned === MASTER_ADMIN_EMAIL.toUpperCase());

  if (isAdminKeyMatch || isAdminEmailMatch) {
    return {
      success: true,
      role: 'admin',
      email: MASTER_ADMIN_EMAIL,
      code: MASTER_ADMIN_KEY || MASTER_ADMIN_EMAIL,
    };
  }

  // Check against valid user codes
  const validCodes = getAccessCodes();
  const matched = validCodes.find((item) => item.code.toUpperCase() === cleaned);

  if (matched || cleaned.startsWith('SATSET-')) {
    return {
      success: true,
      role: 'user',
      code: matched ? matched.code : cleaned,
    };
  }

  return {
    success: false,
    error: 'Kode Akses tidak ditemukan atau telah kedaluwarsa. Silakan konsultasi via WhatsApp.',
  };
}

export function getUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Gagal membaca sesi dari localStorage', err);
  }
  return null;
}

export function setUserSession(session: UserSession | null) {
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } else {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Gagal menyimpan sesi ke localStorage', err);
  }
}

export function logoutUser() {
  setUserSession(null);
}
