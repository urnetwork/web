import { useCallback } from "react";
import { fetchWalletChallenge } from "../services/api";
import type { WalletAuthPayload, WalletAuthChallengeResponse } from "../services/types";

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export type SolanaWalletType = "phantom" | "solflare";

interface UseWalletLoginResult {
  connectAndSign: (
    walletType: SolanaWalletType
  ) => Promise<WalletAuthPayload | null>;
  isPhantomAvailable: boolean;
  isSolflareAvailable: boolean;
}

export function useWalletLogin(): UseWalletLoginResult {
  const isPhantomAvailable =
    typeof window !== "undefined" && !!window.solana?.isPhantom;
  const isSolflareAvailable =
    typeof window !== "undefined" && !!window.solflare?.isSolflare;

  const connectAndSign = useCallback(
    async (walletType: SolanaWalletType): Promise<WalletAuthPayload | null> => {
      const provider =
        walletType === "phantom" ? window.solana : window.solflare;

      if (!provider) {
        throw new Error(
          walletType === "phantom"
            ? "Phantom wallet not found. Please install the Phantom browser extension."
            : "Solflare wallet not found. Please install the Solflare browser extension."
        );
      }

      await provider.connect();

      if (!provider.publicKey) {
        throw new Error("Failed to connect wallet. No public key found.");
      }

      const walletAddress = provider.publicKey.toString();
      const blockchain = "solana" as const;

      const challengeResponse: WalletAuthChallengeResponse =
        await fetchWalletChallenge({
          wallet_address: walletAddress,
          blockchain,
        });

      if (!challengeResponse.success) {
        throw new Error(
          challengeResponse.error.message || "Failed to fetch wallet challenge"
        );
      }

      const walletMessage = challengeResponse.message_template;
      const messageBytes = new TextEncoder().encode(walletMessage);

      const result = await provider.signMessage(messageBytes, "utf8");
      const walletSignature = encodeBase64(result.signature);

      return {
        wallet_address: walletAddress,
        wallet_message: walletMessage,
        wallet_signature: walletSignature,
        blockchain,
        challenge: challengeResponse.challenge,
        timestamp: challengeResponse.timestamp,
      };
    },
    []
  );

  return { connectAndSign, isPhantomAvailable, isSolflareAvailable };
}
