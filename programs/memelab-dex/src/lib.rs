use anchor_lang::prelude::*;

declare_id!("AjcD32dBsrfEcygftDRTnMw2m8r6CBYPKmGioPdPVC8u");

#[program]
pub mod memelab_dex {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
