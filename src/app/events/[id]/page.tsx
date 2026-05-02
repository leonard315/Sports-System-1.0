"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, doc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { JudgedEvent, EventParticipant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Star, Trophy, Users, Calendar, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-blue-900/20 text-blue-400",
  ongoing: "bg-green-900/20 text-green-400",
  completed: "bg-slate-700/40 text-slate-400",
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Load event
  const eventRef = useMemoFirebase(() => doc(firestore, "judged_events", id), [firestore, id]);
  const { data: event } = useDoc<JudgedEvent>(eventRef);

  // Load participants
  const participantsQuery = useMemoFirebase(() =>
    query(collection(firestore, "event_participants"), where("eventId", "==", id)),
    [firestore, id]
  );
  const { data: participants } = useCollection<EventParticipant>(participantsQuery);

  // Add participant dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Score encoding state: participantId → judgeIndex → score string
  const [scoreInputs, setScoreInputs] = useState<Record<string, Record<number, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Ranked participants
  const ranked = useMemo(() => {
    if (!participants) return [];
    return [...participants].sort((a, b) => b.totalScore - a.totalScore);
  }, [participants]);

  // Initialize score inputs from existing data
  useEffect(() => {
    if (!participants) return;
    const init: Record<string, Record<number, string>> = {};
    participants.forEach((p) => {
      init[p.id] = {};
      (event?.judges || []).forEach((_, i) => {
        init[p.id][i] = p.scores?.[String(i)] !== undefined ? String(p.scores[String(i)]) : "";
      });
    });
    setScoreInputs(init);
  }, [participants, event?.judges]);

  const handleAddParticipant = () => {
    if (!newName.trim()) return;
    const ref = doc(collection(firestore, "event_participants"));
    setDocumentNonBlocking(ref, {
      id: ref.id,
      eventId: id,
      name: newName.trim(),
      scores: {},
      totalScore: 0,
      createdAt: serverTimestamp(),
    }, { merge: true });
    toast({ title: "Participant Added", description: `${newName} added to the event.` });
    setNewName("");
    setIsAddOpen(false);
  };

  const handleDeleteParticipant = (pid: string, name: string) => {
    if (!confirm(`Remove "${name}" from this event?`)) return;
    deleteDocumentNonBlocking(doc(firestore, "event_participants", pid));
    toast({ title: "Participant Removed" });
  };

  const handleScoreChange = (participantId: string, judgeIndex: number, value: string) => {
    setScoreInputs((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] || {}),
        [judgeIndex]: value,
      },
    }));
  };

  const handleSaveScores = (participant: EventParticipant) => {
    if (!event) return;
    setSavingId(participant.id);

    const inputs = scoreInputs[participant.id] || {};
    const scores: Record<string, number> = {};
    let total = 0;

    event.judges.forEach((_, i) => {
      const val = parseFloat(inputs[i] || "0") || 0;
      scores[String(i)] = val;
      total += val;
    });

    updateDocumentNonBlocking(doc(firestore, "event_participants", participant.id), {
      scores,
      totalScore: total,
    });

    setTimeout(() => setSavingId(null), 800);
    toast({ title: "Scores Saved", description: `${participant.name}: ${total.toFixed(2)} pts` });
  };

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 font-black uppercase tracking-widest">Loading event...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/events">
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 text-slate-500 hover:text-white font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-indigo-900/20 text-indigo-400 border-none font-black text-[10px] uppercase px-3">{event.category}</Badge>
              <Badge className={`border-none font-black text-[10px] uppercase px-3 ${STATUS_STYLES[event.status]}`}>{event.status}</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{event.name}</h2>
            <div className="flex flex-wrap gap-4 text-slate-400 text-sm font-bold">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{event.date}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{event.judges.length} Judge{event.judges.length !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4" />{participants?.length || 0} Participant{(participants?.length || 0) !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 text-md font-bold gap-3 rounded-2xl premium-shadow bg-primary shrink-0">
                <Plus className="w-5 h-5" />
                Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white">Add Participant</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Name / Team</label>
                  <Input
                    placeholder="e.g. Team Alpha or Juan dela Cruz"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
                    className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button className="font-black px-8 rounded-xl" onClick={handleAddParticipant}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Judge names reference */}
      <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow">
        <CardContent className="p-6 flex flex-wrap gap-3 items-center">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">Judges:</span>
          {event.judges.map((judge, i) => (
            <Badge key={i} variant="outline" className="border-slate-700 text-slate-300 font-bold text-xs px-3 py-1">
              {judge}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Live Rankings */}
      {ranked.length > 0 && (
        <Card className="rounded-[2rem] border-none bg-slate-900 border border-white/5 premium-shadow overflow-hidden">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50 p-6">
            <CardTitle className="flex items-center gap-3 text-lg font-black text-white">
              <Trophy className="w-5 h-5 text-amber-400" />
              Live Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ranked.map((p, index) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  index === 0 ? "bg-amber-900/20 border-amber-900/40" : "bg-slate-800/40 border-slate-800"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                      index === 0 ? "bg-amber-500 text-black" : "bg-slate-950 text-slate-400 border border-white/5"
                    }`}>
                      {index === 0 ? <Trophy className="w-4 h-4" /> : index + 1}
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

      {/* Score Encoding Table */}
      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardHeader className="border-b border-slate-800 bg-slate-950/50 p-6 md:p-8">
          <CardTitle className="text-xl font-black text-white">Score Encoding</CardTitle>
          <p className="text-slate-500 text-sm font-medium mt-1">Enter each judge's score per participant. Totals update automatically.</p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {participants && participants.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-950/50 border-b border-slate-800">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-5 pl-8 text-slate-500 min-w-[160px]">Participant</TableHead>
                  {event.judges.map((judge, i) => (
                    <TableHead key={i} className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-5 text-slate-500 min-w-[120px]">
                      {judge}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-5 text-primary min-w-[100px]">Total</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-5 pr-8 text-slate-500 min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => {
                  const inputs = scoreInputs[participant.id] || {};
                  const liveTotal = event.judges.reduce((sum, _, i) => {
                    return sum + (parseFloat(inputs[i] || "0") || 0);
                  }, 0);
                  const isSaving = savingId === participant.id;

                  return (
                    <TableRow key={participant.id} className="group border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <TableCell className="pl-8 py-4">
                        <span className="font-black text-slate-200 text-base group-hover:text-primary transition-colors">{participant.name}</span>
                      </TableCell>
                      {event.judges.map((_, i) => (
                        <TableCell key={i} className="text-center py-4 px-3">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={inputs[i] ?? ""}
                            onChange={(e) => handleScoreChange(participant.id, i, e.target.value)}
                            placeholder="0"
                            className="h-10 w-24 mx-auto rounded-xl border-slate-700 bg-slate-950 text-white text-center font-bold text-sm focus-visible:ring-primary"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center py-4">
                        <span className="text-xl font-black text-primary">{liveTotal.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right pr-8 py-4 space-x-1">
                        <Button
                          size="sm"
                          className={`rounded-xl font-black text-xs px-4 transition-all ${isSaving ? "bg-green-600" : "bg-primary"}`}
                          onClick={() => handleSaveScores(participant)}
                          disabled={isSaving}
                        >
                          {isSaving ? "Saved ✓" : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-slate-500 hover:text-destructive hover:bg-red-900/20"
                          onClick={() => handleDeleteParticipant(participant.id, participant.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Users className="w-12 h-12 text-slate-700" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No participants yet</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)} className="rounded-2xl font-black border-slate-800 bg-black text-white hover:bg-slate-900 px-8 h-11">
                <Plus className="w-4 h-4 mr-2" /> Add First Participant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
