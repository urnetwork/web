interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey: {
    toString(): string;
    toBytes(): Uint8Array;
  } | null;
  isConnected: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>;
}

interface Window {
  solana?: SolanaProvider;
  solflare?: SolanaProvider;
}
