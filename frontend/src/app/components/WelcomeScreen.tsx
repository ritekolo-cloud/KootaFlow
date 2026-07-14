import { Button } from "./ui/button";
import { Wallet, Users, TrendingUp } from "lucide-react";

export function WelcomeScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wallet className="w-12 h-12 text-primary" />
            <h1 className="text-4xl text-primary font-medium">KootaFlow</h1>
          </div>
          <p className="text-xl text-muted-foreground">Smart Savings. Stronger Communities.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Savings</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-sm text-muted-foreground">Groups</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">Growth</span>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => onNavigate("login")}
              className="w-full h-12 rounded-xl text-lg font-medium"
            >
              Get Started
            </Button>
            <Button
              onClick={() => onNavigate("login")}
              variant="outline"
              className="w-full h-12 rounded-xl text-lg font-medium"
            >
              Login
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Manage your VSLA & SACCO effortlessly
        </p>
      </div>
    </div>
  );
}
