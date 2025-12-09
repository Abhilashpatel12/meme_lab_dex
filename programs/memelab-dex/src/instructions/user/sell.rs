use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Transfer},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::state::{TokenBondingCurve, PlatformConfig};
use crate::errors::ErrorCode;
use crate::maths::calculate_sol_out;

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

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
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Platform fee wallet - validated by constraint
    #[account(
        mut,
        address = platform_config.platform_fee_wallet
    )]
    pub fee_wallet: UncheckedAccount<'info>,

    /// CHECK: Creator wallet - validated in function
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn sell_tokens(
    ctx: Context<SellTokens>,
    token_amount: u64,
    min_sol_out: u64,
) -> Result<()> {
    let bonding_curve = ctx.accounts.bonding_curve.load()?;
    let platform_config = &ctx.accounts.platform_config;
    
    // Verify creator wallet
    require_keys_eq!(
        ctx.accounts.creator_wallet.key(),
        bonding_curve.creator,
        ErrorCode::InvalidCreatorWallet
    );

    // 1. Checks
    require_eq!(bonding_curve.trading_live, 1, ErrorCode::TradingNotLive);
    require!(token_amount > 0, ErrorCode::InvalidAmount);

    // 2. Calculate Output (Constant Product)
    let sol_out_gross = calculate_sol_out(
        token_amount,
        bonding_curve.virtual_sol_reserves,
        bonding_curve.virtual_token_reserves,
    )?;

    require!(
        sol_out_gross <= bonding_curve.real_sol_reserves,
        ErrorCode::InsufficientSolReserves
    );

    // 3. Calculate Fees
    let fee_bps = platform_config.platform_fee_bps as u64;
    let creator_bps = bonding_curve.creator_fee_bps as u64;

    let platform_fee = sol_out_gross
        .checked_mul(fee_bps)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let creator_fee = sol_out_gross
        .checked_mul(creator_bps)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let total_fees = platform_fee
        .checked_add(creator_fee)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let sol_out_net = sol_out_gross
        .checked_sub(total_fees)
        .ok_or(ErrorCode::MathUnderflow)?;

    // 4. Slippage Check
    require!(sol_out_net >= min_sol_out, ErrorCode::SlippageExceeded);

    // Store values before dropping the reference
    let bonding_curve_bump = bonding_curve.bump;
    
    // Drop the read-only reference
    drop(bonding_curve);

    // 5. Transfer Tokens (User -> Vault)
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.bonding_curve_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // 6. Transfer SOL (Vault PDA -> User & Fees)
    // FIX: Use direct lamport manipulation instead of system_instruction::transfer
    // This works for accounts with data (like PDAs)
    
    // Transfer to seller
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= sol_out_net;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out_net;

    // Transfer platform fee
    if platform_fee > 0 {
        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= platform_fee;
        **ctx.accounts.fee_wallet.to_account_info().try_borrow_mut_lamports()? += platform_fee;
    }

    // Transfer creator fee
    if creator_fee > 0 {
        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= creator_fee;
        **ctx.accounts.creator_wallet.to_account_info().try_borrow_mut_lamports()? += creator_fee;
    }

    // 7. Update State
    let mut bonding_curve = ctx.accounts.bonding_curve.load_mut()?;
    
    bonding_curve.virtual_sol_reserves = bonding_curve.virtual_sol_reserves
        .checked_sub(sol_out_gross)
        .ok_or(ErrorCode::MathUnderflow)?;
    
    bonding_curve.virtual_token_reserves = bonding_curve.virtual_token_reserves
        .checked_add(token_amount)
        .ok_or(ErrorCode::MathOverflow)?;
    
    bonding_curve.real_sol_reserves = bonding_curve.real_sol_reserves
        .checked_sub(sol_out_gross)
        .ok_or(ErrorCode::MathUnderflow)?;
    
    bonding_curve.real_token_reserves = bonding_curve.real_token_reserves
        .checked_add(token_amount)
        .ok_or(ErrorCode::MathOverflow)?;

    msg!("Sold {} tokens for {} SOL net (gross: {}, fees: {})", 
        token_amount, sol_out_net, sol_out_gross, total_fees);

    Ok(())
}
