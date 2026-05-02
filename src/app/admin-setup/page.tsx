
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const AUTHORIZED_ADMIN_EMAIL = "admin@Sports.com";

export default function AdminSetupPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyAdmin, setIsAlreadyAdmin] = useState(false);

  const [formData, setFormData] = useState({ 
    name: user?.displayName || "", 
    email: user?.email || "", 
    password: "",
  });

  // Check if current user is already an admin
  useEffect(() => {
    async function checkAdminStatus() {
      if (user) {
        const adminDoc = await getDoc(doc(db, "roles_admin", user.uid));
        if (adminDoc.exists()) {
          setIsAlreadyAdmin(true);
        }
      }
    }
    checkAdminStatus();
  }, [user, db]);

  const handleAdminProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const emailToUse = user ? user.email : formData.email;

    if (emailToUse?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setError(`Access Denied: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized for official setup.`);
      setIsLoading(false);
      return;
    }

    try {
      let targetUser = user;

      // 1. If not logged in, create or sign in
      if (!targetUser) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          targetUser = userCredential.user;
          await updateProfile(targetUser, { displayName: formData.name });
        } catch (authErr: any) {
          // If user exists, try to sign in
          if (authErr.code === 'auth/email-already-in-use') {
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            targetUser = userCredential.user;
          } else {
            throw authErr;
          }
        }
      }

      // 2. Initialize Admin Role in Firestore (This is the critical part)
      await setDoc(doc(db, "roles_admin", targetUser.uid), {
        uid: targetUser.uid,
        email: targetUser.email,
        displayName: targetUser.displayName || formData.name || "Official Admin",
        role: "admin",
        createdAt: new Date().toISOString()
      });

      toast({ 
        title: "Official Verified", 
        description: "Administrative privileges activated successfully." 
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Administrative setup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAlreadyAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[2.5rem] bg-slate-900/50 backdrop-blur-xl border-none premium-shadow text-center p-12 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">Status: Verified Official</h2>
          <p className="text-slate-400">You already have administrative access to the tabulation dashboard.</p>
          <Button asChild className="w-full h-14 rounded-2xl font-bold bg-primary">
            <Link href="/dashboard">Access Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <Button variant="ghost" asChild className="inline-flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group mb-4">
            <Link href="/login">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Portal
            </Link>
          </Button>
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Official<span className="text-primary">Setup</span></h1>
          <p className="text-slate-400 font-medium tracking-wide">
            {user ? "Enable Administrative Privileges" : "Restricted Admin Provisioning"}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/30 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm font-bold text-red-400">{error}</p>
          </div>
        )}

        <Card className="rounded-[2.5rem] border-none bg-slate-900/50 backdrop-blur-xl shadow-2xl premium-shadow border border-white/5">
          <CardContent className="p-8">
            <form onSubmit={handleAdminProvision} className="space-y-6">
              {user ? (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Logged in as</p>
                    <p className="text-white font-bold">{user.email}</p>
                  </div>
                  <p className="text-xs text-slate-400 px-4">Click below to activate official tabulation status for this account.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Official Name</Label>
                    <Input 
                      placeholder="e.g. Administrator"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Authorized Email</Label>
                    <Input 
                      type="email" 
                      placeholder="admin@Sports.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter secure password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white" 
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <UserCheck className="w-5 h-5 text-primary" />
                <p className="text-[10px] font-bold text-primary leading-tight uppercase tracking-tighter">
                  This account will be granted full write access to all tabulation data.
                </p>
              </div>

              <Button type="submit" className="w-full h-14 font-black rounded-2xl text-md bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (user ? "Claim Official Status" : "Provision Official Account")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
          Restricted Official Registry
        </p>
      </div>
    </div>
  );
}
