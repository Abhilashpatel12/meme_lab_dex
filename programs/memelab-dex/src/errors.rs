use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // Admin & Config Errors
    #[msg("Fee cannot be more than 10% (1000 basis points)")]
    FeeTooHigh,
    
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Invalid platform config provided")]
    InvalidPlatformConfig,

    #[msg("Invalid bonding curve account")]
    InvalidBondingCurve,

    // Metadata Errors (Creator)
    #[msg("Name too long (max 32 characters)")]
    NameTooLong,
    
    #[msg("Symbol too long (max 10 characters)")]
    SymbolTooLong,
    
    #[msg("URI too long (max 200 characters)")]
    UriTooLong,
    
    #[msg("Arithmetic overflow")]
    Overflow,

    // Trading Errors (User)
    #[msg("Trading is not live yet")]
    TradingNotLive,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    
    #[msg("Insufficient funds to perform this trade")]
    InsufficientFunds,
    
    #[msg("Calculation overflow")]
    MathOverflow,
    
    #[msg("Calculation underflow")]
    MathUnderflow,

    #[msg("Invalid token amount (must be greater than 0)")]
    InvalidAmount,

    #[msg("Insufficient token reserves in bonding curve")]
    InsufficientTokenReserves,

    #[msg("Insufficient SOL reserves in bonding curve")]
    InsufficientSolReserves,

    // Alpha Vault Errors (Anti-Snipe)
    #[msg("The Alpha Vault deposit period has ended")]
    AlphaPhaseEnded,
    
    #[msg("The Alpha Vault period has NOT ended yet")]
    AlphaPhaseNotEnded,
    
    #[msg("You have already claimed your tokens")]
    AlreadyClaimed,
    
    #[msg("No deposit found for this user")]
    NoDepositFound,
    
    #[msg("Trading is already live, cannot finalize alpha vault")]
    TradingAlreadyLive,
    
    #[msg("Invalid creator wallet provided")]
    InvalidCreatorWallet,

    #[msg("No tokens owed to claim")]
    NoTokensOwed,

    #[msg("Invalid claimer - does not match deposit owner")]
    InvalidClaimer,

    #[msg("Invalid mint - does not match deposit mint")]
    InvalidMint,

    #[msg("Deposit amount must be greater than 0")]
    InvalidDepositAmount,

    #[msg("Total alpha deposits cannot be zero")]
    ZeroAlphaDeposits,

    // --- Bonding Curve Errors ---
    #[msg("Token sale is already complete")]
    SaleComplete,

    #[msg("Cannot sell more tokens than you own")]
    InsufficientTokenBalance,

    #[msg("Invalid price calculation")]
    InvalidPriceCalculation,

    #[msg("Token reserves depleted")]
    TokenReservesDepleted,

    #[msg("Market cap threshold reached")]
    MarketCapReached,

    // Account Validation Errors
    #[msg("Invalid token mint provided")]
    InvalidTokenMint,

    #[msg("Invalid token account provided")]
    InvalidTokenAccount,

    #[msg("Invalid authority provided")]
    InvalidAuthority,

    #[msg("Account already initialized")]
    AlreadyInitialized,

    #[msg("Account not initialized")]
    NotInitialized,

    // Fee Errors
    #[msg("Invalid fee wallet provided")]
    InvalidFeeWallet,

    #[msg("Fee calculation error")]
    FeeCalculationError,

    #[msg("Platform fee exceeds maximum allowed")]
    PlatformFeeTooHigh,

    #[msg("Creator fee exceeds maximum allowed")]
    CreatorFeeTooHigh,
}
