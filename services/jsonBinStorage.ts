/**
 * JSON BIN STORAGE SERVICE
 *
 * Handles persistent storage of simulation data, user profiles, and settings
 * using JSONBin.io API for cloud-based JSON storage.
 */

interface StorageData {
  userProfile?: {
    username: string;
    email: string;
    profilePicture: string;
    preferences: Record<string, any>;
  };
  settings?: Record<string, any>;
  simulations?: Array<{
    id: string;
    timestamp: string;
    params: any;
    telemetry: any;
  }>;
  lastUpdated: string;
}

const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY || '';
const JSONBIN_BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID || '';
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';

export class JSONBinStorage {

  /**
   * Check if JSON Bin is configured
   */
  static isConfigured(): boolean {
    return Boolean(JSONBIN_API_KEY && JSONBIN_BIN_ID);
  }

  /**
   * Fetch data from JSON Bin
   */
  static async fetch(): Promise<StorageData | null> {
    if (!this.isConfigured()) {
      console.warn('[JSONBin] Not configured. Using localStorage fallback.');
      return this.fetchFromLocalStorage();
    }

    try {
      const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}/latest`, {
        method: 'GET',
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Meta': 'false'
        }
      });

      if (!response.ok) {
        throw new Error(`JSONBin fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data as StorageData;
    } catch (error) {
      console.error('[JSONBin] Fetch error:', error);
      return this.fetchFromLocalStorage();
    }
  }

  /**
   * Save data to JSON Bin
   */
  static async save(data: Partial<StorageData>): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('[JSONBin] Not configured. Using localStorage fallback.');
      this.saveToLocalStorage(data);
      return true;
    }

    try {
      // Fetch existing data
      const existing = await this.fetch() || {};

      // Merge with new data
      const merged: StorageData = {
        ...existing,
        ...data,
        lastUpdated: new Date().toISOString()
      };

      const response = await fetch(`${JSONBIN_BASE_URL}/b/${JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(merged)
      });

      if (!response.ok) {
        throw new Error(`JSONBin save failed: ${response.statusText}`);
      }

      // Also save to localStorage as backup
      this.saveToLocalStorage(merged);
      return true;
    } catch (error) {
      console.error('[JSONBin] Save error:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(data);
      return false;
    }
  }

  /**
   * LocalStorage fallback for fetch
   */
  private static fetchFromLocalStorage(): StorageData | null {
    const stored = localStorage.getItem('snaplock_storage');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * LocalStorage fallback for save
   */
  private static saveToLocalStorage(data: Partial<StorageData>): void {
    const existing = this.fetchFromLocalStorage() || {};
    const merged = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('snaplock_storage', JSON.stringify(merged));
  }

  /**
   * Save user profile
   */
  static async saveUserProfile(profile: StorageData['userProfile']): Promise<boolean> {
    return this.save({ userProfile: profile });
  }

  /**
   * Save settings
   */
  static async saveSettings(settings: Record<string, any>): Promise<boolean> {
    return this.save({ settings });
  }

  /**
   * Save simulation record
   */
  static async saveSimulation(simulation: StorageData['simulations'][0]): Promise<boolean> {
    const existing = await this.fetch();
    const simulations = existing?.simulations || [];

    // Keep only last 50 simulations
    const updated = [...simulations, simulation].slice(-50);

    return this.save({ simulations: updated });
  }

  /**
   * Get simulation history
   */
  static async getSimulationHistory(): Promise<StorageData['simulations']> {
    const data = await this.fetch();
    return data?.simulations || [];
  }
}
