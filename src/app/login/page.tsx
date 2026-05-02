"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, ArrowLeft, Loader2, AlertCircle, UserCheck,
  Eye, EyeOff, Gavel, User, Clock, CheckCircle2, ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

type RequestRole = "user" | "judge";

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user" as RequestRole,
  });

  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      toast({ title: "Welcome back", description: "Successfully authenticated." });
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore(cred.user.app);
      const judgeDoc = await getDoc(doc(db, "roles_judge", cred.user.uid));
      router.push(judgeDoc.exists() ? "/judge-portal" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Request Account ────────────────────────────────────────────────────────
  const handleRequestAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registerData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!registerData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(firestore, "account_requests"), {
        name: registerData.name.trim(),
        email: registerData.email.trim().toLowerCase(),
        password: registerData.password,
        role: registerData.role,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setRequestSent(true);
      toast({
        title: "Request Submitted",
        description: "Your account request has been sent to the admin for approval.",
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Logo */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <div className="flex justify-center pt-2">
            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Arena<span className="text-primary">Portal</span></h1>
            <p className="text-slate-400 font-medium mt-1">ArenaLeader Sports Tabulation System</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-900/30 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-400">{error}</p>
          </div>
        )}

        <Card className="rounded-[2.5rem] border-none bg-slate-900/60 backdrop-blur-xl shadow-2xl premium-shadow overflow-hidden border border-white/5">
          <Tabs defaultValue="login" className="w-full" onValueChange={() => { setError(null); setRequestSent(false); }}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/80 border-b border-white/5 p-0 h-14">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all h-full"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all h-full"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <CardContent className="p-8">

              {/* ── SIGN IN ── */}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Password</Label>
                    <div className="relative">
                      <Input
                        type={showLoginPw ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary pr-12"
                      />
                      <button type="button" onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label="Toggle password">
                        {showLoginPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 font-black rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* ── REGISTER / REQUEST ACCOUNT ── */}
              <TabsContent value="register" className="mt-0">
                {requestSent ? (
                  /* Success state */
                  <div className="py-6 text-center space-y-5 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-900/40">
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white">Request Sent!</h3>
                      <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        Your account request is pending admin approval.<br />
                        You&apos;ll receive access once it&apos;s approved.
                      </p>
                    </div>

                    {/* Summary card */}
                    <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Your Request</p>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          registerData.role === "judge" ? "bg-indigo-900/30 border border-indigo-900/40" : "bg-primary/10 border border-primary/20"
                        }`}>
                          {registerData.role === "judge"
                            ? <Gavel className="w-5 h-5 text-indigo-400" />
                            : <User className="w-5 h-5 text-primary" />
                          }
                        </div>
                        <div>
                          <p className="text-white font-black text-sm">{registerData.name}</p>
                          <p className="text-slate-500 text-xs">{registerData.email}</p>
                        </div>
                        <div className="ml-auto">
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                            registerData.role === "judge"
                              ? "bg-indigo-900/20 text-indigo-400"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {registerData.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <p className="text-[11px] font-bold text-amber-400/80">Awaiting admin approval</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full rounded-2xl border-slate-800 text-slate-400 font-bold hover:text-white hover:border-slate-600"
                      onClick={() => {
                        setRequestSent(false);
                        setRegisterData({ name: "", email: "", password: "", confirmPassword: "", role: "user" });
                      }}
                    >
                      Submit Another Request
                    </Button>
                  </div>
                ) : (
                  /* Registration form */
                  <form onSubmit={handleRequestAccount} className="space-y-4">

                    {/* Role selector — shown first so user picks their role upfront */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">I am registering as a…</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {/* User card */}
                        <button
                          type="button"
                          onClick={() => setRegisterData({ ...registerData, role: "user" })}
                          className={`p-4 rounded-2xl border-2 transition-all text-left group ${
                            registerData.role === "user"
                              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-slate-800 bg-slate-950 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              registerData.role === "user" ? "bg-primary/20" : "bg-slate-800"
                            }`}>
                              <User className={`w-4 h-4 ${registerData.role === "user" ? "text-primary" : "text-slate-500"}`} />
                            </div>
                            <span className={`font-black text-sm ${registerData.role === "user" ? "text-primary" : "text-slate-400"}`}>
                              User
                            </span>
                            {registerData.role === "user" && (
                              <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-tight">
                            View scores, standings, and results
                          </p>
                        </button>

                        {/* Judge card */}
                        <button
                          type="button"
                          onClick={() => setRegisterData({ ...registerData, role: "judge" })}
                          className={`p-4 rounded-2xl border-2 transition-all text-left group ${
                            registerData.role === "judge"
                              ? "border-indigo-500 bg-indigo-900/20 shadow-lg shadow-indigo-500/10"
                              : "border-slate-800 bg-slate-950 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              registerData.role === "judge" ? "bg-indigo-900/40" : "bg-slate-800"
                            }`}>
                              <Gavel className={`w-4 h-4 ${registerData.role === "judge" ? "text-indigo-400" : "text-slate-500"}`} />
                            </div>
                            <span className={`font-black text-sm ${registerData.role === "judge" ? "text-indigo-400" : "text-slate-400"}`}>
                              Judge
                            </span>
                            {registerData.role === "judge" && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-400 ml-auto" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-tight">
                            Enter scores for assigned events
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Full Name</Label>
                      <Input
                        placeholder="e.g. Juan dela Cruz"
                        required
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        className="h-12 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        required
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="h-12 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Password</Label>
                      <div className="relative">
                        <Input
                          type={showRegPw ? "text" : "password"}
                          placeholder="Minimum 6 characters"
                          required
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className="h-12 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary pr-12"
                        />
                        <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label="Toggle password">
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPw ? "text" : "password"}
                          placeholder="Re-enter your password"
                          required
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          className={`h-12 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary pr-12 ${
                            registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                              ? "border-red-800 focus:ring-red-500"
                              : registerData.confirmPassword && registerData.password === registerData.confirmPassword
                              ? "border-green-800"
                              : ""
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                          aria-label="Toggle password">
                          {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {registerData.confirmPassword && (
                          <div className="absolute right-11 top-1/2 -translate-y-1/2">
                            {registerData.password === registerData.confirmPassword
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : <AlertCircle className="w-4 h-4 text-red-500" />
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notice */}
                    <div className="flex items-start gap-3 p-4 bg-amber-900/10 rounded-2xl border border-amber-900/20">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-amber-400/80 leading-relaxed">
                        Your request will be reviewed by the admin. You&apos;ll be able to log in once approved.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className={`w-full h-14 font-black rounded-2xl shadow-lg transition-all ${
                        registerData.role === "judge"
                          ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
                          : "bg-primary hover:bg-primary/90 shadow-primary/20"
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          {registerData.role === "judge" ? <Gavel className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          Request {registerData.role === "judge" ? "Judge" : "User"} Account
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Admin link */}
        <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Administrative Access</p>
          </div>
          <Link href="/admin-setup" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-all text-xs font-black uppercase tracking-tight">
            <UserCheck className="w-4 h-4" />
            Initialize as Administrative Official
          </Link>
          <p className="text-[9px] text-slate-600 font-medium px-4">
            Official accounts have full authorization to encode scores and manage tournament data.
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
          Certified Tabulation Portal
        </p>
      </div>
    </div>
  );
}
