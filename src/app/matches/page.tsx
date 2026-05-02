"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, doc, increment, serverTimestamp, writeBatch, query, orderBy } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Team, Match } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Calendar, AlertCircle, ClipboardCheck, LayoutList, ArrowLeft, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import Link from "next/link";

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

export default function MatchesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const teamsQuery = useMemoFirebase(() =>
    query(collection(firestore, "teams"), orderBy("name", "asc")),
    [firestore]
  );

  const matchesQuery = useMemoFirebase(() =>
    query(collection(firestore, "matches"), orderBy("date", "desc")),
    [firestore]
  );

  const { data: teams } = useCollection<Team>(teamsQuery);
  const { data: matches } = useCollection<Match>(matchesQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    teamAId: "",
    teamBId: "",
    scoreA: 0,
    scoreB: 0,
    date: "",
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, date: format(new Date(), "yyyy-MM-dd") }));
  }, []);

  // Unique sports from teams
  const sportsInUse = useMemo(() =>
    Array.from(new Set(teams?.map((t) => t.sport).filter(Boolean) || [])),
    [teams]
  );

  // Filter matches by sport or team name
  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q || q === "all sports") return matches;
    return matches.filter((m) => {
      const tA = teams?.find((t) => t.id === m.teamAId);
      const tB = teams?.find((t) => t.id === m.teamBId);
      return (
        tA?.name.toLowerCase().includes(q) ||
        tB?.name.toLowerCase().includes(q) ||
        (tA?.sport || "").toLowerCase().includes(q) ||
        (tB?.sport || "").toLowerCase().includes(q)
      );
    });
  }, [matches, teams, searchQuery]);

  const handleAddMatch = async () => {
    if (!form.teamAId || !form.teamBId) return;
    if (form.teamAId === form.teamBId) {
      toast({ title: "Encoding Error", description: "Participants must be distinct.", variant: "destructive" });
      return;
    }

    const batch = writeBatch(firestore);
    const matchRef = doc(collection(firestore, "matches"));

    const sA = Number(form.scoreA);
    const sB = Number(form.scoreB);

    let wA = 0, lA = 0, dA = 0, pA = 0;
    let wB = 0, lB = 0, dB = 0, pB = 0;

    if (sA > sB) { wA = 1; lB = 1; pA = 3; }
    else if (sA < sB) { lA = 1; wB = 1; pB = 3; }
    else { dA = 1; dB = 1; pA = 1; pB = 1; }

    batch.set(matchRef, {
      id: matchRef.id,
      teamAId: form.teamAId,
      teamBId: form.teamBId,
      scoreA: sA,
      scoreB: sB,
      date: form.date,
      createdAt: serverTimestamp(),
    });

    batch.update(doc(firestore, "teams", form.teamAId), {
      wins: increment(wA), losses: increment(lA), draws: increment(dA),
      points: increment(pA), scoreFor: increment(sA), scoreAgainst: increment(sB),
    });
    batch.update(doc(firestore, "teams", form.teamBId), {
      wins: increment(wB), losses: increment(lB), draws: increment(dB),
      points: increment(pB), scoreFor: increment(sB), scoreAgainst: increment(sA),
    });

    batch.commit().then(() => {
      setIsDialogOpen(false);
      setForm((prev) => ({ ...prev, teamAId: "", teamBId: "", scoreA: 0, scoreB: 0 }));
      toast({ title: "Score Encoded", description: "Automated calculation complete." });
    }).catch(() => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: "matches", operation: "create", requestResourceData: form,
      }));
    });
  };

  const handleDeleteMatch = async (match: Match) => {
    if (!confirm("Reverse official score? All rankings will be automatically corrected.")) return;

    const batch = writeBatch(firestore);
    const sA = Number(match.scoreA);
    const sB = Number(match.scoreB);

    let wA = 0, lA = 0, dA = 0, pA = 0;
    let wB = 0, lB = 0, dB = 0, pB = 0;

    if (sA > sB) { wA = -1; lB = -1; pA = -3; }
    else if (sA < sB) { lA = -1; wB = -1; pB = -3; }
    else { dA = -1; dB = -1; pA = -1; pB = -1; }

    batch.update(doc(firestore, "teams", match.teamAId), {
      wins: increment(wA), losses: increment(lA), draws: increment(dA),
      points: increment(pA), scoreFor: increment(-sA), scoreAgainst: increment(-sB),
    });
    batch.update(doc(firestore, "teams", match.teamBId), {
      wins: increment(wB), losses: increment(lB), draws: increment(dB),
      points: increment(pB), scoreFor: increment(-sB), scoreAgainst: increment(-sA),
    });
    batch.delete(doc(firestore, "matches", match.id));

    batch.commit().then(() => {
      toast({ title: "Score Reversed", description: "Standings corrected successfully." });
    }).catch(() => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: `matches/${match.id}`, operation: "delete",
      }));
    });
  };

  const getTeam = (id: string) => teams?.find((t) => t.id === id);
  const getTeamName = (id: string) => getTeam(id)?.name || "Unknown";
  const getTeamSport = (id: string) => getTeam(id)?.sport || "";

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
            <h2 className="text-4xl font-black tracking-tight text-white">Score Encoding</h2>
            <p className="text-slate-400 font-medium mt-1">Input scores for official validation and automated computation.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 text-md font-bold gap-3 rounded-2xl premium-shadow bg-primary">
                <ClipboardCheck className="w-5 h-5" />
                Encode New Score
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white">Score Entry Portal</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Team A</label>
                    <Select onValueChange={(v) => setForm({ ...form, teamAId: v })}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}{t.sport ? ` · ${t.sport}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Final Score</label>
                    <Input type="number" value={form.scoreA} onChange={(e) => setForm({ ...form, scoreA: parseInt(e.target.value) || 0 })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white text-center text-lg font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Team B</label>
                    <Select onValueChange={(v) => setForm({ ...form, teamBId: v })}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}{t.sport ? ` · ${t.sport}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Final Score</label>
                    <Input type="number" value={form.scoreB} onChange={(e) => setForm({ ...form, scoreB: parseInt(e.target.value) || 0 })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white text-center text-lg font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Competition Date</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button className="font-black px-8 rounded-xl" onClick={handleAddMatch}>Submit Official Score</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <Input
          placeholder='Search by team name or sport — try "Basketball" or "All Sports"'
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

      {/* Sport quick-filter chips */}
      {sportsInUse.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {["All Sports", ...sportsInUse].map((sport) => (
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
      )}

      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="w-40 font-black uppercase text-[10px] tracking-[0.2em] py-6 pl-8 text-slate-500">Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Participants</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Sport</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Result</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-6 pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.length > 0 ? (
                filteredMatches.map((match) => {
                  const sport = getTeamSport(match.teamAId) || getTeamSport(match.teamBId);
                  return (
                    <TableRow key={match.id} className="group transition-colors border-slate-800/50 hover:bg-slate-800/30">
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                          <Calendar className="w-3 h-3" />
                          {match.date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4 text-slate-200 font-bold">
                          <span className={match.scoreA > match.scoreB ? "text-primary font-black" : "text-slate-400"}>{getTeamName(match.teamAId)}</span>
                          <div className="w-8 h-[1px] bg-slate-800" />
                          <span className={match.scoreB > match.scoreA ? "text-primary font-black" : "text-slate-400"}>{getTeamName(match.teamBId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {sport ? (
                          <Badge className={`border-none font-black text-[10px] uppercase px-3 ${SPORT_COLORS[sport] || "bg-slate-800/40 text-slate-400"}`}>
                            {sport}
                          </Badge>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center bg-slate-800 text-slate-100 px-4 py-1.5 rounded-xl font-mono text-lg font-black">
                          {match.scoreA} <span className="mx-2 text-slate-600 font-normal">—</span> {match.scoreB}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl transition-all text-slate-500 hover:text-destructive hover:bg-red-900/20"
                          onClick={() => handleDeleteMatch(match)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-[400px] text-center bg-slate-900/30">
                    <div className="flex flex-col items-center justify-center gap-6">
                      <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                        <LayoutList className="w-10 h-10 text-slate-600" />
                      </div>
                      <div className="space-y-2">
                        {searchQuery ? (
                          <>
                            <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-base">No matches for "{searchQuery}"</p>
                            <p className="text-slate-500 text-sm font-medium">Try "All Sports" to see every match.</p>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-base">Registry is empty</p>
                            <p className="text-slate-500 text-sm font-medium">Encode scores to begin automated tabulation.</p>
                          </>
                        )}
                      </div>
                      {!searchQuery && (
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(true)}
                          className="rounded-2xl font-black mt-4 border-slate-800 bg-black text-white hover:bg-slate-900 hover:text-white px-8 h-12 transition-all shadow-xl"
                        >
                          <ClipboardCheck className="w-5 h-5 mr-2" /> Quick Encode
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

      <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-900/30 p-4 rounded-2xl">
        <AlertCircle className="w-5 h-5 text-blue-400" />
        <p className="text-xs font-bold text-blue-300">Audit Trace: All score entries are time-stamped and linked to the official encoder session.</p>
      </div>
    </div>
  );
}
