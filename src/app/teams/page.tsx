"use client";

import { useState, useMemo } from "react";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Team, ALL_SPORTS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, ArrowLeft, Users, Shield, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const SPORT_COLORS: Record<string, string> = {
  Basketball: "bg-orange-900/20 text-orange-400",
  Football: "bg-green-900/20 text-green-400",
  Volleyball: "bg-yellow-900/20 text-yellow-400",
  Baseball: "bg-red-900/20 text-red-400",
  Softball: "bg-pink-900/20 text-pink-400",
  Soccer: "bg-emerald-900/20 text-emerald-400",
  Tennis: "bg-lime-900/20 text-lime-400",
  Badminton: "bg-cyan-900/20 text-cyan-400",
  "Table Tennis": "bg-sky-900/20 text-sky-400",
  Swimming: "bg-blue-900/20 text-blue-400",
  Athletics: "bg-violet-900/20 text-violet-400",
  Boxing: "bg-rose-900/20 text-rose-400",
  "Martial Arts": "bg-red-900/20 text-red-300",
  Cycling: "bg-teal-900/20 text-teal-400",
  Chess: "bg-slate-700/40 text-slate-300",
  Esports: "bg-purple-900/20 text-purple-400",
  Other: "bg-slate-800/40 text-slate-400",
};

export default function TeamsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const teamsQuery = useMemoFirebase(() => collection(firestore, "teams"), [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSport, setNewTeamSport] = useState("Basketball");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Derive unique sports from existing teams + "All Sports"
  const availableSports = useMemo(() => {
    const sportsInUse = new Set(teams?.map(t => t.sport).filter(Boolean) || []);
    return ["All Sports", ...ALL_SPORTS.filter(s => s !== "All Sports" && sportsInUse.has(s)), 
      ...ALL_SPORTS.filter(s => s !== "All Sports" && !sportsInUse.has(s))];
  }, [teams]);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q || q === "all sports") return teams;
    // Match by sport name or team name
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.sport || "").toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    
    if (teams?.some(t => t.name.toLowerCase() === newTeamName.toLowerCase())) {
      toast({ title: "Duplicate Team", description: "A team with this name already exists.", variant: "destructive" });
      return;
    }

    const teamRef = doc(collection(firestore, "teams"));
    
    setDocumentNonBlocking(teamRef, {
      id: teamRef.id,
      name: newTeamName,
      sport: newTeamSport,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      createdAt: serverTimestamp(),
    }, { merge: true });
    
    setNewTeamName("");
    setNewTeamSport("Basketball");
    setIsAddOpen(false);
    toast({ title: "Team Added", description: `${newTeamName} has joined the tournament.` });
  };

  const handleEditTeam = () => {
    if (!editingTeam || !editingTeam.name.trim()) return;

    updateDocumentNonBlocking(doc(firestore, "teams", editingTeam.id), {
      name: editingTeam.name,
      sport: editingTeam.sport,
    });

    setIsEditOpen(false);
    setEditingTeam(null);
    toast({ title: "Team Updated", description: "Changes saved successfully." });
  };

  const handleDeleteTeam = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will not remove their matches, but standings may become inconsistent.`)) return;
    
    deleteDocumentNonBlocking(doc(firestore, "teams", id));
    toast({ title: "Team Removed", description: `${name} has been deleted.` });
  };

  const sportBadgeClass = (sport: string) =>
    SPORT_COLORS[sport] || "bg-slate-800/40 text-slate-400";

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
            <h2 className="text-4xl font-black tracking-tight text-white">Teams</h2>
            <p className="text-slate-400 font-medium mt-1">Manage participating sports organizations and rosters.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 text-md font-bold gap-3 rounded-2xl premium-shadow bg-primary">
                <Plus className="w-5 h-5" />
                New Team
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white">Add New Team</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Official Organization Name</label>
                  <Input 
                    placeholder="e.g. Phoenix Suns" 
                    value={newTeamName} 
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Sport</label>
                  <Select value={newTeamSport} onValueChange={setNewTeamSport}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_SPORTS.filter(s => s !== "All Sports").map(sport => (
                        <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button className="font-black px-8 rounded-xl" onClick={handleAddTeam}>Create Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search / Filter Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <Input
          placeholder='Search by team name or sport — try "Basketball" or "All Sports"'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-11 pr-10 rounded-2xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-600 focus-visible:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sport quick-filter chips */}
      <div className="flex flex-wrap gap-2">
        {["All Sports", ...Array.from(new Set(teams?.map(t => t.sport).filter(Boolean) || []))].map(sport => (
          <button
            key={sport}
            onClick={() => setSearchQuery(sport === "All Sports" ? "" : sport)}
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
              (sport === "All Sports" && !searchQuery) || searchQuery.toLowerCase() === sport.toLowerCase()
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
            }`}
          >
            {sport}
          </button>
        ))}
      </div>

      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="w-16 text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">ID</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Team Identity</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Sport</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Status</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-6 pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team, index) => (
                  <TableRow key={team.id} className="group transition-colors border-slate-800/50 hover:bg-slate-800/30">
                    <TableCell className="text-center">
                      <div className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg bg-slate-800 text-slate-500 font-bold text-xs">
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-sm">
                          <Shield className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-black text-slate-200 text-lg group-hover:text-primary transition-colors">{team.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Registered Member</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`border-none font-black text-[10px] uppercase px-3 ${sportBadgeClass(team.sport || "Other")}`}>
                        {team.sport || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-900/20 text-green-400 border-none font-black text-[10px] uppercase px-3">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8 space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl transition-all text-slate-500 hover:text-primary"
                        onClick={() => {
                          setEditingTeam(team);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl transition-all text-slate-500 hover:text-destructive"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-[400px] text-center bg-slate-900/30">
                    <div className="flex flex-col items-center justify-center gap-6">
                      <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                        <Users className="w-10 h-10 text-slate-600" />
                      </div>
                      <div className="space-y-2">
                        {searchQuery ? (
                          <>
                            <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-base">No results for "{searchQuery}"</p>
                            <p className="text-slate-500 text-sm font-medium">Try "All Sports" to see every team.</p>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-base">Roster is empty</p>
                            <p className="text-slate-500 text-sm font-medium">Create your first team to start the tournament.</p>
                          </>
                        )}
                      </div>
                      {!searchQuery && (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsAddOpen(true)} 
                          className="rounded-2xl font-black mt-4 border-slate-800 bg-black text-white hover:bg-slate-900 hover:text-white px-8 h-12 transition-all shadow-xl"
                        >
                          <Plus className="w-5 h-5 mr-2" /> Quick Add
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Edit Team Details</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Update Team Name</label>
              <Input 
                value={editingTeam?.name || ""} 
                onChange={(e) => editingTeam && setEditingTeam({...editingTeam, name: e.target.value})}
                className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Sport</label>
              <Select
                value={editingTeam?.sport || "Basketball"}
                onValueChange={(v) => editingTeam && setEditingTeam({...editingTeam, sport: v})}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SPORTS.filter(s => s !== "All Sports").map(sport => (
                    <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button className="font-black px-8 rounded-xl" onClick={handleEditTeam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
