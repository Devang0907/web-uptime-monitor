'use client';

import React, { useEffect } from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import { Toaster } from '@/components/ui/sonner';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.replace("/login");
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-black">
      <AdminDashboard />
      <Toaster />
    </div>
  );
}