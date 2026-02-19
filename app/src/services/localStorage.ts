export interface WalletStatsRecord {
  id: string;
  user_id: string;
  network_name: string;
  paid_bytes_provided: number;
  unpaid_bytes_provided: number;
  created_at: string;
  updated_at: string;
}

const WALLET_STATS_KEY = 'wallet_stats_history';

// Generate a simple UUID-like string
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

export const saveWalletStats = async (
  userId: string,
  networkName: string,
  paidBytes: number,
  unpaidBytes: number
): Promise<{ data: WalletStatsRecord | null; error: unknown }> => {
  try {
    const now = new Date().toISOString();
    const newRecord: WalletStatsRecord = {
      id: generateId(),
      user_id: userId,
      network_name: networkName,
      paid_bytes_provided: paidBytes,
      unpaid_bytes_provided: unpaidBytes,
      created_at: now,
      updated_at: now,
    };

    // Get existing data
    const existingData = getStoredWalletStats();
    
    // Add new record to the beginning
    const updatedData = [newRecord, ...existingData];
    
    // Keep only the last 1000 records to prevent localStorage from growing too large
    const trimmedData = updatedData.slice(0, 1000);
    
    // Save to localStorage
    localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(trimmedData));
    
    return { data: newRecord, error: null };
  } catch (error) {
    console.error('Error saving wallet stats to localStorage:', error);
    return { data: null, error };
  }
};

export const getWalletStatsHistory = async (
  userId: string,
  limit: number = 1000
): Promise<{ data: WalletStatsRecord[] | null; error: unknown }> => {
  try {
    const allData = getStoredWalletStats();
    
    // Filter by user ID and apply limit (use all data if limit is 1000 or higher)
    const userData = allData
      .filter(record => record.user_id === userId);
    
    // Only apply limit if it's less than the total available data
    const limitedData = limit >= 1000 ? userData : userData.slice(0, limit);
    
    return { data: limitedData, error: null };
  } catch (error) {
    console.error('Error fetching wallet stats from localStorage:', error);
    return { data: null, error };
  }
};

export const getLatestWalletStats = async (
  userId: string
): Promise<{ data: WalletStatsRecord | null; error: unknown }> => {
  try {
    const allData = getStoredWalletStats();
    
    // Find the latest record for this user
    const userRecords = allData.filter(record => record.user_id === userId);
    const latest = userRecords.length > 0 ? userRecords[0] : null;
    
    return { data: latest, error: null };
  } catch (error) {
    console.error('Error fetching latest wallet stats from localStorage:', error);
    return { data: null, error };
  }
};

export const clearWalletStatsHistory = async (
  userId: string
): Promise<{ success: boolean; error: unknown }> => {
  try {
    const allData = getStoredWalletStats();
    
    // Remove all records for this user
    const filteredData = allData.filter(record => record.user_id !== userId);
    
    // Save back to localStorage
    localStorage.setItem(WALLET_STATS_KEY, JSON.stringify(filteredData));
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error clearing wallet stats from localStorage:', error);
    return { success: false, error };
  }
};

// Helper function to get all stored wallet stats
const getStoredWalletStats = (): WalletStatsRecord[] => {
  try {
    const stored = localStorage.getItem(WALLET_STATS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error parsing stored wallet stats:', error);
    return [];
  }
};

// Test localStorage availability
export const testConnection = async (): Promise<boolean> => {
  try {
    const testKey = 'wallet_stats_test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    console.log('localStorage connection successful');
    return true;
  } catch (error) {
    console.error('localStorage not available:', error);
    return false;
  }
};

// Clear all wallet stats data (for debugging/maintenance)
export const clearAllWalletStats = (): void => {
  try {
    localStorage.removeItem(WALLET_STATS_KEY);
    console.log('All wallet stats data cleared from localStorage');
  } catch (error) {
    console.error('Error clearing all wallet stats:', error);
  }
};

// Get storage usage information
export const getStorageInfo = (): { totalRecords: number; storageSize: string } => {
  try {
    const data = getStoredWalletStats();
    const dataString = localStorage.getItem(WALLET_STATS_KEY) || '';
    const sizeInBytes = new Blob([dataString]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    
    return {
      totalRecords: data.length,
      storageSize: `${sizeInKB} KB`
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { totalRecords: 0, storageSize: '0 KB' };
  }
};

// Close connection (no-op for localStorage)
export const closeConnection = async (): Promise<void> => {
  console.log('localStorage connection closed (no action needed)');
};