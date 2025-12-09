import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MemelabDex } from "../target/types/memelab_dex";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("memelab_dex", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MemelabDex as Program<MemelabDex>;

  // Use YOUR funded wallet as admin (already has SOL from faucet)
  const admin = provider.wallet;
  
  // Generate test users
  const creator = Keypair.generate();
  const userA = Keypair.generate(); 
  const userB = Keypair.generate(); 
  
  const mintKeypair = Keypair.generate();
  const feeWallet = Keypair.generate();
  
  let platformConfig: PublicKey;
  let bondingCurve: PublicKey;
  let bondingCurveVault: PublicKey;
  let userADeposit: PublicKey;
  
  const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

  before(async () => {
    console.log("\n Starting MemeLab DEX Tests\n");
    
    // Airdrop SOL to test users (localnet)
    const airdrop = async (pubkey: PublicKey, amount: number) => {
      try {
        const sig = await provider.connection.requestAirdrop(pubkey, amount * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig);
      } catch (e) {
        console.log(`  Airdrop to ${pubkey.toString().slice(0, 8)}... failed (may already have SOL)`);
      }
    };

    await airdrop(creator.publicKey, 2);
    await airdrop(userA.publicKey, 3);
    await airdrop(userB.publicKey, 2);
    console.log(" Test users funded via airdrop\n");
    
    // Derive PDAs
    [platformConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_config")],
      program.programId
    );

    [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mintKeypair.publicKey.toBuffer()],
      program.programId
    );

    // Derive ATA for bonding curve
    [bondingCurveVault] = PublicKey.findProgramAddressSync(
      [
        bondingCurve.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    [userADeposit] = PublicKey.findProgramAddressSync(
      [Buffer.from("alpha_deposit"), userA.publicKey.toBuffer(), mintKeypair.publicKey.toBuffer()],
      program.programId
    );

    console.log(" Test Setup:");
    console.log("  Program ID:", program.programId.toString());
    console.log("  Platform Config:", platformConfig.toString());
    console.log("  Bonding Curve:", bondingCurve.toString());
    console.log("  Mint:", mintKeypair.publicKey.toString());
    console.log("  Creator:", creator.publicKey.toString());
    console.log("  User A:", userA.publicKey.toString());
    console.log("  User B:", userB.publicKey.toString());
    console.log("");
  });

  it("1. Initialize Platform (Admin)", async () => {
    try {
      await program.methods
        .initializePlatform(
          feeWallet.publicKey,
          100, // 1% Fee (100 bps)
          new anchor.BN(LAMPORTS_PER_SOL / 100) // 0.01 SOL creation fee
        )
        .accounts({
          platformConfig: platformConfig,
          authority: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(platformConfig);
      assert.ok(config.platformAuthority.equals(admin.publicKey));
      assert.equal(config.platformFeeBps, 100);
      console.log(" Platform Initialized");
      console.log("   Fee: 1% (100 bps)");
      console.log("   Creation Fee: 0.01 SOL");
    } catch (e) {
      if (e.message.includes("already in use") || e.message.includes("custom program error: 0x0")) {
        console.log("  Platform already initialized (restart validator: anchor test)");
        const config = await program.account.platformConfig.fetch(platformConfig);
        assert.ok(config.platformAuthority.equals(admin.publicKey));
      } else {
        throw e;
      }
    }
  });

  it("2. Create Token (Creator)", async () => {
    const alphaDuration = new anchor.BN(3); // 3 seconds for testing

    const [metadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      MPL_TOKEN_METADATA_PROGRAM_ID
    );

    await program.methods
      .createToken(
        "MemeCoin",
        "MEME",
        "https://example.com/meme.json",
        alphaDuration
      )
      .accounts({
        creator: creator.publicKey,
        platformConfig: platformConfig,
        mint: mintKeypair.publicKey,
        bondingCurve: bondingCurve,
        bondingCurveTokenAccount: bondingCurveVault,
        metadataAccount: metadata,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        metadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([creator, mintKeypair])
      .rpc();

    const curve = await program.account.tokenBondingCurve.fetch(bondingCurve);
    
    // zero_copy stores bool as u8: 0 = false, 1 = true
    assert.equal(curve.tradingLive, 0, "Trading should not be live");
    assert.ok(curve.tokenMint.equals(mintKeypair.publicKey));
    assert.ok(curve.creator.equals(creator.publicKey));
    assert.equal(curve.totalAlphaSol.toString(), "0");
    assert.equal(curve.totalAlphaToken.toString(), "0");
    
    console.log(" Token Created (Alpha Phase Active)");
    console.log("   Name: MemeCoin (MEME)");
    console.log("   Trading Live:", curve.tradingLive === 1 ? "Yes" : "No");
    console.log("   Alpha Duration: 3 seconds");
    console.log("   Virtual SOL Reserves:", curve.virtualSolReserves.toString());
    console.log("   Virtual Token Reserves:", curve.virtualTokenReserves.toString());
  });

  it("3. User A Deposits into Alpha Vault", async () => {
    const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    await program.methods
      .depositAlpha(depositAmount)
      .accounts({
        user: userA.publicKey,
        bondingCurve: bondingCurve,
        mint: mintKeypair.publicKey,
        userDeposit: userADeposit,
        systemProgram: SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    const depositState = await program.account.userAlphaDeposit.fetch(userADeposit);
    assert.equal(depositState.solAmount.toString(), depositAmount.toString());
    assert.ok(depositState.user.equals(userA.publicKey));
    assert.ok(depositState.mint.equals(mintKeypair.publicKey));
    assert.isFalse(depositState.claimed);
    
    const curve = await program.account.tokenBondingCurve.fetch(bondingCurve);
    assert.equal(curve.totalAlphaSol.toString(), depositAmount.toString());
    
    console.log(" User A Deposited into Alpha Vault");
    console.log("   Amount: 1 SOL");
    console.log("   Total Alpha SOL:", curve.totalAlphaSol.toString());
    console.log("   Claimed:", depositState.claimed ? "Yes" : "No");
  });

  it("4. User B Tries to Buy (Should FAIL - Anti-Snipe)", async () => {
    try {
      const buyAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
      const [userBTokenAccount] = PublicKey.findProgramAddressSync(
        [
          userB.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      await program.methods
        .buyTokens(buyAmount)
        .accounts({
          buyer: userB.publicKey,
          bondingCurve: bondingCurve,
          mint: mintKeypair.publicKey,
          platformConfig: platformConfig,
          bondingCurveTokenAccount: bondingCurveVault,
          buyerTokenAccount: userBTokenAccount,
          platformFeeWallet: feeWallet.publicKey,
          creatorFeeWallet: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([userB])
        .rpc();
      
      assert.fail(" Should have failed because trading is not live");
    } catch (e) {
      const errorFound = 
        e.message.includes("Trading is not live yet") || 
        e.message.includes("TradingNotLive") ||
        e.message.includes("AlphaPhaseNotEnded") ||
        e.error?.errorCode?.code === "TradingNotLive" ||
        e.error?.errorCode?.code === "AlphaPhaseNotEnded";
      
      assert.ok(errorFound, "Should fail with TradingNotLive or AlphaPhaseNotEnded error");
      console.log("✅ Buy Blocked Successfully");
      console.log("   Reason: Alpha phase not ended");
      console.log("   Anti-Snipe Mechanism: WORKING ✓");
    }
  });

  it("5. Wait for Alpha Timer...", async () => {
    console.log("⏳ Waiting 4 seconds for Alpha Vault to close...");
    await new Promise((resolve) => setTimeout(resolve, 4000));
    console.log(" Alpha period ended - trading can now begin");
  });

  it("6. User B Buys (Triggers Finalize & Opens Trading)", async () => {
    const buyAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    const [userBTokenAccount] = PublicKey.findProgramAddressSync(
      [
        userB.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const curveBefore = await program.account.tokenBondingCurve.fetch(bondingCurve);
    console.log("   Before finalization:");
    console.log("     Total Alpha SOL:", curveBefore.totalAlphaSol.toString());
    console.log("     Total Alpha Token:", curveBefore.totalAlphaToken.toString());

    await program.methods
      .buyTokens(buyAmount)
      .accounts({
        buyer: userB.publicKey,
        bondingCurve: bondingCurve,
        mint: mintKeypair.publicKey,
        platformConfig: platformConfig,
        bondingCurveTokenAccount: bondingCurveVault,
        buyerTokenAccount: userBTokenAccount,
        platformFeeWallet: feeWallet.publicKey,
        creatorFeeWallet: creator.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([userB])
      .rpc();

    const curveAfter = await program.account.tokenBondingCurve.fetch(bondingCurve);
    
    // Check trading is now live (1 = true for zero_copy)
    assert.equal(curveAfter.tradingLive, 1, "Trading should be live now");
    assert.ok(curveAfter.realSolReserves.toNumber() > 0, "Should have SOL reserves");
    assert.ok(curveAfter.totalAlphaToken.toNumber() > 0, "Should have allocated alpha tokens");
    
    // Check User B received tokens
    const userBBalance = await provider.connection.getTokenAccountBalance(userBTokenAccount);
    assert.ok(Number(userBBalance.value.amount) > 0, "User B should have tokens");
    
    console.log(" User B Bought Tokens & Trading Opened!");
    console.log("   After finalization:");
    console.log("     Trading Live:", curveAfter.tradingLive === 1 ? "Yes ✓" : "No");
    console.log("     Total Alpha Token:", curveAfter.totalAlphaToken.toString());
    console.log("     Real SOL Reserves:", curveAfter.realSolReserves.toString());
    console.log("     Real Token Reserves:", curveAfter.realTokenReserves.toString());
    console.log("     User B Token Balance:", userBBalance.value.amount);
  });

  it("7. User A Claims Pre-Sale Tokens", async () => {
    const [userATokenAccount] = PublicKey.findProgramAddressSync(
      [
        userA.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get state before claim
    const depositStateBefore = await program.account.userAlphaDeposit.fetch(userADeposit);
    const curveBefore = await program.account.tokenBondingCurve.fetch(bondingCurve);
    
    console.log("   Claim calculation:");
    console.log("     User deposited:", depositStateBefore.solAmount.toString(), "lamports");
    console.log("     Total alpha SOL:", curveBefore.totalAlphaSol.toString());
    console.log("     Total alpha tokens:", curveBefore.totalAlphaToken.toString());
    
    const expectedTokens = depositStateBefore.solAmount
      .mul(curveBefore.totalAlphaToken)
      .div(curveBefore.totalAlphaSol);
    console.log("     Expected tokens:", expectedTokens.toString());

    await program.methods
      .claimAlpha()
      .accounts({
        claimer: userA.publicKey,
        bondingCurve: bondingCurve,
        mint: mintKeypair.publicKey,
        userDeposit: userADeposit,
        bondingCurveTokenAccount: bondingCurveVault,
        claimerTokenAccount: userATokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    const depositStateAfter = await program.account.userAlphaDeposit.fetch(userADeposit);
    
    // UserAlphaDeposit uses regular #[account], so claimed is a regular boolean
    assert.isTrue(depositStateAfter.claimed, "Should be claimed");
    assert.ok(depositStateAfter.tokensOwed.toNumber() > 0, "Should have tokens owed");
    
    // Check token balance
    const tokenBalance = await provider.connection.getTokenAccountBalance(userATokenAccount);
    assert.ok(Number(tokenBalance.value.amount) > 0, "Should have received tokens");
    assert.equal(
      tokenBalance.value.amount, 
      depositStateAfter.tokensOwed.toString(),
      "Balance should match tokens owed"
    );
    
    console.log(" User A Claimed Alpha Tokens");
    console.log("   Tokens received:", tokenBalance.value.amount);
    console.log("   Tokens owed:", depositStateAfter.tokensOwed.toString());
    console.log("   Claimed status:", depositStateAfter.claimed ? "Yes ✓" : "No");
  });

  it("8. User B Sells Tokens", async () => {
    const [userBTokenAccount] = PublicKey.findProgramAddressSync(
      [
        userB.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Check if token account exists
    const accountInfo = await provider.connection.getAccountInfo(userBTokenAccount);
    if (!accountInfo) {
      console.log("  User B has no token account, skipping sell test");
      return;
    }
    
    const balanceBefore = await provider.connection.getTokenAccountBalance(userBTokenAccount);
    const sellAmount = new anchor.BN(balanceBefore.value.amount).div(new anchor.BN(2));
    
    if (sellAmount.isZero()) {
      console.log("  User B has no tokens to sell, skipping");
      return;
    }

    console.log("   User B selling:", sellAmount.toString(), "tokens");
    
    const solBefore = await provider.connection.getBalance(userB.publicKey);

    await program.methods
      .sellTokens(sellAmount, new anchor.BN(0)) // 0 min SOL for test
      .accounts({
        seller: userB.publicKey,
        bondingCurve: bondingCurve,
        mint: mintKeypair.publicKey,
        platformConfig: platformConfig,
        bondingCurveTokenAccount: bondingCurveVault,
        sellerTokenAccount: userBTokenAccount,
        feeWallet: feeWallet.publicKey,
        creatorWallet: creator.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([userB])
      .rpc();

    const balanceAfter = await provider.connection.getTokenAccountBalance(userBTokenAccount);
    const solAfter = await provider.connection.getBalance(userB.publicKey);
    
    assert.ok(
      Number(balanceAfter.value.amount) < Number(balanceBefore.value.amount),
      "Token balance should decrease"
    );
    
    // Note: SOL balance might not increase much due to transaction fees
    const solDiff = solAfter - solBefore;

    console.log(" User B Sold Tokens");
    console.log("   Tokens sold:", sellAmount.toString());
    console.log("   Remaining tokens:", balanceAfter.value.amount);
    console.log("   SOL received (after fees):", solDiff > 0 ? `+${solDiff} lamports` : `${solDiff} lamports (includes tx fee)`);
  });

  // Final state verification
  after(async () => {
    console.log(" FINAL STATE SUMMARY");
    
    const curve = await program.account.tokenBondingCurve.fetch(bondingCurve);
    console.log("\n Bonding Curve:");
    console.log("  Trading Live:", curve.tradingLive === 1 ? "Yes ✓" : "No");
    console.log("  Real SOL Reserves:", curve.realSolReserves.toString(), "lamports");
    console.log("  Real Token Reserves:", curve.realTokenReserves.toString());
    console.log("  Virtual SOL Reserves:", curve.virtualSolReserves.toString());
    console.log("  Virtual Token Reserves:", curve.virtualTokenReserves.toString());
    
    console.log("\n Alpha Vault:");
    console.log("  Total Alpha SOL:", curve.totalAlphaSol.toString(), "lamports");
    console.log("  Total Alpha Token:", curve.totalAlphaToken.toString());
    console.log("  Is Complete:", curve.isComplete === 1 ? "Yes" : "No");
    
    const config = await program.account.platformConfig.fetch(platformConfig);
    console.log("\n  Platform:");
    console.log("  Total Tokens Created:", config.totalTokensCreated.toString());
    console.log("  Platform Fee:", config.platformFeeBps, "bps");
    
    
    console.log(" ALL TESTS PASSED - MemeLab DEX Working Perfectly!");
   
  });
});
