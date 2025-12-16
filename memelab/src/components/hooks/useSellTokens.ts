import { useMemelabProgram } from "./useMemelabProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from '@solana/wallet-adapter-react'
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
} from "@solana/spl-token";
import { deriveAssociatedTokenAddress } from '@/lib/utils'
import { toast } from "sonner";

// Use environment variable for safety
const PLATFORM_WALLET_STRING = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET || "11111111111111111111111111111111";
const PLATFORM_WALLET = new PublicKey(PLATFORM_WALLET_STRING);

export const useSellTokens = () => {
  const { program } = useMemelabProgram();
  const { publicKey } = useWallet();

  const sell = async (mintAddress: string, tokenAmount: number) => {
    if (!program || !publicKey) {
        toast.error("Wallet not connected");
        return;
    }

    try {
      toast.loading("Selling tokens...", { id: "sell" });

      const mint = new PublicKey(mintAddress);
      // Math: 1 Token = 1,000,000 raw units
      const amountRaw = new BN(tokenAmount * 1_000_000);
      const minSolOut = new BN(0); // 0 Slippage for now

      // --- FIND ADDRESSES ---
      const [platformConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_config")],
        program.programId
      );

      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mint.toBuffer()],
        program.programId
      );

      // Vault (Where tokens go)
      const bondingCurveTokenAccount = await deriveAssociatedTokenAddress(
        mint,
        bondingCurve
      );

      // User Wallet (Where tokens come from)
      const sellerTokenAccount = await deriveAssociatedTokenAddress(
        mint,
        publicKey
      );

      // --- FETCH CREATOR ---
      const curveAccount = await (program.account as any).tokenBondingCurve.fetch(bondingCurve);
      const creatorWallet = curveAccount.creator;

      // --- EXECUTE SELL ---
      const tx = await program.methods
        .sellTokens(amountRaw, minSolOut) // Note: If this fails, try removing minSolOut
        .accounts({
          seller: publicKey,
          mint: mint,
          bondingCurve: bondingCurve,
          bondingCurveTokenAccount: bondingCurveTokenAccount,
          sellerTokenAccount: sellerTokenAccount,
          platformConfig: platformConfig,
          
          // FEES
          feeWallet: PLATFORM_WALLET, 
          creatorWallet: creatorWallet,    // Matched to your Buy hook
          
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success("Sold successfully!", { id: "sell" });
      console.log("Sell Tx:", tx);

    } catch (error: any) {
      console.error("Sell Error:", error);
      toast.error("Failed: " + error.message, { id: "sell" });
    }
  };

  return { sell };
};