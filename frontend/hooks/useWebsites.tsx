"use client";
import { API_BACKEND_URL } from "@/config";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Website {
    id: string;
    url: string;
    ticks: {
        id: string;
        createdAt: string;
        status: string;
        latency: number;
    }[];
}

export function useWebsites() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const router = useRouter();

    async function refreshWebsites() {    
        const token = localStorage.getItem("authToken");
        const response = await axios.get(`${API_BACKEND_URL}/api/v1/websites`, {
            headers: {
                Authorization: token,
            },
        });

        if(response.status == 401){
            router.push("/login");
        }
        
        setWebsites(response.data.websites);
    }

    useEffect(() => {
        refreshWebsites();

        const interval = setInterval(() => {
            refreshWebsites();
        }, 1000 * 60 * 1);

        return () => clearInterval(interval);
    }, []);

    return { websites, refreshWebsites };

}