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
import type { ProgramLike } from "../../lib/anchorTypes";
import { getErrorMessage } from "../../lib/utils";

// 1. SAFER SETUP: Load from Environment Variable
// We use a fallback (System Program ID) just to prevent the app from crashing 
// if you forget to set the .env file, but you MUST set it to receive fees.
const PLATFORM_WALLET_STRING = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET || "11111111111111111111111111111111";
const PLATFORM_WALLET_ADDRESS = new PublicKey(PLATFORM_WALLET_STRING);

export const useBuyTokens = () => {
  const { program } = useMemelabProgram();
  const { publicKey } = useWallet();

  const buy = async (mintAddress: string, amountSol: number) => {
    // 2. Safety Checks
    if (!program || !publicKey) {
        toast("Wallet not connected");
        return;
    }

    // Check if the developer forgot to set the fee wallet
    if (PLATFORM_WALLET_STRING === "11111111111111111111111111111111") {
        console.warn("⚠️ WARNING: Platform Fee Wallet is not set in .env.local!");
    }

    try {
      toast("Buying tokens...");
      
      const mint = new PublicKey(mintAddress);
      const amountLamports = new BN(amountSol * 1_000_000_000);

      const [platformConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_config")],
        program.programId
      );

      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mint.toBuffer()],
        program.programId
      );

      const bondingCurveVault = await deriveAssociatedTokenAddress(
        mint,
        bondingCurve
      );

      const userTokenAccount = await deriveAssociatedTokenAddress(
        mint,
        publicKey
      );

      
      console.log("Fetching bonding curve data...");
      const p = program as unknown as ProgramLike;
      const curveState = await p.account.tokenBondingCurve.fetch(bondingCurve);
      const creatorWallet = curveState.creator;

      const tx = await p.methods.buyTokens!(amountLamports)
        .accounts({
          buyer: publicKey,
          bondingCurve: bondingCurve,
          mint: mint,
          platformConfig: platformConfig,
          bondingCurveTokenAccount: bondingCurveVault,
          buyerTokenAccount: userTokenAccount,
          
          // 3. Use the Environment Variable Address
          platformFeeWallet: PLATFORM_WALLET_ADDRESS,
          
          // 4. Use the Dynamic Creator Address
          creatorFeeWallet: creatorWallet,
          
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast("Bought tokens!");
      console.log("Tx:", tx);
    } catch (error: unknown) {
      console.error("Buy Error:", error);
      toast("Failed: " + getErrorMessage(error));
    }
  };

  return { buy };
};