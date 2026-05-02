"use client";

import { useState, useMemo } from "react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { Team, StandingEntry } from "@/lib/types";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, ArrowLeft, Printer, Shield, FileText, Sparkles, Loader2, Swords, BrainCircuit, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { generateTournamentSummary, type TournamentSummaryOutput } from "@/ai/flows/tournament-summary-flow";
import { predictMatchOutcome, type MatchPredictorOutput } from "@/ai/flows/match-predictor-flow";
import { useToast } from "@/hooks/use-toast";

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

export default function StandingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<TournamentSummaryOutput | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<MatchPredictorOutput | null>(null);
  const [teamAId, setTeamAId] = useState<string>("");
  const [teamBId, setTeamBId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const teamsQuery = useMemoFirebase(() =>
    query(collection(firestore, "teams"), orderBy("points", "desc")),
    [firestore]
  );

  const { data: teams } = useCollection<Team>(teamsQuery);

  const allStandings: StandingEntry[] = useMemo(() =>
    (teams || []).map((data) => ({
      ...data,
      gp: data.wins + data.losses + data.draws,
      scoreDiff: data.scoreFor - data.scoreAgainst,
    })).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      return b.wins - a.wins;
    }),
    [teams]
  );

  // Unique sports from teams
  const sportsInUse = useMemo(() =>
    Array.from(new Set(teams?.map((t) => t.sport).filter(Boolean) || [])),
    [teams]
  );

  // Filtered standings by search
  const standings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q === "all sports") return allStandings;
    return allStandings.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.sport || "").toLowerCase().includes(q)
    );
  }, [allStandings, searchQuery]);

  // Teams available for predictor (filtered by active sport filter if any)
  const predictorTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q === "all sports") return teams || [];
    return (teams || []).filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.sport || "").toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const handlePrint = () => window.print();

  const handleAiSummary = async () => {
    if (standings.length === 0) return;
    setIsGenerating(true);
    try {
      const result = await generateTournamentSummary({
        standings: standings.map((s, i) => ({
          name: s.name,
          points: s.points,
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
          rank: i + 1,
        })),
      });
      setAiSummary(result);
      toast({ title: "Report Ready", description: "AI analysis complete." });
    } catch {
      toast({ title: "Analysis Failed", description: "Could not generate summary.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePredict = async () => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      toast({ title: "Input Error", description: "Please select two different teams.", variant: "destructive" });
      return;
    }
    const teamA = teams?.find((t) => t.id === teamAId);
    const teamB = teams?.find((t) => t.id === teamBId);
    if (!teamA || !teamB) return;

    setIsPredicting(true);
    try {
      const result = await predictMatchOutcome({
        teamA: { name: teamA.name, points: teamA.points, wins: teamA.wins, losses: teamA.losses, scoreFor: teamA.scoreFor, scoreAgainst: teamA.scoreAgainst },
        teamB: { name: teamB.name, points: teamB.points, wins: teamB.wins, losses: teamB.losses, scoreFor: teamB.scoreFor, scoreAgainst: teamB.scoreAgainst },
      });
      setPrediction(result);
    } catch {
      toast({ title: "Prediction Failed", description: "AI engine encountered an error.", variant: "destructive" });
    } finally {
      setIsPredicting(false);
    }
  };

  const backHref = user ? "/dashboard" : "/";
  const backLabel = user ? "Back to Dashboard" : "Back to Home";

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 no-print">
        <Button variant="ghost" size="sm" asChild className="w-fit gap-2 -ml-2 text-slate-500 hover:text-white font-bold">
          <Link href={backHref}>
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Official Rankings</h2>
            <p className="text-slate-400 font-medium mt-1">Automated tabulation of tournament results and standings.</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAiSummary}
              disabled={isGenerating || standings.length === 0}
              variant="outline"
              className="rounded-xl border-slate-800 bg-slate-900 font-bold gap-2 premium-shadow text-white hover:bg-slate-800"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              AI Analysis
            </Button>
            <Button onClick={handlePrint} variant="default" className="rounded-xl bg-primary font-bold gap-2 shadow-lg shadow-primary/20">
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative no-print">
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
        <div className="flex flex-wrap gap-2 no-print">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 space-y-8">
          {aiSummary && (
            <Card className="rounded-[2.5rem] border-none bg-primary/10 border border-primary/20 premium-shadow overflow-hidden">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-black text-white">AI Tabulation Analysis</h3>
                </div>
                <p className="text-slate-300 leading-relaxed font-medium italic">"{aiSummary.summary}"</p>
                <div className="p-4 bg-primary/20 rounded-2xl border border-primary/30">
                  <p className="text-xs font-black uppercase text-primary tracking-widest mb-1">Top Performer Insight</p>
                  <p className="text-white font-bold">{aiSummary.topPerformerNote}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950 border-b border-slate-800">
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className="w-20 text-center font-black uppercase text-[10px] tracking-[0.2em] text-slate-500 py-8">Rank</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-500 py-8">Team</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] text-slate-500 py-8">Sport</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] text-slate-500 py-8">GP</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] text-green-500 py-8">W</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] text-red-500 py-8">L</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] text-blue-400 py-8">D</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] text-slate-500 py-8">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.length > 0 ? (
                    standings.map((team, index) => (
                      <TableRow key={team.id} className={`group transition-all ${index % 2 === 0 ? "bg-slate-900" : "bg-slate-800/30"} hover:bg-slate-800/50`}>
                        <TableCell className="text-center py-6">
                          <div className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl font-black text-lg ${
                            index === 0 ? "bg-amber-900/40 text-amber-400 ring-2 ring-amber-900/30" : "bg-slate-800 text-slate-400"
                          }`}>
                            {index === 0 ? <Trophy className="w-5 h-5" /> : index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700">
                              <Shield className={`w-5 h-5 ${index === 0 ? "text-amber-500" : "text-slate-600"}`} />
                            </div>
                            <div>
                              <span className="font-black text-slate-100 text-lg block">{team.name}</span>
                              {index === 0 && <Badge className="bg-amber-500 hover:bg-amber-600 text-[8px] font-black uppercase px-2 py-0 mt-1">Leader</Badge>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {team.sport ? (
                            <Badge className={`border-none font-black text-[10px] uppercase px-3 ${SPORT_COLORS[team.sport] || "bg-slate-800/40 text-slate-400"}`}>
                              {team.sport}
                            </Badge>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-400">{team.gp}</TableCell>
                        <TableCell className="text-center text-green-500 font-black">{team.wins}</TableCell>
                        <TableCell className="text-center text-red-500 font-black">{team.losses}</TableCell>
                        <TableCell className="text-center text-blue-400 font-black">{team.draws}</TableCell>
                        <TableCell className="text-center py-6">
                          <span className="text-2xl font-black text-primary tracking-tighter">{team.points}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-4 py-20">
                          <Star className="w-16 h-16 opacity-10 text-slate-600" />
                          <p className="font-black uppercase tracking-widest text-sm text-slate-600">
                            {searchQuery ? `No results for "${searchQuery}"` : "Awaiting Tabulation"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Predictor */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 overflow-hidden premium-shadow">
            <CardHeader className="bg-slate-950/50 border-b border-slate-800 p-6">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-white uppercase tracking-tight">
                <BrainCircuit className="text-primary w-5 h-5" />
                Live Predictor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Team A</label>
                  <Select onValueChange={setTeamAId}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {predictorTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}{t.sport ? ` · ${t.sport}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center"><Swords className="text-slate-700 w-5 h-5" /></div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Team B</label>
                  <Select onValueChange={setTeamBId}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {predictorTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}{t.sport ? ` · ${t.sport}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handlePredict}
                  disabled={isPredicting || !teamAId || !teamBId}
                  className="w-full h-12 rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/20"
                >
                  {isPredicting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Run Simulation"}
                </Button>
              </div>

              {prediction && (
                <div className="pt-6 border-t border-slate-800 animate-in fade-in slide-in-from-top-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-[9px] uppercase">Prediction</Badge>
                      <span className="text-[10px] font-black text-slate-500 uppercase">{prediction.confidenceScore}% Confidence</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-relaxed">"{prediction.prediction}"</p>
                    <div className="pt-2">
                      <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Expected Winner</p>
                      <p className="text-lg font-black text-primary">{prediction.predictedWinner}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-8 mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">Official Tabulation Report</h1>
        <p className="text-slate-500 mt-2 font-bold uppercase tracking-tight">Tournament Standings & Performance Metrics</p>
        <div className="flex justify-between mt-8 text-xs font-bold uppercase text-slate-400">
          <span>Date: {new Date().toLocaleDateString()}</span>
          <span>Verified By: ArenaLeader Automated System</span>
        </div>
      </div>

      <div className="hidden print:block">
        <Table className="border border-slate-200">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="font-bold">Rank</TableHead>
              <TableHead className="font-bold">Team</TableHead>
              <TableHead className="font-bold">Sport</TableHead>
              <TableHead className="text-center font-bold">GP</TableHead>
              <TableHead className="text-center font-bold">W</TableHead>
              <TableHead className="text-center font-bold">L</TableHead>
              <TableHead className="text-center font-bold">D</TableHead>
              <TableHead className="text-center font-bold">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team, index) => (
              <TableRow key={team.id}>
                <TableCell className="font-bold">{index + 1}</TableCell>
                <TableCell className="font-bold">{team.name}</TableCell>
                <TableCell>{team.sport || "—"}</TableCell>
                <TableCell className="text-center">{team.gp}</TableCell>
                <TableCell className="text-center">{team.wins}</TableCell>
                <TableCell className="text-center">{team.losses}</TableCell>
                <TableCell className="text-center">{team.draws}</TableCell>
                <TableCell className="text-center font-black">{team.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-slate-950 rounded-[2.5rem] text-white print:bg-white print:text-slate-900 print:border print:border-slate-200">
        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Official Legend</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1 border-l-2 border-slate-800 pl-4 print:border-slate-200">
              <p className="text-[10px] font-black uppercase text-slate-500">GP / W / L / D</p>
              <p className="text-sm font-bold">Games Played, Win, Loss, Draw</p>
            </div>
            <div className="space-y-1 border-l-2 border-slate-800 pl-4 print:border-slate-200">
              <p className="text-[10px] font-black uppercase text-slate-500">Validation</p>
              <p className="text-sm font-bold">Automated Mathematical Verification</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center md:items-end">
          <div className="text-center md:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Certification</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500 justify-end print:text-slate-600">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-bold">Generated by ArenaLeader Automated Tabulation Engine v1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
