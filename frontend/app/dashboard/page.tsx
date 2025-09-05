"use client";
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Globe, Plus } from 'lucide-react';
import { useWebsites } from '@/hooks/useWebsites';
import axios from 'axios';
import { API_BACKEND_URL } from '@/config';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type UptimeStatus = "good" | "bad" | "unknown";

function StatusCircle({ status }: { status: UptimeStatus }) {
  return (
    <div className={`w-3 h-3 rounded-full ${status === 'good' ? 'bg-green-500' : status === 'bad' ? 'bg-red-500' : 'bg-muted'}`} />
  );
}

function UptimeTicks({ ticks }: { ticks: UptimeStatus[] }) {
  return (
    <div className="flex gap-1 mt-2">
      {ticks.map((tick, index) => (
        <div
          key={index}
          className={`w-5 lg:w-8 h-2 rounded ${tick === 'good' ? 'bg-green-500' : tick === 'bad' ? 'bg-red-500' : 'bg-muted'
            }`}
        />
      ))}
    </div>
  );
}

function CreateWebsiteModal({ isOpen, onClose }: { isOpen: boolean; onClose: (url: string | null) => void }) {
  const [url, setUrl] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg border border-border p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Add New Website</h2>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            URL
          </label>
          <input
            type="url"
            className="w-full px-3 py-2 bg-muted text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={() => onClose(url)}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
          >
            Add Website
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProcessedWebsite {
  id: string;
  url: string;
  status: UptimeStatus;
  uptimePercentage: number;
  lastChecked: string;
  lastLatency: number | string;
  uptimeTicks: UptimeStatus[];
}

function WebsiteCard({ website }: { website: ProcessedWebsite }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const token = localStorage.getItem("authToken");

  const deleteWebsite = async () => {
    try {
      const response = await fetch(`${API_BACKEND_URL}/api/v1/website`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${token}`
        },
        body: JSON.stringify({ websiteId: website.id }),
      });

      if (response.ok) {
        window.location.reload();
      }
    }
    catch (error) {
      console.error('Error deleting website:', error);
    }
  }

  return (
    <div className="bg-background rounded-lg shadow-xl border border-border overflow-hidden">
      <div
        className="p-4 cursor-pointer flex items-center justify-between hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <StatusCircle status={website.status} />
          <div>
            <h3 className="font-semibold text-foreground">{website.url}</h3>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border flex flex-wrap justify-between items-center">
          <div>
            <div className="mt-3">
              <p className="text-sm text-muted-foreground mb-1">Last 30 minutes status:</p>
              <UptimeTicks ticks={website.uptimeTicks} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Uptime: {website.uptimePercentage.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last checked: {website.lastChecked}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last latency: {website.lastLatency} milliseconds
            </p>
          </div>
          <div className='flex items-center'>
            <Button size="icon" variant="destructive"
              aria-label="Delete"
              onClick={deleteWebsite}>
              <Trash2 className="h-4 w-4" color="white" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { websites, refreshWebsites } = useWebsites();

  const processedWebsites = useMemo(() => {
    return websites.map(website => {
      // Sort ticks by creation time
      const sortedTicks = [...website.ticks].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Get the most recent 30 minutes of ticks
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentTicks = sortedTicks.filter(tick =>
        new Date(tick.createdAt) > thirtyMinutesAgo
      );

      // Aggregate ticks into 3-minute windows (10 windows total)
      const windows: UptimeStatus[] = [];

      for (let i = 0; i < 10; i++) {
        const windowStart = new Date(Date.now() - (i + 1) * 3 * 60 * 1000);
        const windowEnd = new Date(Date.now() - i * 3 * 60 * 1000);

        const windowTicks = recentTicks.filter(tick => {
          const tickTime = new Date(tick.createdAt);
          return tickTime >= windowStart && tickTime < windowEnd;
        });

        // Window is considered up if majority of ticks are up
        const upTicks = windowTicks.filter(tick => tick.status === 'Good').length;
        windows[9 - i] = windowTicks.length === 0 ? "unknown" : (upTicks / windowTicks.length) >= 0.5 ? "good" : "bad";
      }

      // Calculate overall status and uptime percentage
      const totalTicks = sortedTicks.length;
      const upTicks = sortedTicks.filter(tick => tick.status === 'Good').length;
      const uptimePercentage = totalTicks === 0 ? 100 : (upTicks / totalTicks) * 100;

      // Get the most recent status
      const currentStatus = windows[windows.length - 1];

      // Format the last checked time
      const lastChecked = sortedTicks[0]
        ? new Date(sortedTicks[0].createdAt).toLocaleTimeString()
        : 'Never';

      // Format the last checked time
      const lastLatency = sortedTicks[0]
        ? sortedTicks[0].latency
        : 'NA';

      return {
        id: website.id,
        url: website.url,
        status: currentStatus,
        uptimePercentage,
        lastChecked,
        lastLatency,
        uptimeTicks: windows,
      };
    });
  }, [websites]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Globe className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
            <h1 className="text-md lg:text-2xl font-bold text-foreground">Uptime Monitor</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Website</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {processedWebsites.map((website) => (
            <WebsiteCard key={website.id} website={website} />
          ))}
        </div>
      </div>

      <CreateWebsiteModal
        isOpen={isModalOpen}
        onClose={async (url) => {
          if (url === null) {
            setIsModalOpen(false);
            return;
          }

          const token = localStorage.getItem("authToken");
          setIsModalOpen(false)
          axios.post(`${API_BACKEND_URL}/api/v1/website`, {
            url,
          }, {
            headers: {
              Authorization: token,
            },
          })
            .then(() => {
              refreshWebsites();
            })
        }}
      />
    </div>
  );
}

export default App;