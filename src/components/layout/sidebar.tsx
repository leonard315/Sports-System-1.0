"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Swords,
  LogOut,
  ChevronRight,
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Activity,
  Star,
  Gavel,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { name: "Teams", href: "/teams", icon: Users, adminOnly: true },
  { name: "Matches", href: "/matches", icon: Swords, adminOnly: true },
  { name: "Events", href: "/events", icon: Star, adminOnly: false },
  { name: "Judges", href: "/judges", icon: Gavel, adminOnly: true },
  { name: "Standings", href: "/standings", icon: Trophy, adminOnly: false },
  { name: "Officials", href: "/officials", icon: UserCheck, adminOnly: true },
  { name: "User Access", href: "/user-access", icon: UserCog, adminOnly: true },
];

interface DashboardSidebarProps {
  onNavClick?: () => void;
}

export function DashboardSidebar({ onNavClick }: DashboardSidebarProps) {
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const adminDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "roles_admin", user.uid) : null),
    [firestore, user]
  );

  const { data: adminData, isLoading: adminLoading } = useDoc(adminDocRef);
  const isAdmin = !!adminData;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Session Ended", description: "Successfully signed out." });
      router.push("/");
    } catch {
      toast({ title: "Logout Failed", variant: "destructive" });
    }
  };

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex flex-col w-full lg:w-72 border-r border-slate-800 bg-slate-950 h-full lg:h-screen lg:sticky lg:top-0 shadow-2xl z-20">
      <div className="p-8">
        <Link href="/" onClick={onNavClick}>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 group">
            <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tighter">
                Arena<span className="text-primary font-black">Leader</span>
              </span>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.3em] -mt-1">
                Pro Tabulation
              </span>
            </div>
          </h1>
        </Link>
      </div>

      <nav className="flex-1 px-6 space-y-1 mt-4 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 mb-4">
          <Activity className="w-3 h-3 text-primary animate-pulse" />
          <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">
            {isAdmin ? "Official Console" : "Viewer Portal"}
          </p>
        </div>
        {isUserLoading || adminLoading ? (
          <div className="space-y-3 px-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl bg-slate-900/50" />
            ))}
          </div>
        ) : (
          filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} onClick={onNavClick}>
                <span
                  className={cn(
                    "group flex items-center justify-between px-4 py-3 text-sm font-black rounded-xl cursor-pointer transition-all duration-300",
                    isActive
                      ? "bg-primary text-white shadow-xl shadow-primary/20"
                      : "text-slate-500 hover:bg-slate-900 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-transform group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-600"
                      )}
                    />
                    {item.name}
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-white/50" />}
                </span>
              </Link>
            );
          })
        )}
      </nav>

      <div className="p-6 border-t border-slate-800 space-y-4 mt-auto">
        {isUserLoading ? (
          <div className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ) : user ? (
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex items-center gap-3 overflow-hidden">
            <Avatar className="h-10 w-10 border-2 border-primary/20 ring-4 ring-black shrink-0">
              <AvatarImage src={user.photoURL || ""} />
              <AvatarFallback className="bg-slate-800 text-primary font-black uppercase text-xs">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || (
                  <UserIcon className="w-4 h-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate uppercase tracking-tight">
                {user.displayName || "Official"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isAdmin ? (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[8px] font-black text-primary uppercase tracking-tighter">
                      Verified Official
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5 text-slate-600" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                      Viewer Mode
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <Button
          variant="ghost"
          className="w-full justify-start text-slate-500 hover:text-destructive hover:bg-destructive/10 rounded-xl h-12 font-black transition-all group"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
          Logout Session
        </Button>
      </div>
    </div>
  );
}
