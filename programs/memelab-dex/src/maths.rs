use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

pub fn calculate_tokens_out(
    sol_amount_in: u64,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Result<u64> {
    // 1. Calculate k (invariant)
    // k = x * y
    let virtual_sol_u128 = virtual_sol_reserves as u128;
    let virtual_token_u128 = virtual_token_reserves as u128;
    
    let k = virtual_sol_u128
        .checked_mul(virtual_token_u128)
        .ok_or(ErrorCode::MathOverflow)?;

    // 2. Calculate new virtual SOL
    // new_sol = old_sol + input
    let new_virtual_sol = virtual_sol_u128
        .checked_add(sol_amount_in as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    // 3. Calculate new virtual tokens
    // new_tokens = k / new_sol
    let new_virtual_tokens = k
        .checked_div(new_virtual_sol)
        .ok_or(ErrorCode::MathOverflow)?;

    // 4. Tokens output = old_tokens - new_tokens
    let tokens_out = virtual_token_u128
        .checked_sub(new_virtual_tokens)
        .ok_or(ErrorCode::MathUnderflow)?;

    Ok(tokens_out as u64)
}

pub fn calculate_sol_out(
    token_amount_in: u64,
    virtual_sol_reserves: u64,
    virtual_token_reserves: u64,
) -> Result<u64> {
    // 1. Calculate k
    let virtual_sol_u128 = virtual_sol_reserves as u128;
    let virtual_token_u128 = virtual_token_reserves as u128;
    
    let k = virtual_sol_u128
        .checked_mul(virtual_token_u128)
        .ok_or(ErrorCode::MathOverflow)?;

    // 2. Calculate new virtual tokens
    let new_virtual_tokens = virtual_token_u128
        .checked_add(token_amount_in as u128)
        .ok_or(ErrorCode::MathOverflow)?;

    // 3. Calculate new virtual SOL
    let new_virtual_sol = k
        .checked_div(new_virtual_tokens)
        .ok_or(ErrorCode::MathOverflow)?;

    // 4. SOL output = old_sol - new_sol
    let sol_out = virtual_sol_u128
        .checked_sub(new_virtual_sol)
        .ok_or(ErrorCode::MathUnderflow)?;

    Ok(sol_out as u64)
}