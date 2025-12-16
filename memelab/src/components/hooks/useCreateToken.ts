import { useMemelabProgram } from "./useMemelabProgram";
import { PublicKey, SystemProgram, Keypair, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
} from "@solana/spl-token";
import { toast } from "sonner";
import { deriveAssociatedTokenAddress } from "@/lib/utils";

const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const useCreateToken = () => {
  const { program } = useMemelabProgram();
  const { publicKey } = useWallet();

  const createToken = async (name: string, symbol: string, uri: string) => {
    console.log("🟢 Step 1: createToken function started");

    if (!publicKey) {
        console.error("🔴 Wallet not connected!");
        toast.error("Wallet not connected");
        return;
    }
    
    // DEBUG: Check if program exists
    if (!program) {
        console.error("🔴 Program object is NULL! Check useMemelabProgram hook.");
        toast.error("Failed to connect to Solana Program");
        return;
    }

    console.log("🟢 Step 2: Wallet & Program found. Program ID:", program.programId.toBase58());

    try {
      toast.loading("Preparing transaction...", { id: "create" });

      // Generate Mint
      const mintKeypair = Keypair.generate();
      const alphaDuration = new BN(300); 
      console.log("🟢 Step 3: Mint Generated:", mintKeypair.publicKey.toBase58());

      // Derive Addresses
      console.log("🟢 Step 4: Finding Addresses...");
      
      const [platformConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("platform_config")],
        program.programId
      );
      
      const [bondingCurve] = PublicKey.findProgramAddressSync(
        [Buffer.from("bonding_curve"), mintKeypair.publicKey.toBuffer()],
        program.programId
      );

      const bondingCurveTokenAccount = deriveAssociatedTokenAddress(
        mintKeypair.publicKey,
        bondingCurve
      );

      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        MPL_TOKEN_METADATA_PROGRAM_ID
      );
      
      console.log("🟢 Step 5: Addresses Found. Building Transaction...");

      // BUILD THE TRANSACTION
      const txBuilder = program.methods
        .createToken(name, symbol, uri, alphaDuration)
        .accounts({
          creator: publicKey,
          platformConfig: platformConfig,
          mint: mintKeypair.publicKey,
          bondingCurve: bondingCurve,
          bondingCurveTokenAccount: bondingCurveTokenAccount,
          metadataAccount: metadataAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          metadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY, 
        })
        .signers([mintKeypair]);

      console.log("🟢 Step 6: Requesting Wallet Signature...");
      
      // SEND IT
      const tx = await txBuilder.rpc(); // <--- THIS IS THE MOMENT THE POPUP SHOULD APPEAR

      console.log("🟢 Step 7: Transaction SENT! Signature:", tx);
      toast.success("Token Created!", { id: "create" });
      
      return mintKeypair.publicKey.toBase58();

    } catch (error: any) {
      console.error("🔴 CRASH at Step " + (error.step || "Unknown"), error);
      toast.error("Failed: " + error.message, { id: "create" });
    }
  };

  return { createToken };
};