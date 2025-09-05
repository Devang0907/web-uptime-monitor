"use client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AuthUser } from "@/types";

export function Appbar() {
    const { isAuthenticated, user, logout } = useAuth() as {
        isAuthenticated: boolean;
        user: AuthUser | null;
        logout: () => void;
    };

    return (
        <div className="flex justify-between items-center p-4 border-b">
            <div className="text-sm lg:text-xl font-semibold">Better Uptime</div>
            {isAuthenticated && (
                <div className="flex items-center gap-3">
                    {user && (
                        <span className="text-sm text-muted-foreground">
                            {user.email}
                        </span>
                    )}
                    <Button 
                        variant="destructive"
                        size="sm"
                        onClick={logout}
                    >
                        Logout
                    </Button>
                </div>
            )}
        </div>
    );
}