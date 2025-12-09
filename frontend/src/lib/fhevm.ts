// Dynamic import to avoid SSR issues
let fhevmjs: any = null;

export interface FHEVMProvider {
  isInitialized(): boolean;
  isUsingRealFHEVM(): boolean;
  encrypt(value: number | string): Promise<string>;
  decrypt(encryptedValue: string): Promise<number>;
  getInstance(): any;
}

class RealFHEVMProvider implements FHEVMProvider {
  private instance: any = null;
  private initialized = false;
  private usingRealFHEVM = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('FHEVM: Not in browser environment, using mock');
        return;
      }

      // Check if ethereum is available
      if (!window.ethereum) {
        console.log('FHEVM: No ethereum provider found, using mock');
        return;
      }

      // Dynamic import to avoid SSR issues
      if (!fhevmjs) {
        fhevmjs = await import('fhevmjs');
      }

      // Initialize FHEVM
      await fhevmjs.initFhevm();
      
      // For now, we'll use mock since real FHEVM requires proper KMS setup
      // In production, you would need to deploy KMS contract and get its address
      console.log('FHEVM: Real FHEVM requires KMS contract setup, using mock for now');
      this.usingRealFHEVM = false;
      this.initialized = true;
      
    } catch (error) {
      console.warn('FHEVM: Failed to initialize real FHEVM, using mock:', error);
      this.usingRealFHEVM = false;
      this.initialized = true;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isUsingRealFHEVM(): boolean {
    return this.usingRealFHEVM;
  }

  async encrypt(value: number | string): Promise<string> {
    // For now, always use mock encryption
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const mockData = {
      value: numValue,
      timestamp: Date.now(),
      type: 'mock'
    };
    return btoa(JSON.stringify(mockData));
  }

  async decrypt(encryptedValue: string): Promise<number> {
    try {
      // Mock decryption
      const mockData = JSON.parse(atob(encryptedValue));
      return mockData.value || 0;
    } catch (error) {
      console.warn('FHEVM: Mock decryption failed, returning 0');
      return 0;
    }
  }

  getInstance(): any {
    return this.instance;
  }
}

class MockFHEVMProvider implements FHEVMProvider {
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isUsingRealFHEVM(): boolean {
    return false;
  }

  async encrypt(value: number | string): Promise<string> {
    // Mock encryption - just return a base64 encoded string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const mockData = {
      value: numValue,
      timestamp: Date.now(),
      type: 'mock'
    };
    return btoa(JSON.stringify(mockData));
  }

  async decrypt(encryptedValue: string): Promise<number> {
    try {
      // Mock decryption - try to parse the mock data
      const mockData = JSON.parse(atob(encryptedValue));
      return mockData.value || 0;
    } catch (error) {
      console.warn('FHEVM: Mock decryption failed, returning 0');
      return 0;
    }
  }

  getInstance(): any {
    return null;
  }
}

// Create provider instance
const realProvider = new RealFHEVMProvider();
const mockProvider = new MockFHEVMProvider();

// Export the active provider (using mock for now due to KMS requirements)
export const fhevmProvider: FHEVMProvider = mockProvider;

// Initialize FHEVM on module load
if (typeof window !== 'undefined') {
  // Try real FHEVM first, but fallback to mock
  realProvider.initialize().then(() => {
    if (realProvider.isUsingRealFHEVM()) {
      console.log('FHEVM: Using real FHEVM provider');
    } else {
      console.log('FHEVM: Using mock provider');
    }
  }).catch(() => {
    console.log('FHEVM: Using mock provider due to initialization error');
  });
} else {
  mockProvider.initialize();
}

// Fallback to mock if real FHEVM fails
export const initializeFHEVM = async (): Promise<FHEVMProvider> => {
  try {
    await realProvider.initialize();
    if (realProvider.isUsingRealFHEVM()) {
      return realProvider;
    }
  } catch (error) {
    console.warn('Real FHEVM initialization failed, using mock:', error);
  }
  
  await mockProvider.initialize();
  return mockProvider;
};