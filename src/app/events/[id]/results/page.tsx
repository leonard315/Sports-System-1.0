"use client";

import { useMemo } from "react";
import { collection, doc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { JudgedEvent, EventParticipant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, Trophy, Star, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-blue-900/20 text-blue-400",
  ongoing: "bg-green-900/20 text-green-400",
  completed: "bg-slate-700/40 text-slate-400",
};

export default function EventResultsPage() {
  const { id } = useParams<{ id: string }>();
  const firestore = useFirestore();

  const eventRef = useMemoFirebase(() => doc(firestore, "judged_events", id), [firestore, id]);
  const { data: event } = useDoc<JudgedEvent>(eventRef);

  const participantsQuery = useMemoFirebase(() =>
    query(collection(firestore, "event_participants"), where("eventId", "==", id)),
    [firestore, id]
  );
  const { data: participants } = useCollection<EventParticipant>(participantsQuery);

  const ranked = useMemo(() => {
    if (!participants) return [];
    return [...participants].sort((a, b) => b.totalScore - a.totalScore);
  }, [participants]);

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 font-black uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Screen nav — hidden in print */}
      <div className="no-print flex flex-col gap-4">
        <Link href={`/events/${id}`}>
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 text-slate-500 hover:text-white font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Score Encoding
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-white">Results & Report</h2>
            <p className="text-slate-400 font-medium mt-1">Live results matrix, standings, and printable report.</p>
          </div>
          <Button onClick={() => window.print()} className="h-12 px-8 font-bold gap-3 rounded-2xl bg-primary">
            <Printer className="w-5 h-5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Event info card */}
      <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow no-print">
        <CardContent className="p-6 flex flex-wrap gap-4 items-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-white">{event.name}</h3>
            <div className="flex flex-wrap gap-3 mt-1">
              <Badge className="bg-indigo-900/20 text-indigo-400 border-none font-black text-[10px] uppercase px-3">{event.category}</Badge>
              <Badge className={`border-none font-black text-[10px] uppercase px-3 ${STATUS_STYLES[event.status]}`}>{event.status}</Badge>
              <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><Calendar className="w-3 h-3" />{event.date}</span>
              <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><Users className="w-3 h-3" />{event.judges.length} judges</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── LIVE RESULTS MATRIX ── */}
      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow no-print">
        <CardHeader className="border-b border-slate-800 bg-slate-950/50 p-6 md:p-8">
          <CardTitle className="text-xl font-black text-white">Live Results Matrix</CardTitle>
          <p className="text-slate-500 text-sm font-medium mt-1">All judge scores per participant in one view.</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-5 pl-8 text-slate-500 min-w-[160px]">Rank</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-5 text-slate-500 min-w-[160px]">Participant</TableHead>
                {event.judges.map((judge, i) => (
                  <TableHead key={i} className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-5 text-slate-500 min-w-[110px]">
                    {judge}
                  </TableHead>
                ))}
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-5 text-primary min-w-[100px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.length > 0 ? (
                ranked.map((p, index) => (
                  <TableRow key={p.id} className={`border-slate-800/50 ${index === 0 ? "bg-amber-900/10" : index % 2 === 0 ? "bg-slate-900" : "bg-slate-800/20"}`}>
                    <TableCell className="pl-8 py-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                        index === 0 ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-400"
                      }`}>
                        {index === 0 ? <Trophy className="w-4 h-4" /> : index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`font-black text-base ${index === 0 ? "text-amber-400" : "text-slate-200"}`}>{p.name}</span>
                    </TableCell>
                    {event.judges.map((_, i) => (
                      <TableCell key={i} className="text-center py-4">
                        <span className="font-bold text-slate-300">
                          {p.scores?.[String(i)] !== undefined ? Number(p.scores[String(i)]).toFixed(2) : "—"}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center py-4">
                      <span className="text-xl font-black text-primary">{p.totalScore.toFixed(2)}</span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={event.judges.length + 3} className="h-32 text-center text-slate-600 font-black uppercase tracking-widest text-sm">
                    No scores encoded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── STANDINGS CARD ── */}
      {ranked.length > 0 && (
        <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow no-print">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6">
            <CardTitle className="flex items-center gap-3 text-lg font-black text-white">
              <Trophy className="w-5 h-5 text-amber-400" />
              Final Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ranked.map((p, index) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  index === 0 ? "bg-amber-900/20 border-amber-900/40" :
                  index === 1 ? "bg-slate-700/20 border-slate-700/40" :
                  index === 2 ? "bg-orange-900/10 border-orange-900/20" :
                  "bg-slate-800/30 border-slate-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                      index === 0 ? "bg-amber-500 text-black" :
                      index === 1 ? "bg-slate-400 text-black" :
                      index === 2 ? "bg-orange-700 text-white" :
                      "bg-slate-950 text-slate-400 border border-white/5"
                    }`}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                    </div>
                    <span className="font-black text-white text-sm truncate max-w-[120px]">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-primary">{p.totalScore.toFixed(2)}</div>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">pts</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PRINT-ONLY DOCUMENT — only visible when printing
      ══════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block space-y-8">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-6">
          <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">Official Results Report</h1>
          <h2 className="text-xl font-bold text-slate-700 mt-2">{event.name}</h2>
          <div className="flex justify-center gap-8 mt-4 text-sm font-bold text-slate-500 uppercase">
            <span>Category: {event.category}</span>
            <span>Date: {event.date}</span>
            <span>Status: {event.status}</span>
          </div>
          <div className="flex justify-between mt-6 text-xs font-bold uppercase text-slate-400">
            <span>Printed: {new Date().toLocaleString()}</span>
            <span>ArenaLeader Automated Tabulation Engine v1.0</span>
          </div>
        </div>

        {/* Judges list */}
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Panel of Judges</p>
          <div className="flex flex-wrap gap-2">
            {event.judges.map((j, i) => (
              <span key={i} className="px-3 py-1 border border-slate-300 rounded text-sm font-bold text-slate-700">{j}</span>
            ))}
          </div>
        </div>

        {/* Results matrix */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Score Matrix</p>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-left font-black">Rank</th>
                <th className="border border-slate-300 px-3 py-2 text-left font-black">Participant</th>
                {event.judges.map((judge, i) => (
                  <th key={i} className="border border-slate-300 px-3 py-2 text-center font-black">{judge}</th>
                ))}
                <th className="border border-slate-300 px-3 py-2 text-center font-black text-slate-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, index) => (
                <tr key={p.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border border-slate-300 px-3 py-2 font-black text-center">{index + 1}</td>
                  <td className="border border-slate-300 px-3 py-2 font-bold">{p.name}</td>
                  {event.judges.map((_, i) => (
                    <td key={i} className="border border-slate-300 px-3 py-2 text-center">
                      {p.scores?.[String(i)] !== undefined ? Number(p.scores[String(i)]).toFixed(2) : "—"}
                    </td>
                  ))}
                  <td className="border border-slate-300 px-3 py-2 text-center font-black">{p.totalScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final standings */}
        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Final Rankings</p>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-center font-black">Rank</th>
                <th className="border border-slate-300 px-3 py-2 text-left font-black">Participant / Team</th>
                <th className="border border-slate-300 px-3 py-2 text-center font-black">Total Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, index) => (
                <tr key={p.id} className={index === 0 ? "bg-yellow-50" : index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border border-slate-300 px-3 py-2 text-center font-black">
                    {index === 0 ? "🥇 1st" : index === 1 ? "🥈 2nd" : index === 2 ? "🥉 3rd" : `${index + 1}th`}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-bold">{p.name}</td>
                  <td className="border border-slate-300 px-3 py-2 text-center font-black">{p.totalScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature lines */}
        <div className="mt-12 grid grid-cols-3 gap-8">
          {event.judges.slice(0, 3).map((judge, i) => (
            <div key={i} className="text-center">
              <div className="border-t-2 border-slate-400 pt-2 mt-8">
                <p className="font-black text-slate-700 text-sm">{judge}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Judge Signature</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
