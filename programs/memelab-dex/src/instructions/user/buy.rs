use anchor_lang::prelude::*;
use anchor_lang::solana_program::{system_instruction, program::invoke};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Transfer},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::{TokenBondingCurve, PlatformConfig};
use crate::errors::ErrorCode;
use crate::maths::calculate_tokens_out;

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: AccountLoader<'info, TokenBondingCurve>,
    
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Box<Account<'info, PlatformConfig>>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub bonding_curve_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Platform fee wallet - validated by address constraint
    #[account(
        mut,
        address = platform_config.platform_fee_wallet
    )]
    pub platform_fee_wallet: UncheckedAccount<'info>,

    /// CHECK: Creator wallet - validated in function
    #[account(mut)]
    pub creator_fee_wallet: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn buy_tokens(ctx: Context<BuyTokens>, lamports_sent: u64) -> Result<()> {
    let mut bonding_curve = ctx.accounts.bonding_curve.load_mut()?;
    let platform_config = &ctx.accounts.platform_config;
    
    // Verify creator wallet
    require_keys_eq!(
        ctx.accounts.creator_fee_wallet.key(),
        bonding_curve.creator,
        ErrorCode::InvalidCreatorWallet
    );

    // Validate amount
    require!(lamports_sent > 0, ErrorCode::InvalidAmount);

    let current_time = Clock::get()?.unix_timestamp;

    // --- FINALIZE ALPHA PHASE IF NEEDED ---
    if bonding_curve.trading_live == 0 {
        require!(
            current_time >= bonding_curve.alpha_phase_end_time,
            ErrorCode::AlphaPhaseNotEnded
        );
        
        // Finalize alpha phase
        let total_raised = bonding_curve.total_alpha_sol;

        if total_raised > 0 {
            // Calculate tokens for alpha depositors
            let tokens_for_alpha = calculate_tokens_out(
                total_raised,
                bonding_curve.virtual_sol_reserves,
                bonding_curve.virtual_token_reserves,
            )?;
            
            // CRITICAL FIX: Store this for claim_alpha to work
            bonding_curve.total_alpha_token = tokens_for_alpha;
            
            // Update reserves to reflect alpha allocation
            bonding_curve.virtual_sol_reserves = bonding_curve.virtual_sol_reserves
                .checked_add(total_raised)
                .ok_or(ErrorCode::MathOverflow)?;
            
            bonding_curve.virtual_token_reserves = bonding_curve.virtual_token_reserves
                .checked_sub(tokens_for_alpha)
                .ok_or(ErrorCode::MathUnderflow)?;
            
            bonding_curve.real_sol_reserves = bonding_curve.real_sol_reserves
                .checked_add(total_raised)
                .ok_or(ErrorCode::MathOverflow)?;
            
            bonding_curve.real_token_reserves = bonding_curve.real_token_reserves
                .checked_sub(tokens_for_alpha)
                .ok_or(ErrorCode::MathUnderflow)?;
            
            msg!(" Alpha Vault Finalized: {} SOL raised, {} tokens allocated", 
                total_raised, tokens_for_alpha);
        }

        bonding_curve.trading_live = 1;
        msg!(" Trading is now LIVE!");
    }

    // Trading must be live at this point
    require_eq!(bonding_curve.trading_live, 1, ErrorCode::TradingNotLive);

    // --- CALCULATE FEES ---
    let fee_bps = platform_config.platform_fee_bps as u64;
    let creator_bps = bonding_curve.creator_fee_bps as u64;

    let platform_fee = lamports_sent
        .checked_mul(fee_bps)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let creator_fee = lamports_sent
        .checked_mul(creator_bps)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;

    let total_fees = platform_fee
        .checked_add(creator_fee)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let sol_for_tokens = lamports_sent
        .checked_sub(total_fees)
        .ok_or(ErrorCode::MathUnderflow)?;

    // --- CALCULATE TOKENS OUT ---
    let tokens_out = calculate_tokens_out(
        sol_for_tokens,
        bonding_curve.virtual_sol_reserves,
        bonding_curve.virtual_token_reserves,
    )?;

    require!(tokens_out > 0, ErrorCode::InvalidPriceCalculation);
    require!(
        tokens_out <= bonding_curve.real_token_reserves,
        ErrorCode::InsufficientTokenReserves
    );

    // Store bump before dropping
    let bonding_curve_bump = bonding_curve.bump;
    
    // Drop mutable reference before transfers
    drop(bonding_curve);

    // --- TRANSFER SOL (Buyer -> Bonding Curve & Fees) ---
    // FIX: Use system_instruction::transfer when sending FROM buyer (signer without data)
    
    let bonding_curve_key = ctx.accounts.bonding_curve.key();
    
    // Transfer SOL to bonding curve
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &bonding_curve_key,
            sol_for_tokens
        ),
        &[
            ctx.accounts.buyer.to_account_info(),
            ctx.accounts.bonding_curve.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Transfer platform fee
    if platform_fee > 0 {
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.platform_fee_wallet.key(),
                platform_fee
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.platform_fee_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    // Transfer creator fee
    if creator_fee > 0 {
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.creator_fee_wallet.key(),
                creator_fee
            ),
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.creator_fee_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    // --- TRANSFER TOKENS (Bonding Curve -> Buyer) ---
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
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_out,
    )?;
    
    
    let mut bonding_curve = ctx.accounts.bonding_curve.load_mut()?;
    
    bonding_curve.virtual_sol_reserves = bonding_curve.virtual_sol_reserves
        .checked_add(sol_for_tokens)
        .ok_or(ErrorCode::MathOverflow)?;
    
    bonding_curve.virtual_token_reserves = bonding_curve.virtual_token_reserves
        .checked_sub(tokens_out)
        .ok_or(ErrorCode::MathUnderflow)?;
    
    bonding_curve.real_sol_reserves = bonding_curve.real_sol_reserves
        .checked_add(sol_for_tokens)
        .ok_or(ErrorCode::MathOverflow)?;
    
    bonding_curve.real_token_reserves = bonding_curve.real_token_reserves
        .checked_sub(tokens_out)
        .ok_or(ErrorCode::MathUnderflow)?;

    msg!(" Bought {} tokens for {} SOL (fees: {} SOL)", 
        tokens_out, sol_for_tokens, total_fees);

    Ok(())
}
