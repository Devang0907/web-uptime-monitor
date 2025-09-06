'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionSignature
} from '@solana/web3.js';

export const useSolanaPayment = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

const sendPayment = async (recipientPublicKey: string, amount: number): Promise<TransactionSignature> => {
  if (!publicKey) {
    throw new Error('Wallet not connected');
  }
  if (!connection) {
    throw new Error('Connection not established');
  }

  try {
    
    // Validate recipient
    let recipient: PublicKey;
    try {
      recipient = new PublicKey(recipientPublicKey);
    } catch {
      throw new Error('Invalid recipient public key');
    }

    // Convert SOL → lamports
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Check balance
    const balance = await connection.getBalance(publicKey);
    if (balance < lamports) {
      throw new Error(`Insufficient balance. Required: ${lamports}, Available: ${balance}`);
    }


    // Build transaction fully before sending
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipient,
        lamports,
      })
    );

    // Fetch last blockhash
    const latestBlockhash = await connection.getLatestBlockhash();

    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = publicKey;

    // Ask wallet to sign & send
    const signature = await sendTransaction(transaction, connection);

    return signature;
  } catch (error) {
    console.error('Payment failed:', error);
    throw error;
  }
};

  const getBalance = async (): Promise<number> => {
    if (!publicKey || !connection) return 0;

    try {
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  };

  return {
    sendPayment,
    getBalance,
    isConnected: !!publicKey,
    publicKey,
    connection
  };
};