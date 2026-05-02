"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, doc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { JudgedEvent, EventParticipant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Calendar, Users, Gavel, CheckCircle2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-blue-900/20 text-blue-400",
  ongoing: "bg-green-900/20 text-green-400",
  completed: "bg-slate-700/40 text-slate-400",
};

export default function JudgePortalPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // Load judge role doc to get their name
  const judgeRoleRef = useMemoFirebase(
    () => (user ? doc(firestore, "roles_judge", user.uid) : null),
    [firestore, user]
  );
  const { data: judgeRole } = useDoc<{ displayName: string; judgeRegistryId: string }>(judgeRoleRef);

  // Load all events
  const eventsQuery = useMemoFirebase(() => collection(firestore, "judged_events"), [firestore]);
  const { data: allEvents } = useCollection<JudgedEvent>(eventsQuery);

  // Find events assigned to this judge (by name match)
  const judgeName = judgeRole?.displayName || user?.displayName || "";
  const assignedEvents = useMemo(() =>
    (allEvents || []).filter((e) =>
      e.judges.some((jn) => jn.toLowerCase() === judgeName.toLowerCase())
    ),
    [allEvents, judgeName]
  );

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = assignedEvents.find((e) => e.id === selectedEventId) || null;

  // My judge index in the selected event
  const myJudgeIndex = useMemo(() => {
    if (!selectedEvent) return -1;
    return selectedEvent.judges.findIndex(
      (jn) => jn.toLowerCase() === judgeName.toLowerCase()
    );
  }, [selectedEvent, judgeName]);

  // Load participants for selected event
  const participantsQuery = useMemoFirebase(
    () =>
      selectedEventId
        ? query(collection(firestore, "event_participants"), where("eventId", "==", selectedEventId))
        : null,
    [firestore, selectedEventId]
  );
  const { data: participants } = useCollection<EventParticipant>(participantsQuery);

  // Score inputs: participantId → score string
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Initialize from existing scores
  useEffect(() => {
    if (!participants || myJudgeIndex < 0) return;
    const init: Record<string, string> = {};
    participants.forEach((p) => {
      const existing = p.scores?.[String(myJudgeIndex)];
      init[p.id] = existing !== undefined ? String(existing) : "";
    });
    setScoreInputs(init);
  }, [participants, myJudgeIndex]);

  const ranked = useMemo(() => {
    if (!participants) return [];
    return [...participants].sort((a, b) => b.totalScore - a.totalScore);
  }, [participants]);

  const handleSave = (participant: EventParticipant) => {
    if (!selectedEvent || myJudgeIndex < 0) return;
    setSavingId(participant.id);

    const myScore = parseFloat(scoreInputs[participant.id] || "0") || 0;

    // Update only my score key, recalculate total from all existing scores
    const updatedScores = { ...(participant.scores || {}), [String(myJudgeIndex)]: myScore };
    const newTotal = selectedEvent.judges.reduce((sum, _, i) => {
      return sum + (updatedScores[String(i)] || 0);
    }, 0);

    updateDocumentNonBlocking(doc(firestore, "event_participants", participant.id), {
      [`scores.${myJudgeIndex}`]: myScore,
      totalScore: newTotal,
    });

    setTimeout(() => setSavingId(null), 800);
    toast({ title: "Score Saved", description: `${participant.name}: ${myScore.toFixed(2)} pts` });
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-900/30 flex items-center justify-center border border-indigo-900/40">
              <Gavel className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Judge Portal</h1>
              <p className="text-slate-500 text-sm font-bold">{judgeName || user.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-destructive font-black gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Event selector */}
        {!selectedEventId ? (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest">Your Assigned Events</h2>
            {assignedEvents.length === 0 ? (
              <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow">
                <CardContent className="p-12 text-center">
                  <Star className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-black uppercase tracking-widest">No events assigned yet</p>
                  <p className="text-slate-600 text-sm mt-2">Contact the admin to be assigned to an event.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className="text-left p-6 rounded-[2rem] bg-slate-900 border border-white/5 hover:border-primary/40 hover:bg-slate-800/60 transition-all group premium-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <Badge className="bg-indigo-900/20 text-indigo-400 border-none font-black text-[10px] uppercase px-3">{event.category}</Badge>
                        <h3 className="font-black text-white text-lg group-hover:text-primary transition-colors truncate">{event.name}</h3>
                        <div className="flex flex-wrap gap-3 text-slate-400 text-xs font-bold">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.date}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.judges.length} judges</span>
                        </div>
                      </div>
                      <Badge className={`border-none font-black text-[10px] uppercase px-3 shrink-0 ${STATUS_STYLES[event.status]}`}>
                        {event.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back + event info */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelectedEventId(null)}
                className="text-slate-500 hover:text-white font-black text-sm flex items-center gap-2 w-fit transition-colors"
              >
                ← Back to Events
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-indigo-900/20 text-indigo-400 border-none font-black text-[10px] uppercase px-3">{selectedEvent?.category}</Badge>
                <Badge className={`border-none font-black text-[10px] uppercase px-3 ${STATUS_STYLES[selectedEvent?.status || "upcoming"]}`}>
                  {selectedEvent?.status}
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">{selectedEvent?.name}</h2>
              <p className="text-slate-400 text-sm font-bold">
                You are <span className="text-primary">{selectedEvent?.judges[myJudgeIndex]}</span> — enter your scores below.
              </p>
            </div>

            {/* Live rankings (read-only totals) */}
            {ranked.length > 0 && (
              <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-5">
                  <CardTitle className="flex items-center gap-2 text-base font-black text-white">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Current Standings (Live)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ranked.map((p, index) => (
                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                        index === 0 ? "bg-amber-900/20 border-amber-900/40" : "bg-slate-800/30 border-slate-800"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                            index === 0 ? "bg-amber-500 text-black" : "bg-slate-950 text-slate-400"
                          }`}>
                            {index === 0 ? <Trophy className="w-3 h-3" /> : index + 1}
                          </span>
                          <span className="font-black text-white text-xs truncate max-w-[80px]">{p.name}</span>
                        </div>
                        <span className="text-primary font-black text-sm">{p.totalScore.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Score encoding */}
            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
              <CardHeader className="border-b border-slate-800 bg-slate-950/50 p-6">
                <CardTitle className="text-lg font-black text-white">Enter Your Scores</CardTitle>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  You are scoring as: <span className="text-primary font-black">{selectedEvent?.judges[myJudgeIndex]}</span>
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {participants && participants.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-slate-950/50 border-b border-slate-800">
                      <TableRow className="hover:bg-transparent border-0">
                        <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-5 pl-8 text-slate-500">Participant</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-5 text-primary">Your Score</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-5 text-slate-500">Running Total</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-5 pr-8 text-slate-500">Save</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => {
                        const myScore = parseFloat(scoreInputs[participant.id] || "0") || 0;
                        const isSaving = savingId === participant.id;
                        const alreadyScored = participant.scores?.[String(myJudgeIndex)] !== undefined;

                        return (
                          <TableRow key={participant.id} className="group border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                            <TableCell className="pl-8 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-200 text-base group-hover:text-primary transition-colors">{participant.name}</span>
                                {alreadyScored && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={scoreInputs[participant.id] ?? ""}
                                onChange={(e) => setScoreInputs((prev) => ({ ...prev, [participant.id]: e.target.value }))}
                                placeholder="0"
                                className="h-11 w-28 mx-auto rounded-xl border-primary/30 bg-slate-950 text-white text-center font-bold text-base focus-visible:ring-primary"
                              />
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <span className="text-lg font-black text-slate-300">{participant.totalScore.toFixed(2)}</span>
                            </TableCell>
                            <TableCell className="text-right pr-8 py-4">
                              <Button
                                size="sm"
                                className={`rounded-xl font-black text-xs px-5 h-9 transition-all ${isSaving ? "bg-green-600" : "bg-primary"}`}
                                onClick={() => handleSave(participant)}
                                disabled={isSaving}
                              >
                                {isSaving ? "Saved ✓" : "Save"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="h-48 flex items-center justify-center">
                    <p className="text-slate-600 font-black uppercase tracking-widest text-sm">No participants yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
