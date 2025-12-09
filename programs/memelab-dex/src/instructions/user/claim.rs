use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Transfer},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::{TokenBondingCurve, UserAlphaDeposit};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ClaimAlpha<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: AccountLoader<'info, TokenBondingCurve>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,
  
    #[account(
        mut,
        seeds = [
            b"alpha_deposit",
            claimer.key().as_ref(),
            mint.key().as_ref()
        ],
        bump = user_deposit.bump,
        constraint = user_deposit.user == claimer.key() @ ErrorCode::InvalidClaimer,
        constraint = user_deposit.mint == mint.key() @ ErrorCode::InvalidMint,
        constraint = !user_deposit.claimed @ ErrorCode::AlreadyClaimed,
    )]
    pub user_deposit: Box<Account<'info, UserAlphaDeposit>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub bonding_curve_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = claimer,
        associated_token::mint = mint,
        associated_token::authority = claimer,
    )]
    pub claimer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn claim_alpha(ctx: Context<ClaimAlpha>) -> Result<()> {
    let bonding_curve = ctx.accounts.bonding_curve.load()?;
    let user_deposit = &mut ctx.accounts.user_deposit;

    // VALIDATION CHECKS
    
    // Check trading is live (alpha phase must be finalized)
    require_eq!(bonding_curve.trading_live, 1, ErrorCode::TradingNotLive);
    
    // Check not already claimed (redundant with constraint but good practice)
    require!(!user_deposit.claimed, ErrorCode::AlreadyClaimed);
    
    // Check user has deposited SOL
    require!(user_deposit.sol_amount > 0, ErrorCode::NoDepositFound);
    
    // Check alpha vault was actually used
    require!(bonding_curve.total_alpha_sol > 0, ErrorCode::ZeroAlphaDeposits);
    require!(bonding_curve.total_alpha_token > 0, ErrorCode::NoTokensOwed);

    // CALCULATE USER'S SHARE
    // Formula: (user_deposit / total_deposits) * total_allocated_tokens
    // tokens_to_claim = (user_sol_amount * total_alpha_token) / total_alpha_sol
    
    let numerator = (user_deposit.sol_amount as u128)
        .checked_mul(bonding_curve.total_alpha_token as u128)
        .ok_or(ErrorCode::MathOverflow)?;
        
    let tokens_to_claim = numerator
        .checked_div(bonding_curve.total_alpha_sol as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    let amount_u64 = tokens_to_claim as u64;

    // Ensure they're getting some tokens
    require!(amount_u64 > 0, ErrorCode::NoTokensOwed);
    
    // Ensure bonding curve has enough tokens
    require!(
        amount_u64 <= bonding_curve.real_token_reserves,
        ErrorCode::InsufficientTokenReserves
    );

    // Log the claim details before transfer
    msg!("Alpha Claim Details:");
    msg!("  User deposited: {} lamports", user_deposit.sol_amount);
    msg!("  Total alpha deposits: {} lamports", bonding_curve.total_alpha_sol);
    msg!("  Total alpha tokens: {}", bonding_curve.total_alpha_token);
    msg!("  User's share: {} tokens", amount_u64);

    // Store values before dropping reference
    let bonding_curve_bump = bonding_curve.bump;
    
    // Drop before CPI
    drop(bonding_curve);

    // TRANSFER TOKENS
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[
        b"bonding_curve", 
        mint_key.as_ref(), 
        &[bonding_curve_bump]
    ];
    let signer_seeds = &[&seeds[..]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bonding_curve_token_account.to_account_info(),
                to: ctx.accounts.claimer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds
        ),
        amount_u64,
    )?;

    // UPDATE STATE
    user_deposit.claimed = true;
    user_deposit.tokens_owed = amount_u64;

    msg!(" User {} claimed {} tokens from alpha vault", 
        ctx.accounts.claimer.key(), amount_u64);
    
    Ok(())
}
