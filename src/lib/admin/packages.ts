export interface PackageItem {
  id: string;
  name: string;
  tagline?: string;
  price: number;
  durationDays: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  badgeLabel?: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_PACKAGES_KEY = 'satset_packages_data';

export const DEFAULT_PACKAGES: PackageItem[] = [
  {
    id: 'mingguan',
    name: 'Akses Mingguan',
    tagline: 'Uji coba semua fitur AI Creator selama 7 hari penuh.',
    price: 49000,
    durationDays: 7,
    features: [
      'Akses 5 Tool AI Satset',
      'Generator Prompt Video 8K',
      'Generator Prompt Foto Ultra HD',
      'Video Frame Extractor',
      'TikTok Downloader No Watermark',
      'Bypass Kuota & Anti Limit Level 1'
    ],
    isPopular: false,
    isActive: true,
    badgeLabel: 'Hemat'
  },
  {
    id: 'bulanan',
    name: 'Akses Bulanan (VIP)',
    tagline: 'Pilihan favorit kreator konten & agensi digital.',
    price: 149000,
    durationDays: 30,
    features: [
      'Semua Fitur Paket Mingguan',
      'Prioritas Server Kecepatan Tinggi',
      'Bypass Kuota VIP & Anti Limit Max',
      'Format Export JSON & TXT',
      'Masa Aktif 30 Hari Penuh',
      'Dukungan Admin Fast Response'
    ],
    isPopular: true,
    isActive: true,
    badgeLabel: 'Paling Populer'
  },
  {
    id: 'lifetime',
    name: 'Ultra VIP Lifetime',
    tagline: 'Akses seumur hidup tanpa perpanjangan biaya bulanan.',
    price: 999000,
    durationDays: 36500,
    features: [
      'Akses Selamanya Tanpa Batas',
      'Semua Fitur VIP + Update Masa Depan',
      'Server Dedicated AI Engine',
      'Grup Komunitas Exclusive VIP',
      'Lisensi Komersial Konten Kreator'
    ],
    isPopular: false,
    isActive: true,
    badgeLabel: 'Sultan VIP'
  }
];

export function getPackages(): PackageItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PACKAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Packages Lib] Error reading localStorage packages:', e);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_PACKAGES_KEY, JSON.stringify(DEFAULT_PACKAGES));
  } catch (e) {}

  return DEFAULT_PACKAGES;
}

export function savePackages(packages: PackageItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PACKAGES_KEY, JSON.stringify(packages));
    window.dispatchEvent(new Event('satset_packages_updated'));

    fetch('/api/admin/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packages)
    }).catch(() => {});
  } catch (e) {
    console.error('[Packages Lib] Error saving packages:', e);
  }
}

export function savePackage(pkg: PackageItem): PackageItem[] {
  const current = getPackages();
  const index = current.findIndex((p) => p.id === pkg.id);
  let updated: PackageItem[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...pkg, updatedAt: new Date().toISOString() };
  } else {
    updated = [...current, { ...pkg, updatedAt: new Date().toISOString() }];
  }

  savePackages(updated);
  return updated;
}

export function deletePackage(id: string): PackageItem[] {
  const current = getPackages();
  const filtered = current.filter((p) => p.id !== id);
  savePackages(filtered);
  return filtered;
}

export function togglePackageActive(id: string): PackageItem[] {
  const current = getPackages();
  const updated = current.map((p) => {
    if (p.id === id) {
      return { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() };
    }
    return p;
  });
  savePackages(updated);
  return updated;
}
