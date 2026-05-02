
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, ArrowLeft, Loader2, AlertCircle, UserCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "" });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      toast({ title: "Welcome back", description: "Successfully authenticated." });

      // Check if this user is a judge
      const { getFirestore, doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore(userCredential.user.app);
      const judgeDoc = await getDoc(doc(db, "roles_judge", userCredential.user.uid));
      if (judgeDoc.exists()) {
        router.push("/judge-portal");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: registerData.name });

      toast({ 
        title: "Account Created", 
        description: "Your viewer account is ready." 
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors group mb-4">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Arena<span className="text-primary">Portal</span></h1>
          <p className="text-slate-400 font-medium">Access ArenaLeader Portal</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/30 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm font-bold text-red-400">{error}</p>
          </div>
        )}

        <Card className="rounded-[2.5rem] border-none bg-slate-900/50 backdrop-blur-xl shadow-2xl premium-shadow overflow-hidden border border-white/5">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-900/80 border-b border-white/5 p-0 h-16">
              <TabsTrigger value="login" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all">Log In</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-transparent data-[state=active]:text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all">Register</TabsTrigger>
            </TabsList>
            
            <CardContent className="p-8">
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email Address</Label>
                    <Input 
                      type="email" 
                      placeholder="name@example.com"
                      required
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</Label>
                    <div className="relative">
                      <Input 
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 font-black rounded-2xl text-md bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Full Name</Label>
                    <Input 
                      placeholder="Your name"
                      required
                      value={registerData.name}
                      onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email Address</Label>
                    <Input 
                      type="email" 
                      placeholder="email@example.com"
                      required
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</Label>
                    <div className="relative">
                      <Input 
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Minimum 6 characters"
                        required
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        className="h-14 rounded-2xl bg-slate-950 border-slate-800 text-white focus:ring-primary pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      >
                        {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 font-black rounded-2xl text-md bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 text-center space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Administrative Access</p>
          <Link href="/admin-setup" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-all text-xs font-black uppercase tracking-tight">
            <UserCheck className="w-4 h-4" />
            Initialize as Administrative Official
          </Link>
          <p className="text-[9px] text-slate-600 font-medium px-4">Official accounts have full authorization to encode scores and manage tournament data.</p>
        </div>

        <p className="text-center text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
          Certified Tabulation Portal
        </p>
      </div>
    </div>
  );
}
