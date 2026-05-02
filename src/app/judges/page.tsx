"use client";

import { useState, useMemo } from "react";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useAuth, useUser } from "@/firebase";
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { JudgedEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, ArrowLeft, Gavel, Search, X, CheckCircle2, Clock, UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getIdToken } from "firebase/auth";

interface JudgeRecord {
  id: string;
  name: string;
  email?: string;
  uid?: string;
  createdAt: any;
}

export default function JudgesPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const judgesQuery = useMemoFirebase(() => collection(firestore, "judges_registry"), [firestore]);
  const eventsQuery = useMemoFirebase(() => collection(firestore, "judged_events"), [firestore]);

  const { data: judges } = useCollection<JudgeRecord>(judgesQuery);
  const { data: events } = useCollection<JudgedEvent>(eventsQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<JudgeRecord | null>(null);
  const [accountJudge, setAccountJudge] = useState<JudgeRecord | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [form, setForm] = useState({ name: "", email: "" });
  const [accountForm, setAccountForm] = useState({ email: "", password: "" });

  const filteredJudges = useMemo(() => {
    if (!judges) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return judges;
    return judges.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        (j.email || "").toLowerCase().includes(q)
    );
  }, [judges, searchQuery]);

  const getAssignedEvents = (judgeName: string) =>
    (events || []).filter((e) =>
      e.judges.some((jn) => jn.toLowerCase() === judgeName.toLowerCase())
    );

  const getScoringStatus = (judgeName: string) => {
    const assigned = getAssignedEvents(judgeName);
    const completed = assigned.filter((e) => e.status === "completed").length;
    const ongoing = assigned.filter((e) => e.status === "ongoing").length;
    return { total: assigned.length, completed, ongoing };
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const ref = doc(collection(firestore, "judges_registry"));
    setDocumentNonBlocking(ref, {
      id: ref.id,
      name: form.name.trim(),
      email: form.email.trim(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    toast({ title: "Judge Added", description: `${form.name} added to the registry.` });
    setForm({ name: "", email: "" });
    setIsAddOpen(false);
  };

  const handleEdit = () => {
    if (!editingJudge || !editingJudge.name.trim()) return;
    updateDocumentNonBlocking(doc(firestore, "judges_registry", editingJudge.id), {
      name: editingJudge.name,
      email: editingJudge.email || "",
    });
    toast({ title: "Judge Updated" });
    setIsEditOpen(false);
    setEditingJudge(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the judges registry?`)) return;
    deleteDocumentNonBlocking(doc(firestore, "judges_registry", id));
    toast({ title: "Judge Removed" });
  };

  const handleCreateAccount = async () => {
    if (!accountJudge || !accountForm.email || !accountForm.password) return;
    if (accountForm.password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }

    setIsCreatingAccount(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const idToken = await getIdToken(currentUser);

      const res = await fetch("/api/judges/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: accountJudge.name,
          email: accountForm.email,
          password: accountForm.password,
          judgeRegistryId: accountJudge.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");

      toast({
        title: "Judge Account Created",
        description: `${accountJudge.name} can now log in with ${accountForm.email}`,
      });
      setIsAccountOpen(false);
      setAccountForm({ email: "", password: "" });
      setAccountJudge(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 text-slate-500 hover:text-white font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-white">Judges</h2>
            <p className="text-slate-400 font-medium mt-1">Manage the judges registry, assign to events, and create login accounts.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 text-md font-bold gap-3 rounded-2xl premium-shadow bg-primary">
                <Plus className="w-5 h-5" />
                Add Judge
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white">Add Judge</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Full Name</label>
                  <Input placeholder="e.g. Maria Santos" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Email (optional — used for login account)</label>
                  <Input placeholder="e.g. maria@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button className="font-black px-8 rounded-xl" onClick={handleAdd}>Add Judge</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Judges", value: judges?.length || 0, color: "text-white" },
          { label: "With Accounts", value: (judges || []).filter(j => j.uid).length, color: "text-primary" },
          { label: "Ongoing Events", value: (events || []).filter(e => e.status === "ongoing").length, color: "text-green-400" },
          { label: "Completed Events", value: (events || []).filter(e => e.status === "completed").length, color: "text-slate-400" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow">
            <CardContent className="p-6">
              <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <Input
          placeholder="Search judges by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-11 pr-10 rounded-2xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-600 focus-visible:ring-primary"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-6 pl-8 text-slate-500">Judge</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Account</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Assigned Events</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Scoring Status</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-6 pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJudges.length > 0 ? (
                filteredJudges.map((judge) => {
                  const assigned = getAssignedEvents(judge.name);
                  const status = getScoringStatus(judge.name);
                  return (
                    <TableRow key={judge.id} className="group transition-colors border-slate-800/50 hover:bg-slate-800/30">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-900/20 flex items-center justify-center border border-indigo-900/30">
                            <Gavel className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-black text-slate-200 text-base group-hover:text-primary transition-colors">{judge.name}</p>
                            {judge.email && <p className="text-[10px] font-bold text-slate-500">{judge.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {judge.uid ? (
                          <div className="flex items-center justify-center gap-1.5 text-green-400 text-xs font-black">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Active
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-slate-700 text-slate-400 hover:text-white hover:border-primary text-xs font-black gap-1.5 h-8 px-3"
                            onClick={() => {
                              setAccountJudge(judge);
                              setAccountForm({ email: judge.email || "", password: "" });
                              setIsAccountOpen(true);
                            }}
                          >
                            <UserPlus className="w-3 h-3" />
                            Create Login
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {assigned.length === 0 ? (
                          <span className="text-slate-600 text-xs font-bold">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {assigned.slice(0, 2).map((e) => (
                              <Badge key={e.id} variant="outline" className="border-slate-700 text-slate-400 text-[9px] font-bold px-2">
                                {e.name.length > 18 ? e.name.slice(0, 18) + "…" : e.name}
                              </Badge>
                            ))}
                            {assigned.length > 2 && (
                              <Badge variant="outline" className="border-slate-700 text-slate-500 text-[9px] font-bold px-2">
                                +{assigned.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-3">
                          {status.completed > 0 && (
                            <div className="flex items-center gap-1 text-green-400 text-xs font-black">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {status.completed} done
                            </div>
                          )}
                          {status.ongoing > 0 && (
                            <div className="flex items-center gap-1 text-amber-400 text-xs font-black">
                              <Clock className="w-3.5 h-3.5" />
                              {status.ongoing} ongoing
                            </div>
                          )}
                          {status.total === 0 && <span className="text-slate-600 text-xs font-bold">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8 space-x-1">
                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:text-primary"
                          onClick={() => { setEditingJudge({ ...judge }); setIsEditOpen(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:text-destructive"
                          onClick={() => handleDelete(judge.id, judge.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-[300px] text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Gavel className="w-12 h-12 text-slate-700" />
                      <p className="text-slate-500 font-black uppercase tracking-widest text-sm">
                        {searchQuery ? `No judges matching "${searchQuery}"` : "No judges registered yet"}
                      </p>
                      {!searchQuery && (
                        <Button variant="outline" onClick={() => setIsAddOpen(true)} className="rounded-2xl font-black border-slate-800 bg-black text-white hover:bg-slate-900 px-8 h-11">
                          <Plus className="w-4 h-4 mr-2" /> Add First Judge
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Create Judge Login</DialogTitle>
          </DialogHeader>
          {accountJudge && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
                <Gavel className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-white font-black">{accountJudge.name}</p>
                  <p className="text-slate-500 text-xs font-bold">Judge Registry</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Login Email</label>
                <Input
                  type="email"
                  placeholder="judge@example.com"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="p-4 bg-indigo-900/20 rounded-2xl border border-indigo-900/30">
                <p className="text-xs font-bold text-indigo-300">
                  The judge will log in at the same login page. They will only see their assigned events and can only enter their own scores.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsAccountOpen(false)}>Cancel</Button>
            <Button
              className="font-black px-8 rounded-xl gap-2"
              onClick={handleCreateAccount}
              disabled={isCreatingAccount}
            >
              {isCreatingAccount ? "Creating…" : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Edit Judge</DialogTitle>
          </DialogHeader>
          {editingJudge && (
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Full Name</label>
                <Input value={editingJudge.name} onChange={(e) => setEditingJudge({ ...editingJudge, name: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Email</label>
                <Input value={editingJudge.email || ""} onChange={(e) => setEditingJudge({ ...editingJudge, email: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="font-black px-8 rounded-xl" onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
