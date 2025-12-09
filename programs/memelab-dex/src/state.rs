use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub platform_authority: Pubkey,          // 32
    pub platform_fee_wallet: Pubkey,         // 32
    pub platform_fee_bps: u16,               // 2
    pub platform_token_creation_fee: u64,    // 8
    pub total_tokens_created: u64,           // 8
    pub bump: u8,                            // 1
}

// Use zero_copy to avoid stack overflow
#[account(zero_copy)]
#[repr(C)]
pub struct TokenBondingCurve {
    pub token_mint: Pubkey,                  // 32
    pub creator: Pubkey,                     // 32
    
    pub virtual_sol_reserves: u64,           // 8
    pub virtual_token_reserves: u64,         // 8
    
    pub real_sol_reserves: u64,              // 8
    pub real_token_reserves: u64,            // 8
    
    pub alpha_phase_end_time: i64,           // 8
    pub total_alpha_sol: u64,                // 8
    pub total_alpha_token: u64,              // 8
    pub real_token_supply: u64,              // 8
    
    pub created_at: i64,                     // 8
    
    pub creator_fee_bps: u16,                // 2
    pub trading_live: u8,                    // 1 (0 = false, 1 = true)
    pub is_complete: u8,                     // 1 (0 = false, 1 = true)
    pub bump: u8,                            // 1
    pub _padding: [u8; 3],                   // 3 (padding to align to 8 bytes)
}

#[account]
#[derive(InitSpace)]
pub struct UserAlphaDeposit {
    pub user: Pubkey,           // 32
    pub mint: Pubkey,           // 32
    pub sol_amount: u64,        // 8
    pub tokens_owed: u64,       // 8
    pub claimed: bool,          // 1
    pub bump: u8,               // 1
}
