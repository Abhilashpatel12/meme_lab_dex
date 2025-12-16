export function getErrorMessage(err: unknown): string {
  if (!err) return String(err);
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ellipsify(str = '', len = 4, delimiter = '..') {
  const strLen = str.length
  const limit = len * 2 + delimiter.length

  return strLen >= limit ? str.substring(0, len) + delimiter + str.substring(strLen - len, strLen) : str
}

import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

// Lightweight helper to derive the Associated Token Account (ATA).
// Some versions of `@solana/spl-token` export helper functions; to avoid
// version/type conflicts we derive the ATA here using the standard seeds.
export async function deriveAssociatedTokenAddress(mint: PublicKey, owner: PublicKey) {
  const [ata] = PublicKey.findProgramAddressSync([
    owner.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ], ASSOCIATED_TOKEN_PROGRAM_ID)
  return ata
}
