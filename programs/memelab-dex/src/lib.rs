use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod maths;


use instructions::*; 

declare_id!("EdARKxJ9vBQfiapXTqfBQvtLzmwxaPSCNsS5AU5R8DCm");

#[program]
pub mod memelab_dex {
    use super::*;

    // ADMIN
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>, 
        platform_fee_wallet: Pubkey,
        platform_fee_bps: u16,
        platform_token_creation_fee: u64,
    ) -> Result<()> {
        instructions::admin::initialize::initialize_platform(
            ctx,
            platform_fee_wallet,
            platform_fee_bps,
            platform_token_creation_fee,
        )
    }

    //  CREATOR
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
        alpha_duration_seconds: i64,
    ) -> Result<()> {
        instructions::creator::create_token::create_token(
            ctx,
            name,
            symbol,
            uri,
            alpha_duration_seconds,
        )
    }

    //  USER (Alpha Vault) 
    pub fn deposit_alpha(
        ctx: Context<DepositAlpha>, 
        sol_amount: u64
    ) -> Result<()> {
        instructions::user::deposit::deposit_alpha(ctx, sol_amount)
    }

    pub fn claim_alpha(
        ctx: Context<ClaimAlpha>
    ) -> Result<()> {
        instructions::user::claim::claim_alpha(ctx)
    }

    // USER (Trading)
    pub fn buy_tokens(
        ctx: Context<BuyTokens>, 
        sol_amount: u64
    ) -> Result<()> {
        instructions::user::buy::buy_tokens(ctx, sol_amount)
    }

    pub fn sell_tokens(
        ctx: Context<SellTokens>, 
        token_amount: u64, 
        min_sol_out: u64
    ) -> Result<()> {
        instructions::user::sell::sell_tokens(ctx, token_amount, min_sol_out)
    }
}