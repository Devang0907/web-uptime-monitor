"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuthStatus = () => {
            const token = localStorage.getItem("authToken");
            const userData = localStorage.getItem("userData");
            
            setIsAuthenticated(!!token);
            setUser(userData ? JSON.parse(userData) : null);
            setLoading(false);
        };

        checkAuthStatus();

        // Listen for storage changes (cross-tab)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "authToken" || e.key === "userData") {
                checkAuthStatus();
            }
        };

        // Listen for custom auth events (same tab)
        const handleAuthChange = () => {
            checkAuthStatus();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('authChange', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('authChange', handleAuthChange);
        };
    }, []);

    const login = (token: string, userData: any) => {
        localStorage.setItem("authToken", token);
        localStorage.setItem("userData", JSON.stringify(userData));
        setIsAuthenticated(true);
        setUser(userData);
        window.dispatchEvent(new Event('authChange'));
    };

    const logout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        setIsAuthenticated(false);
        setUser(null);
        window.dispatchEvent(new Event('authChange'));
        router.push('/login');
    };

    return {
        isAuthenticated,
        user,
        loading,
        login,
        logout
    };
}