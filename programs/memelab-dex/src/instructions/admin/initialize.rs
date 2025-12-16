use anchor_lang::prelude::*;
use crate::state::PlatformConfig;
use crate::errors::ErrorCode; 

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [b"platform_config"], 
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    platform_fee_wallet: Pubkey,
    platform_fee_bps: u16,
    platform_token_creation_fee: u64,
) -> Result<()> {
    let platform_config = &mut ctx.accounts.platform_config;

    require!(
        platform_fee_bps <= 1000,
        ErrorCode::FeeTooHigh
    );

    platform_config.platform_authority = ctx.accounts.authority.key();
    platform_config.platform_fee_wallet = platform_fee_wallet;
    platform_config.platform_fee_bps = platform_fee_bps;
    platform_config.platform_token_creation_fee = platform_token_creation_fee;
    platform_config.total_tokens_created = 0;
    
    platform_config.bump = ctx.bumps.platform_config;

    Ok(())
}