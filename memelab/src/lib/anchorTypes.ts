import { PublicKey } from "@solana/web3.js";

export type TokenBondingCurveAccount = {
  creator: PublicKey;
  [key: string]: unknown;
};

export type ProgramLike = {
  programId: PublicKey;
  methods: {
    [name: string]: (...args: unknown[]) => {
      accounts: (accounts: Record<string, unknown>) => { rpc: () => Promise<string> } & { signers?: (s: unknown[]) => { rpc: () => Promise<string> } };
    };
  };
  account: {
    tokenBondingCurve: { fetch: (pda: PublicKey) => Promise<TokenBondingCurveAccount> };
    [key: string]: unknown;
  };
};
