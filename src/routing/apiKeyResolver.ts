import { getAntiLimitConfig } from '../lib/antiLimit';
import { getApiKeys, ApiKeyItem } from '../lib/admin/apiKeys';

export interface ResolvedKeyContext {
  key: string;
  source: 'user_key' | 'flagship' | 'tier2' | 'tier3';
  keyId?: string;
}

/**
 * Resolves the API key to use based on strict priority order:
 * 1. User's own custom API key (from ApiKeySettingsView / antiLimit config)
 * 2. Admin Flagship key pool (active keys in admin pool)
 * 3. Admin Backup / Tier 2 pool
 * 4. Fallback system environment variable
 */
export function resolveApiKey(customApiKeyInput?: string, clientAccessCode?: string): ResolvedKeyContext {
  // 1. User custom key check
  const antiLimitCfg = getAntiLimitConfig(clientAccessCode);
  const userKey = (customApiKeyInput || antiLimitCfg.customApiKey || '').trim();

  if (userKey && userKey.length > 5) {
    return {
      key: userKey,
      source: 'user_key',
    };
  }

  // Check antiLimit multi-keys array if configured by user
  if (Array.isArray(antiLimitCfg.apiKeys) && antiLimitCfg.apiKeys.length > 0) {
    const validUserKey = antiLimitCfg.apiKeys.find((k) => k && k.trim().length > 5);
    if (validUserKey) {
      return {
        key: validUserKey.trim(),
        source: 'user_key',
      };
    }
  }

  // 2. Admin API key pool resolution with Auto-Rotation (Least-Used)
  const adminKeys = getApiKeys().filter(
    (k) => k.status === 'active' && (k.dailyUsage || 0) < (k.dailyLimit || 1000)
  );

  if (adminKeys.length > 0) {
    // Pick active key with lowest daily usage to balance load evenly
    const sortedKeys = [...adminKeys].sort(
      (a, b) => (a.dailyUsage || 0) - (b.dailyUsage || 0)
    );
    const selectedKey = sortedKeys[0];
    return {
      key: selectedKey.key,
      source: 'flagship',
      keyId: selectedKey.id,
    };
  }

  // Fallback if all active admin keys hit limit: try any active key
  const allActiveAdminKeys = getApiKeys().filter((k) => k.status === 'active');
  if (allActiveAdminKeys.length > 0) {
    const selectedKey = allActiveAdminKeys[0];
    return {
      key: selectedKey.key,
      source: 'flagship',
      keyId: selectedKey.id,
    };
  }

  // 3. Fallback to server environment key
  const envKey = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '';
  if (envKey) {
    return {
      key: envKey,
      source: 'flagship',
    };
  }

  throw new Error('Semua model dan API key sedang tidak tersedia. Silakan masukkan API Key di menu Anti Limit.');
}
