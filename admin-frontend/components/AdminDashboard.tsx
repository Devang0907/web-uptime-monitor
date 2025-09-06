'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner"
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaPayment } from '@/hooks/useSolanaPayment';
import { Users, Globe, Shield, DollarSign, Wallet, Check, AlertCircle, Copy } from 'lucide-react';
import { API_BACKEND_URL } from "@/config";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface Stats {
  users: number;
  websites: number;
  validators: number;
  amountToPay: number;
}

interface Validator {
  id: string;
  publicKey: string;
  pendingPayouts: number;
  name?: string;
  status: 'active' | 'inactive';
  lastValidation?: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ users: 0, websites: 0, validators: 0, amountToPay: 0 });
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingValidator, setPayingValidator] = useState<string | null>(null);
  const { sendPayment, isConnected } = useSolanaPayment();
  
  const AUTH_TOKEN = localStorage.getItem('adminToken');

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/stats`, {
        headers: {
          'Authorization': `${AUTH_TOKEN}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast("Failed to fetch stats");
    }
  };

  // Fetch validators from API
  const fetchValidators = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/validators`, {
        headers: {
          'Authorization': `${AUTH_TOKEN}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch validators');

      const data = await response.json();
      setValidators(data.validators);
    } catch (error) {
      toast("Failed to fetch validators");
    } finally {
      setLoading(false);
    }
  };

  // Mark validator as paid
  const markAsPaid = async (validatorId: string) => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${AUTH_TOKEN}`
        },
        body: JSON.stringify({ validatorId })
      });

      if (!response.ok) throw new Error('Failed to mark as paid');

      // Refresh data
      await fetchStats();
      await fetchValidators();

      toast("Payment marked as completed");
    } catch (error) {
      toast("Failed to mark payment as completed");
    }
  };

  // Handle payment
  const handlePayment = async (validator: Validator) => {
    if (!isConnected) {
      toast("Please connect your wallet first");
      return;
    }

    if (validator.pendingPayouts <= 0) {
      toast("This validator has no pending payouts");
      return;
    }

    setPayingValidator(validator.id);

    try {
      // Convert into SOL amount
      const sol = Number(validator.pendingPayouts / LAMPORTS_PER_SOL);  
      const signature = await sendPayment(validator.publicKey, sol);

      showSignature(signature);

      // Mark as paid in the backend
      await markAsPaid(validator.id);

    } catch (error) {
      console.error('Payment error:', error);
      toast(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setPayingValidator(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchValidators();
  }, []);

  const statsCards = [
    {
      title: "Total Users",
      value: stats.users,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Websites",
      value: stats.websites,
      description: "Monitored websites",
      icon: Globe,
      color: "text-green-600"
    },
    {
      title: "Validators",
      value: stats.validators,
      description: "Active validators",
      icon: Shield,
      color: "text-purple-600"
    },
    {
      title: "Pending Payouts",
      value: `${Number(stats.amountToPay / LAMPORTS_PER_SOL)} SOL`,
      description: "Total amount to pay",
      icon: DollarSign,
      color: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage validators and payments</p>
        </div>
        <div className="flex items-center gap-4">
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Validators Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Validators Management
          </CardTitle>
          <CardDescription>
            Manage validator payments and view their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validators.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No validators</h3>
              <p className="mt-1 text-sm text-gray-500">No validators found in the system.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validator ID</TableHead>
                  <TableHead>Public Key</TableHead>
                  <TableHead className="text-right">Pending Payouts (in SOL)</TableHead>
                  <TableHead className="text-right">Pending Payouts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validators.map((validator) => (
                  <TableRow key={validator.id}>
                    <TableCell className="font-medium">
                      {validator.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-sm flex items-center gap-2">
                      <span>{validator.publicKey.substring(0, 16)}...</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(validator.publicKey);
                          toast.success("Public key copied!");
                        }}
                        className="p-1 hover:bg-black rounded"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {validator.pendingPayouts > 0 ? (
                        <span className="text-orange-600">
                          {Number(validator.pendingPayouts / LAMPORTS_PER_SOL)} SOL
                        </span>
                      ) : (
                        <span className="text-gray-500">0 SOL</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {validator.pendingPayouts > 0 ? (
                        <span className="text-orange-600">
                          {validator.pendingPayouts} Lamports
                        </span>
                      ) : (
                        <span className="text-gray-500">0 Lamports</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {validator.pendingPayouts > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handlePayment(validator)}
                          disabled={!isConnected || payingValidator === validator.id}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {payingValidator === validator.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Paying...
                            </>
                          ) : (
                            <>
                              <Wallet className="h-4 w-4 mr-2" />
                              Pay Now
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wallet Connection Status */}
      {!isConnected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Connect your wallet to make payments to validators
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function showSignature(signature: string) {
  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  toast(
    <div>
      Transaction:&nbsp;
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-400"
      >
        {signature.substring(0, 16)}...
      </a>
    </div>
  );
}

export default AdminDashboard;