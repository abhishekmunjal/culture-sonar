import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/diagnoses" className="flex items-center"><Logo /></Link>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              >
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
