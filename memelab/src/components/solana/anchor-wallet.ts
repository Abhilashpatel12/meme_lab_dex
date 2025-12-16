'use client'

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import type { UiWalletAccount } from '@wallet-ui/react'

/**
 * Anchor-compatible wallet wrapper for @wallet-ui/react signer.
 * 
 * This adapter allows Anchor's AnchorProvider to work with wallet-ui signers.
 * It implements the minimal interface expected by Anchor: publicKey, signTransaction, signAllTransactions.
 */
export class AnchorWalletAdapter {
  constructor(
    public readonly account: UiWalletAccount,
    private readonly signTransactionFn: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>,
    private readonly signAllTransactionsFn: (txs: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>
  ) {}

  get publicKey(): PublicKey {
    return new PublicKey(this.account.address)
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.signTransactionFn(tx) as Promise<T>
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return this.signAllTransactionsFn(txs) as Promise<T[]>
  }
}
