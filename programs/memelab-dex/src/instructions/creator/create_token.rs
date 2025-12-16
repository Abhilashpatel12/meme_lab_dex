use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, MintTo},
    token_interface::{Mint, TokenAccount, TokenInterface},
    metadata::{
        create_metadata_accounts_v3, 
        CreateMetadataAccountsV3, 
        Metadata,
        mpl_token_metadata::types::DataV2, 
    },
};

use crate::state::{PlatformConfig, TokenBondingCurve};
use crate::errors::ErrorCode;

// Constants
const INITIAL_VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000; // 30 SOL
const INITIAL_VIRTUAL_TOKEN_RESERVES: u64 = 1_000_000_000_000_000; // 1B tokens (with 6 decimals)
const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1B tokens

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Box<Account<'info, PlatformConfig>>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    // Changed to AccountLoader for zero_copy
    #[account(
        init,
        payer = creator,
        space = 8 + std::mem::size_of::<TokenBondingCurve>(),
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: AccountLoader<'info, TokenBondingCurve>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub bonding_curve_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Validated by Metaplex CPI
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token(
    ctx: Context<CreateToken>,
    name: String,
    symbol: String,
    uri: String,
    alpha_duration_seconds: i64,
) -> Result<()> {
    // VALIDATION
    require!(name.len() <= 32, ErrorCode::NameTooLong);
    require!(symbol.len() <= 10, ErrorCode::SymbolTooLong);
    require!(uri.len() <= 200, ErrorCode::UriTooLong);
    require!(alpha_duration_seconds > 0, ErrorCode::InvalidAmount);

    // INITIALIZE BONDING CURVE
    let mut bonding_curve = ctx.accounts.bonding_curve.load_init()?;
    let current_time = Clock::get()?.unix_timestamp;
    
    // Store bump for later use
    let bonding_curve_bump = ctx.bumps.bonding_curve;
    
    // Initialize State
    bonding_curve.token_mint = ctx.accounts.mint.key();
    bonding_curve.creator = ctx.accounts.creator.key();
    bonding_curve.creator_fee_bps = 100; // 1% creator fee
    
    // Virtual reserves (for bonding curve math)
    bonding_curve.virtual_sol_reserves = INITIAL_VIRTUAL_SOL_RESERVES; 
    bonding_curve.virtual_token_reserves = INITIAL_VIRTUAL_TOKEN_RESERVES; 
    
    // Real reserves (actual amounts)
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.real_token_reserves = TOTAL_SUPPLY;
    
    // Trading state
    bonding_curve.trading_live = 0;  // false (u8 for zero_copy)
    
    // Alpha vault settings
    bonding_curve.alpha_phase_end_time = current_time
        .checked_add(alpha_duration_seconds)
        .ok_or(ErrorCode::Overflow)?;
    bonding_curve.total_alpha_sol = 0;
    bonding_curve.total_alpha_token = 0;
    
    // Supply tracking
    bonding_curve.real_token_supply = TOTAL_SUPPLY;
    
    // Completion state
    bonding_curve.is_complete = 0;  // false (u8 for zero_copy)
    bonding_curve.created_at = current_time;
    
    // PDA bump
    bonding_curve.bump = bonding_curve_bump;
    
    // Padding for alignment
    bonding_curve._padding = [0; 3];

    // Drop the mutable borrow before CPIs
    drop(bonding_curve);

    // MINT TOTAL SUPPLY TO BONDING CURVE
    let mint_key = ctx.accounts.mint.key();
    let mint_seeds: &[&[u8]] = &[
        b"bonding_curve", 
        mint_key.as_ref(), 
        &[bonding_curve_bump]
    ];
    let signer_seeds = &[mint_seeds];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.bonding_curve_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds
        ),
        TOTAL_SUPPLY,
    )?;

    // CREATE METAPLEX METADATA
    let metadata_data = DataV2 {
        name: name.clone(),
        symbol: symbol.clone(),
        uri: uri.clone(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    create_metadata_accounts_v3(
        CpiContext::new_with_signer(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.bonding_curve.to_account_info(),
                payer: ctx.accounts.creator.to_account_info(),
                update_authority: ctx.accounts.bonding_curve.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds
        ),
        metadata_data,
        true,  // is_mutable
        true,  // update_authority_is_signer
        None   // collection_details
    )?;

    //  INCREMENT PLATFORM COUNTER
    let platform_config = &mut ctx.accounts.platform_config;
    platform_config.total_tokens_created = platform_config.total_tokens_created
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;

    //  LOGGING
    msg!(" Token created successfully!");
    msg!("  Name: {}", name);
    msg!("  Symbol: {}", symbol);
    msg!("  Mint: {}", ctx.accounts.mint.key());
    msg!("  Bonding Curve: {}", ctx.accounts.bonding_curve.key());
    msg!("  Total Supply: {}", TOTAL_SUPPLY);
    msg!("  Alpha Duration: {} seconds", alpha_duration_seconds);
    msg!("  Alpha Ends At: {}", current_time + alpha_duration_seconds);
    msg!("  Platform Total Tokens: {}", platform_config.total_tokens_created);

    Ok(())
}
