import { useMemelabProgram } from "./useMemelabProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
} from "@solana/spl-token";
import { deriveAssociatedTokenAddress } from '@/lib/utils';
import { toast } from "sonner";

export const useClaimAlpha = () => {
  const { program } = useMemelabProgram();
  const { publicKey } = useWallet();

  const claimAlpha = async (mintAddress: string) => {
    if (!program || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      toast.loading("Claiming Allocation...", { id: "claim" });

      const mint = new PublicKey(mintAddress);

      // 1. Bonding Curve PDA
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mint.toBuffer()],
        program.programId
      );

      // ✅ FIX: Derive the 'User Deposit' PDA correctly
      // Seeds from Rust: [b"alpha_deposit", claimer, mint]
      const [userDeposit] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("alpha_deposit"), 
            publicKey.toBuffer(), 
            mint.toBuffer()
        ],
        program.programId
      );

      // Token Accounts
      const bondingCurveTokenAccount = await deriveAssociatedTokenAddress(
        mint, bondingCurve
      );

      const claimerTokenAccount = await deriveAssociatedTokenAddress(
        mint, publicKey
      );

      // Execute Transaction
      const tx = await program.methods
        .claimAlpha()
        .accounts({
          claimer: publicKey,
          mint: mint,
          bondingCurve: bondingCurve,
          
          // ✅ FIX: Use the correct account name from Rust ('user_deposit' -> 'userDeposit')
          userDeposit: userDeposit, 
          
          bondingCurveTokenAccount: bondingCurveTokenAccount,
          claimerTokenAccount: claimerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success("Allocation Claimed!", { id: "claim" });
      console.log("Claim Tx:", tx);
      
      // Reload to show new balance
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      console.error("Claim Failed:", error);
      toast.error("Failed: " + error.message, { id: "claim" });
    }
  };

  return { claimAlpha };
};