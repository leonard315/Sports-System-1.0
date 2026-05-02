"use client";

import { useState, useMemo } from "react";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, ArrowLeft, UserCog, Search, X, ShieldCheck, Eye, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type UserRole = "admin" | "encoder" | "viewer";

interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: any;
}

const ROLE_STYLES: Record<UserRole, string> = {
  admin: "bg-primary/20 text-primary",
  encoder: "bg-amber-900/20 text-amber-400",
  viewer: "bg-slate-700/40 text-slate-400",
};

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="w-3.5 h-3.5" />,
  encoder: <Pencil className="w-3.5 h-3.5" />,
  viewer: <Eye className="w-3.5 h-3.5" />,
};

export default function UserAccessPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => collection(firestore, "app_users"), [firestore]);
  const { data: users } = useCollection<AppUser>(usersQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ email: "", displayName: "", role: "encoder" as UserRole });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleAdd = () => {
    if (!form.email.trim()) return;
    const ref = doc(collection(firestore, "app_users"));
    setDocumentNonBlocking(ref, {
      id: ref.id,
      email: form.email.trim().toLowerCase(),
      displayName: form.displayName.trim(),
      role: form.role,
      createdAt: serverTimestamp(),
    }, { merge: true });
    toast({ title: "User Added", description: `${form.email} granted ${form.role} access.` });
    setForm({ email: "", displayName: "", role: "encoder" });
    setIsAddOpen(false);
  };

  const handleEdit = () => {
    if (!editingUser) return;
    updateDocumentNonBlocking(doc(firestore, "app_users", editingUser.id), {
      displayName: editingUser.displayName || "",
      role: editingUser.role,
    });
    toast({ title: "Access Updated", description: `${editingUser.email} is now ${editingUser.role}.` });
    setIsEditOpen(false);
    setEditingUser(null);
  };

  const handleRevoke = (id: string, email: string) => {
    if (!confirm(`Revoke access for "${email}"? They will no longer be able to log in with elevated permissions.`)) return;
    deleteDocumentNonBlocking(doc(firestore, "app_users", id));
    toast({ title: "Access Revoked", description: `${email} removed from the system.` });
  };

  const roleCounts = useMemo(() => ({
    admin: (users || []).filter(u => u.role === "admin").length,
    encoder: (users || []).filter(u => u.role === "encoder").length,
    viewer: (users || []).filter(u => u.role === "viewer").length,
  }), [users]);

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
            <h2 className="text-4xl font-black tracking-tight text-white">User Access</h2>
            <p className="text-slate-400 font-medium mt-1">Manage encoder and viewer accounts and their access rights.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 text-md font-bold gap-3 rounded-2xl premium-shadow bg-primary">
                <Plus className="w-5 h-5" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white">Add User</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Email Address</label>
                  <Input placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Display Name (optional)</label>
                  <Input placeholder="e.g. Juan dela Cruz" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Role</label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin — Full access</SelectItem>
                      <SelectItem value="encoder">Encoder — Can enter scores</SelectItem>
                      <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button className="font-black px-8 rounded-xl" onClick={handleAdd}>Grant Access</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4">
        {(["admin", "encoder", "viewer"] as UserRole[]).map((role) => (
          <Card key={role} className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${ROLE_STYLES[role].split(" ")[0]}`}>
                <span className={ROLE_STYLES[role].split(" ")[1]}>{ROLE_ICONS[role]}</span>
              </div>
              <div>
                <div className="text-2xl font-black text-white">{roleCounts[role]}</div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest capitalize">{role}s</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <Input
          placeholder="Search by email, name, or role..."
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

      {/* Users table */}
      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-6 pl-8 text-slate-500">User</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Role</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-6 pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="group transition-colors border-slate-800/50 hover:bg-slate-800/30">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 font-black text-slate-400 text-sm uppercase">
                          {(u.displayName || u.email).charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-200 text-base group-hover:text-primary transition-colors">
                            {u.displayName || <span className="text-slate-400 font-bold">(no name)</span>}
                          </p>
                          <p className="text-[11px] font-bold text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`border-none font-black text-[10px] uppercase px-3 gap-1.5 ${ROLE_STYLES[u.role]}`}>
                        {ROLE_ICONS[u.role]}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8 space-x-1">
                      <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:text-primary"
                        onClick={() => { setEditingUser({ ...u }); setIsEditOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 hover:text-destructive"
                        onClick={() => handleRevoke(u.id, u.email)}
                        disabled={u.email === currentUser?.email}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-[300px] text-center">
                    <div className="flex flex-col items-center gap-4">
                      <UserCog className="w-12 h-12 text-slate-700" />
                      <p className="text-slate-500 font-black uppercase tracking-widest text-sm">
                        {searchQuery ? `No users matching "${searchQuery}"` : "No users registered yet"}
                      </p>
                      {!searchQuery && (
                        <Button variant="outline" onClick={() => setIsAddOpen(true)} className="rounded-2xl font-black border-slate-800 bg-black text-white hover:bg-slate-900 px-8 h-11">
                          <Plus className="w-4 h-4 mr-2" /> Add First User
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Edit User Access</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="py-6 space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <p className="text-xs font-black uppercase text-slate-500 tracking-widest mb-1">Account</p>
                <p className="text-white font-bold">{editingUser.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Display Name</label>
                <Input value={editingUser.displayName || ""} onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Role</label>
                <Select value={editingUser.role} onValueChange={(v) => setEditingUser({ ...editingUser, role: v as UserRole })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="encoder">Encoder — Can enter scores</SelectItem>
                    <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                  </SelectContent>
                </Select>
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
