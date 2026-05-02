
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Swords, Clock, ChevronRight, Calculator, FileCheck, ShieldAlert, PlusCircle, UserCheck, ShieldCheck, AlertTriangle, User as UserIcon, BarChart3, Star } from "lucide-react";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { Team, Match } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const AUTHORIZED_ADMIN_EMAIL = "admin@Sports.com";

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const adminDocRef = useMemoFirebase(() => 
    user ? doc(firestore, "roles_admin", user.uid) : null,
    [firestore, user]
  );
  const { data: adminData, isLoading: adminLoading } = useDoc(adminDocRef);
  
  const isAdmin = !!adminData;
  const isAuthorizedPending = user?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() && !isAdmin;

  const teamsQuery = useMemoFirebase(() => 
    query(collection(firestore, "teams"), orderBy("points", "desc"), limit(4)),
    [firestore]
  );
  
  const allTeamsQuery = useMemoFirebase(() => 
    collection(firestore, "teams"),
    [firestore]
  );

  const eventsQuery = useMemoFirebase(() => collection(firestore, "judged_events"), [firestore]);
  const { data: allEvents } = useCollection<{ id: string; status: string }>(eventsQuery as any);

  const recentMatchesQuery = useMemoFirebase(() => 
    query(collection(firestore, "matches"), orderBy("date", "desc"), limit(6)),
    [firestore]
  );
  const { data: topTeams, isLoading: teamsLoading } = useCollection<Team>(teamsQuery);
  const { data: allTeams } = useCollection<Team>(allTeamsQuery);
  const { data: recentMatches, isLoading: matchesLoading } = useCollection<Match>(recentMatchesQuery);

  const stats = {
    totalTeams: allTeams?.length || 0,
    totalMatches: recentMatches?.length || 0,
    totalEvents: allEvents?.length || 0,
    ongoingEvents: (allEvents || []).filter((e) => e.status === "ongoing").length,
    activeLeader: topTeams?.[0]?.name || "None"
  };

  const chartData = topTeams?.map(team => ({
    name: team.name,
    points: team.points
  })) || [];

  const getTeamName = (id: string) => allTeams?.find(t => t.id === id)?.name || "Unknown";

  if (isUserLoading || adminLoading || teamsLoading || matchesLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-8">
          <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full" />
          <div className="space-y-2 text-center md:text-left">
            <Skeleton className="h-4 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-8 w-64 mx-auto md:mx-0" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
          <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 bg-slate-900/60 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left w-full md:w-auto">
          <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-primary/20 shadow-2xl ring-4 ring-black/50 shrink-0">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="bg-primary text-white text-3xl font-black uppercase">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || <UserIcon className="w-10 h-10" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2">
              Welcome back, {user?.displayName || "Official"}
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white truncate">
              {isAdmin ? "Tabulation Center" : "Viewer Portal"}
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 mt-4">
              {isAdmin ? (
                <Badge className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary/20 text-primary border-primary/30 gap-2 font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg shadow-primary/10">
                  <ShieldCheck className="w-4 h-4" /> Verified Official Status
                </Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1 md:px-4 md:py-1.5 rounded-full border-slate-800 text-slate-500 gap-2 font-black uppercase text-[9px] md:text-[10px] tracking-widest bg-slate-900/50">
                  <ShieldAlert className="w-4 h-4" /> Viewer Access Mode
                </Badge>
              )}
              <span className="text-[10px] md:text-[11px] font-black text-slate-600 uppercase tracking-widest truncate max-w-full">{user?.email}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto">
          <Button variant="secondary" asChild className="w-full md:w-auto rounded-2xl md:px-10 h-12 md:h-14 font-black bg-slate-800 hover:bg-slate-700 text-white shadow-2xl transition-all hover:scale-105 active:scale-95">
            <Link href="/standings">
              View All Standings <ChevronRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {isAuthorizedPending && (
        <Card className="rounded-[2rem] md:rounded-[3rem] border-none bg-amber-900/20 border-l-8 border-l-amber-500 overflow-hidden shadow-2xl animate-bounce-subtle">
          <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
              <div className="p-4 md:p-6 bg-amber-500 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-amber-500/30">
                <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-black" />
              </div>
              <div>
                <h4 className="font-black text-white text-xl md:text-2xl uppercase tracking-tight">Administrative Activation Required</h4>
                <p className="text-amber-200/60 text-sm md:text-lg font-medium mt-2">
                  Complete identity verification to unlock management tools.
                </p>
              </div>
            </div>
            <Button asChild className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl h-14 md:h-16 px-10 md:px-12 shadow-2xl shadow-amber-500/20 text-md md:text-lg">
              <Link href="/admin-setup">Initialize Official Role</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          <Card className="rounded-[2rem] md:rounded-[3rem] border-none bg-slate-900 hover:bg-slate-800/80 transition-all border border-white/10 group cursor-pointer premium-shadow hover:-translate-y-1" asChild>
            <Link href="/teams">
              <CardContent className="p-6 md:p-10 flex items-center gap-6">
                <div className="p-4 bg-blue-900/40 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/5">
                  <PlusCircle className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg md:text-xl">Register Team</h4>
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mt-1">Manage Roster</p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="rounded-[2rem] md:rounded-[3rem] border-none bg-slate-900 hover:bg-slate-800/80 transition-all border border-white/10 group cursor-pointer premium-shadow hover:-translate-y-1" asChild>
            <Link href="/matches">
              <CardContent className="p-6 md:p-10 flex items-center gap-6">
                <div className="p-4 bg-primary/20 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-lg shadow-primary/5">
                  <Calculator className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg md:text-xl">Encode Score</h4>
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mt-1">Official Tabulation</p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="rounded-[2rem] md:rounded-[3rem] border-none bg-slate-900 hover:bg-slate-800/80 transition-all border border-white/10 group cursor-pointer premium-shadow hover:-translate-y-1" asChild>
            <Link href="/events">
              <CardContent className="p-6 md:p-10 flex items-center gap-6">
                <div className="p-4 bg-amber-900/30 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/5">
                  <Star className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg md:text-xl">Events</h4>
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mt-1">Judged Scoring</p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="rounded-[2rem] md:rounded-[3rem] border-none bg-slate-900 hover:bg-slate-800/80 transition-all border border-white/10 group cursor-pointer premium-shadow hover:-translate-y-1" asChild>
            <Link href="/officials">
              <CardContent className="p-6 md:p-10 flex items-center gap-6">
                <div className="p-4 bg-indigo-900/40 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/5">
                  <UserCheck className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg md:text-xl">Verify Officials</h4>
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mt-1">Identity Registry</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-sm bg-slate-900 premium-shadow border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-6 md:p-8">
            <CardTitle className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Validated Roster</CardTitle>
            <div className="p-2.5 bg-blue-900/20 rounded-xl"><Users className="w-5 h-5 text-blue-400" /></div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="text-4xl md:text-5xl font-black text-white">{stats.totalTeams}</div>
            <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Participating Teams</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-sm bg-slate-900 premium-shadow border-l-8 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-6 md:p-8">
            <CardTitle className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Rank 1 Leader</CardTitle>
            <div className="p-2.5 bg-amber-900/20 rounded-xl"><Trophy className="w-5 h-5 text-amber-500" /></div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="text-4xl md:text-5xl font-black text-white truncate">{stats.activeLeader}</div>
            <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Tournament Leader</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-sm bg-slate-900 premium-shadow border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-6 md:p-8">
            <CardTitle className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Encoded Entries</CardTitle>
            <div className="p-2.5 bg-indigo-900/20 rounded-xl"><FileCheck className="w-5 h-5 text-indigo-400" /></div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="text-4xl md:text-5xl font-black text-white">{stats.totalMatches}</div>
            <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">Verified Results</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-sm bg-slate-900 premium-shadow border border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-6 md:p-8">
            <CardTitle className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Events</CardTitle>
            <div className="p-2.5 bg-amber-900/20 rounded-xl"><Star className="w-5 h-5 text-amber-400" /></div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="text-4xl md:text-5xl font-black text-white">{stats.totalEvents}</div>
            <p className="text-[10px] text-slate-500 mt-2 uppercase font-black tracking-widest">
              {stats.ongoingEvents > 0 ? `${stats.ongoingEvents} Ongoing` : "Judged Events"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <Card className="lg:col-span-2 rounded-[2rem] md:rounded-[3.5rem] border-none premium-shadow bg-slate-900 overflow-hidden border border-white/5" asChild>
          <div>
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 md:p-10 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-4 text-xl md:text-3xl font-black text-white tracking-tighter">
                <BarChart3 className="text-primary w-8 h-8 md:w-10 md:h-10" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-10">
              <div className="h-[250px] md:h-[350px] w-full">
                <ChartContainer config={{
                  points: { label: "Points", color: "hsl(var(--primary))" }
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="name" 
                        stroke="#475569" 
                        fontSize={10} 
                        fontWeight="black" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ dy: 10 }}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        fontWeight="black" 
                        axisLine={false} 
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar 
                        dataKey="points" 
                        radius={[10, 10, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "#1e293b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="rounded-[2rem] md:rounded-[3.5rem] border-none premium-shadow bg-slate-900 overflow-hidden border border-white/5">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 md:p-10">
            <CardTitle className="flex items-center gap-4 text-xl md:text-2xl font-black text-white tracking-tighter">
              <Clock className="text-indigo-400 w-6 h-6 md:w-8 md:h-8" />
              Latest Trace
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="space-y-4 md:space-y-6">
              {recentMatches && recentMatches.length > 0 ? (
                recentMatches.slice(0, 5).map((match) => (
                  <div key={match.id} className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-slate-950/50 group hover:bg-slate-900 transition-all duration-300">
                    <div className="flex items-center justify-between text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
                      <span>{match.date}</span>
                      <Badge variant="outline" className="text-[8px] px-2 py-0 border-slate-800 text-slate-600">Verified</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4 font-black text-white text-sm md:text-base">
                      <span className="truncate flex-1 text-right group-hover:text-primary transition-colors">{getTeamName(match.teamAId)}</span>
                      <div className="px-3 py-1 md:px-5 md:py-2 bg-slate-900 rounded-xl md:rounded-2xl text-primary font-mono text-lg md:text-xl font-black ring-1 ring-white/5">
                        {match.scoreA}:{match.scoreB}
                      </div>
                      <span className="truncate flex-1 group-hover:text-primary transition-colors">{getTeamName(match.teamBId)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 md:py-24 text-center opacity-30">
                  <Swords className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-slate-700" />
                  <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-slate-600">Awaiting First Match</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2rem] md:rounded-[3.5rem] border-none premium-shadow bg-slate-900 overflow-hidden border border-white/5">
        <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6 md:p-10">
          <CardTitle className="flex items-center gap-4 text-2xl md:text-3xl font-black text-white tracking-tighter">
            <Calculator className="text-primary w-8 h-8 md:w-10 md:h-10" />
            Live Ranking Tabulation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {topTeams && topTeams.length > 0 ? (
              topTeams.map((team, index) => (
                <div key={team.id} className="group flex items-center justify-between p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-slate-800/40 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-500 shadow-xl">
                  <div className="flex items-center gap-4 md:gap-8">
                    <div className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] font-black text-xl md:text-2xl ${
                      index === 0 ? "bg-amber-500 text-black shadow-2xl shadow-amber-500/30" : "bg-slate-950 text-slate-500 border border-white/5"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-lg md:text-2xl font-black text-white group-hover:text-primary transition-colors block leading-none truncate max-w-[120px] md:max-w-none">{team.name}</span>
                      <div className="flex flex-wrap gap-2 md:gap-3 text-[9px] md:text-[11px] uppercase font-black text-slate-500 mt-2 md:mt-3 tracking-widest items-center">
                        {team.sport && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-black uppercase border border-slate-700">{team.sport}</span>
                        )}
                        <span className="flex items-center gap-1"><div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-500" /> W: {team.wins}</span>
                        <span className="flex items-center gap-1"><div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-red-500" /> L: {team.losses}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl md:text-4xl font-black text-primary tracking-tighter">{team.points}</div>
                    <div className="text-[9px] md:text-[11px] uppercase font-black text-slate-600 tracking-[0.4em] mt-1">Pts</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-24 md:py-32 text-center">
                <p className="text-slate-700 font-black uppercase tracking-[0.3em] md:tracking-[0.4em]">No results found for tabulation.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
