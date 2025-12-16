use anchor_lang::prelude::*;
use anchor_lang::solana_program::{system_instruction, program::invoke};
use anchor_spl::token_interface::Mint; 

use crate::state::{TokenBondingCurve, UserAlphaDeposit};
use crate::errors::ErrorCode;


#[derive(Accounts)]
pub struct DepositAlpha<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: AccountLoader<'info, TokenBondingCurve>,
    #[account(mut)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserAlphaDeposit::INIT_SPACE,
        seeds = [
            b"alpha_deposit", 
            user.key().as_ref(), 
            mint.key().as_ref()
        ],
        bump,
    )]
    pub user_deposit: Account<'info, UserAlphaDeposit>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_alpha(
    ctx: Context<DepositAlpha>,
    sol_amount: u64,

) -> Result<()> {
    let mut bonding_curve = ctx.accounts.bonding_curve.load_mut()?;
    let user_deposit = &mut ctx.accounts.user_deposit;
    let user = &ctx.accounts.user;


    let current_time = Clock::get()?.unix_timestamp;

    require!(
        current_time < bonding_curve.alpha_phase_end_time, 
        ErrorCode::AlphaPhaseEnded
    );
    require!(bonding_curve.trading_live == 0, ErrorCode::TradingAlreadyLive);
    
    
    require!(sol_amount > 0, ErrorCode::InsufficientFunds);

    let bonding_curve_key = ctx.accounts.bonding_curve.key();
    
    // Drop mutable borrow before CPI
    drop(bonding_curve);
    
    let transfer_ix = system_instruction::transfer(
        &user.key(),
        &bonding_curve_key,
        sol_amount,
    );

    invoke(
        &transfer_ix,
        &[
            user.to_account_info(),
            ctx.accounts.bonding_curve.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],

    )?;
    
    // Reload after CPI
    let mut bonding_curve = ctx.accounts.bonding_curve.load_mut()?;

    user_deposit.user = user.key();
    user_deposit.mint = bonding_curve.token_mint;

    user_deposit.sol_amount = user_deposit.sol_amount
        .checked_add(sol_amount)
        .ok_or(ErrorCode::MathOverflow)?;

        user_deposit.claimed = false;
        user_deposit.bump = ctx.bumps.user_deposit;

        bonding_curve.total_alpha_sol = bonding_curve.total_alpha_sol
        .checked_add(sol_amount)
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())

}
