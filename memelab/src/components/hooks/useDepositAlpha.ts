import { useMemelabProgram } from "./useMemelabProgram";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

export const useDepositAlpha = () => {
  const { program } = useMemelabProgram();
  const { publicKey } = useWallet();

  const depositAlpha = async (mintAddress: string, amountSol: number) => {
    if (!program || !publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      toast.loading("Depositing SOL...", { id: "alpha-deposit" });

      const mint = new PublicKey(mintAddress);
      const amountLamports = new BN(Math.floor(amountSol * 1_000_000_000));

      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mint.toBuffer()],
        program.programId
      );

      // ✅ FIX: Use the 'User Deposit' PDA here too
      const [userDeposit] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("alpha_deposit"), 
            publicKey.toBuffer(), 
            mint.toBuffer()
        ],
        program.programId
      );

      const tx = await program.methods
        .depositAlpha(amountLamports)
        .accounts({
          user: publicKey,           // Check if Rust calls this 'user' or 'depositor'
          mint: mint,
          bondingCurve: bondingCurve,
          
          // ✅ FIX: Ensure this matches your deposit.rs (likely 'userDeposit' or 'userAlphaDeposit')
          userDeposit: userDeposit, 
          
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success("Deposit Successful!", { id: "alpha-deposit" });
      console.log("Alpha Deposit Tx:", tx);

    } catch (error: any) {
      console.error("Deposit Failed:", error);
      toast.error("Failed: " + error.message, { id: "alpha-deposit" });
    }
  };

  return { depositAlpha };
};