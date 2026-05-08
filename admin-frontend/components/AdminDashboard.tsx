'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner"
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSolanaPayment } from '@/hooks/useSolanaPayment';
import { Users, Globe, Shield, DollarSign, Wallet, Check, AlertCircle, Copy, ExternalLink } from 'lucide-react';
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
  location: string;
}

interface AdminUser {
  id: string;
  email: string;
  websiteCount: number;
  activeWebsiteCount: number;
}

interface WebsiteTick {
  id: string;
  status: 'Good' | 'Bad';
  latency: number;
  createdAt: string;
  validatorId: string;
}

interface MonitoredWebsite {
  id: string;
  url: string;
  userId: string;
  ownerEmail: string;
  disabled: boolean;
  tickCount: number;
  latestTick: WebsiteTick | null;
}

type DashboardSection = 'users' | 'websites' | 'validators';

function truncateMiddle(value: string, visibleChars = 8) {
  if (value.length <= visibleChars * 2) {
    return value;
  }

  return `${value.substring(0, visibleChars)}...${value.substring(value.length - visibleChars)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ users: 0, websites: 0, validators: 0, amountToPay: 0 });
  const [validators, setValidators] = useState<Validator[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [websites, setWebsites] = useState<MonitoredWebsite[]>([]);
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('users');
  const [loading, setLoading] = useState(true);
  const [payingValidator, setPayingValidator] = useState<string | null>(null);
  const { sendPayment, isConnected } = useSolanaPayment();

  const getAuthHeaders = () => ({
    'Authorization': `${localStorage.getItem("adminToken")}`
  });

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/stats`, {
        headers: getAuthHeaders()
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
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch validators');

      const data = await response.json();
      setValidators(data.validators);
    } catch (error) {
      toast("Failed to fetch validators");
    }
  };

  // Fetch registered users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/users`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      toast("Failed to fetch users");
    }
  };

  // Fetch monitored websites from API
  const fetchWebsites = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/websites`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch websites');

      const data = await response.json();
      setWebsites(data.websites);
    } catch (error) {
      toast("Failed to fetch websites");
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchValidators(),
      fetchUsers(),
      fetchWebsites()
    ]);
    setLoading(false);
  };

  // Mark validator as paid
  const markAsPaid = async (validatorId: string) => {
    try {
      const authToken = localStorage.getItem("adminToken");
      const response = await fetch(`${API_BACKEND_URL}/api/v1/admin/paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${authToken}`
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
    fetchDashboardData();
  }, []);

  const selectSectionFromKeyboard = (
    event: React.KeyboardEvent<HTMLDivElement>,
    section: DashboardSection
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedSection(section);
    }
  };

  const statsCards = [
    {
      title: "Total Users",
      value: stats.users,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600",
      section: 'users' as const
    },
    {
      title: "Websites",
      value: stats.websites,
      description: "Monitored websites",
      icon: Globe,
      color: "text-green-600",
      section: 'websites' as const
    },
    {
      title: "Validators",
      value: stats.validators,
      description: "Active validators",
      icon: Shield,
      color: "text-purple-600",
      section: 'validators' as const
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
          <p className="text-muted-foreground">View users, monitored websites, validators, and payments</p>
        </div>
        <div className="flex items-center gap-4">
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          const section = card.section;
          const isSelected = section === selectedSection;
          return (
            <Card
              key={card.title}
              role={section ? "button" : undefined}
              tabIndex={section ? 0 : undefined}
              aria-pressed={section ? isSelected : undefined}
              onClick={section ? () => setSelectedSection(section) : undefined}
              onKeyDown={section ? (event) => selectSectionFromKeyboard(event, section) : undefined}
              className={section ? `cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "border-primary bg-accent/30" : ""}` : undefined}
            >
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

      {/* Users Table */}
      {selectedSection === 'users' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Users
          </CardTitle>
          <CardDescription>
            View every account registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-100">No users</h3>
              <p className="mt-1 text-sm text-gray-500">No registered users found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Total Websites</TableHead>
                  <TableHead className="text-right">Active Websites</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {truncateMiddle(user.id, 10)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.websiteCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{user.activeWebsiteCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {/* Websites Table */}
      {selectedSection === 'websites' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Monitor List
          </CardTitle>
          <CardDescription>
            View every monitored website and its latest validation result
          </CardDescription>
        </CardHeader>
        <CardContent>
          {websites.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-100">No websites</h3>
              <p className="mt-1 text-sm text-gray-500">No monitored websites found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latest Check</TableHead>
                  <TableHead className="text-right">Checks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites.map((website) => (
                  <TableRow key={website.id}>
                    <TableCell className="font-medium">
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-[280px] items-center gap-2 text-blue-400 hover:underline"
                      >
                        <span className="truncate">{website.url}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {website.ownerEmail}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={website.disabled ? "secondary" : "outline"}
                        className={website.disabled ? "" : "border-green-500/40 text-green-400"}
                      >
                        {website.disabled ? "Disabled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {website.latestTick ? (
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={website.latestTick.status === "Good" ? "outline" : "destructive"}
                            className={website.latestTick.status === "Good" ? "border-green-500/40 text-green-400" : ""}
                          >
                            {website.latestTick.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {website.latestTick.latency}ms - {formatDate(website.latestTick.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No checks yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {website.tickCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      {/* Validators Table */}
      {selectedSection === 'validators' && (
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
                  <TableHead>Location</TableHead>
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
                    <TableCell className="font-medium">
                      {validator.location}
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
      )}

      {/* Wallet Connection Status */}
      {selectedSection === 'validators' && !isConnected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-1">
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
