import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import idl from "../../idl/memelab_dex.json";

// Load from environment with safe fallbacks
const PROGRAM_ID_STRING = process.env.NEXT_PUBLIC_PROGRAM_ID ?? "";

let PROGRAM_ID: PublicKey | null = null;
if (PROGRAM_ID_STRING) {
  try {
    PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);
  } catch {
    // Invalid program id string — keep PROGRAM_ID null so we can bail out safely
    PROGRAM_ID = null;
  }
}

export const useMemelabProgram = () => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    if (!PROGRAM_ID) return null;

    const provider = new AnchorProvider(connection, wallet as any, {
      preflightCommitment: "processed",
    });

    // Cast idl to Idl via unknown to avoid `any` while keeping flexibility across Anchor versions
    return new Program(idl as unknown as Idl, provider);
  }, [wallet.publicKey, wallet.signTransaction, connection]);

  return { program };
};