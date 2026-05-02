"use client";

import { useState, useMemo, useEffect } from "react";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { JudgedEvent, EVENT_CATEGORIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, ArrowLeft, Star, Search, X, ChevronRight, Users, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-blue-900/20 text-blue-400",
  ongoing: "bg-green-900/20 text-green-400",
  completed: "bg-slate-700/40 text-slate-400",
};

const TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const BLANK_FORM = () => ({
  name: "",
  category: "Cheerdance",
  date: "",
  judgeCount: 3,
  judges: ["Judge 1", "Judge 2", "Judge 3"],
  status: "upcoming" as JudgedEvent["status"],
});

export default function EventsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const eventsQuery = useMemoFirebase(() => collection(firestore, "judged_events"), [firestore]);
  const { data: events } = useCollection<JudgedEvent>(eventsQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<JudgedEvent | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  // Set today's date client-side only to avoid SSR hydration mismatch
  useEffect(() => {
    setForm((f) => ({ ...f, date: TODAY() }));
  }, []);

  const updateJudgeCount = (count: number) => {
    const clamped = Math.max(1, Math.min(10, count));
    const judges = Array.from({ length: clamped }, (_, i) =>
      form.judges[i] || `Judge ${i + 1}`
    );
    setForm((f) => ({ ...f, judgeCount: clamped, judges }));
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const ref = doc(collection(firestore, "judged_events"));
    setDocumentNonBlocking(ref, {
      id: ref.id,
      name: form.name.trim(),
      category: form.category,
      date: form.date || TODAY(),
      judges: form.judges,
      status: form.status,
      createdAt: serverTimestamp(),
    }, { merge: true });
    toast({ title: "Event Created", description: `${form.name} is ready for scoring.` });
    setForm({ ...BLANK_FORM(), date: TODAY() });
    setIsAddOpen(false);
  };

  const handleEdit = () => {
    if (!editingEvent || !editingEvent.name.trim()) return;
    updateDocumentNonBlocking(doc(firestore, "judged_events", editingEvent.id), {
      name: editingEvent.name,
      category: editingEvent.category,
      date: editingEvent.date,
      judges: editingEvent.judges,
      status: editingEvent.status,
    });
    toast({ title: "Event Updated" });
    setIsEditOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All participant scores for this event will also be removed.`)) return;
    deleteDocumentNonBlocking(doc(firestore, "judged_events", id));
    toast({ title: "Event Deleted" });
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
            <h2 className="text-4xl font-black tracking-tight text-white">Events</h2>
            <p className="text-slate-400 font-medium mt-1">Manage judged events, categories, and score encoding.</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-8 text-md font-bold gap-3 rounded-2xl premium-shadow bg-primary">
                <Plus className="w-5 h-5" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white">Create New Event</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Event Name</label>
                  <Input placeholder="e.g. Cheerdance Competition 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Category</label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Date</label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JudgedEvent["status"] })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Judges</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateJudgeCount(form.judgeCount - 1)} className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black hover:bg-slate-700 transition-colors">−</button>
                      <span className="text-white font-black w-4 text-center">{form.judgeCount}</span>
                      <button onClick={() => updateJudgeCount(form.judgeCount + 1)} className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black hover:bg-slate-700 transition-colors">+</button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {form.judges.map((judge, i) => (
                      <Input
                        key={i}
                        value={judge}
                        onChange={(e) => {
                          const updated = [...form.judges];
                          updated[i] = e.target.value;
                          setForm({ ...form, judges: updated });
                        }}
                        placeholder={`Judge ${i + 1}`}
                        className="h-10 rounded-xl border-slate-800 bg-slate-950 text-white text-sm"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button className="font-black px-8 rounded-xl" onClick={handleAdd}>Create Event</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <Input
          placeholder='Search by event name, category, or status...'
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

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {["All", ...EVENT_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSearchQuery(cat === "All" ? "" : cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
              (cat === "All" && !searchQuery) || searchQuery.toLowerCase() === cat.toLowerCase()
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events table */}
      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/50 border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-black uppercase text-[10px] tracking-[0.2em] py-6 pl-8 text-slate-500">Event</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Category</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Date</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Judges</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-[0.2em] py-6 text-slate-500">Status</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-[0.2em] py-6 pr-8 text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="group transition-colors border-slate-800/50 hover:bg-slate-800/30">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Star className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-slate-200 text-base group-hover:text-primary transition-colors">{event.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{event.judges.length} judge{event.judges.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-indigo-900/20 text-indigo-400 border-none font-black text-[10px] uppercase px-3">{event.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold text-xs">
                        <Calendar className="w-3 h-3" />
                        {event.date}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold text-xs">
                        <Users className="w-3 h-3" />
                        {event.judges.length}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`border-none font-black text-[10px] uppercase px-3 ${STATUS_STYLES[event.status]}`}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8 space-x-1">
                      <Link href={`/events/${event.id}`}>
                        <Button variant="ghost" size="icon" className="rounded-xl transition-all text-slate-500 hover:text-primary">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="rounded-xl transition-all text-slate-500 hover:text-primary"
                        onClick={() => { setEditingEvent({ ...event }); setIsEditOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl transition-all text-slate-500 hover:text-destructive"
                        onClick={() => handleDelete(event.id, event.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-[400px] text-center bg-slate-900/30">
                    <div className="flex flex-col items-center justify-center gap-6">
                      <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                        <Star className="w-10 h-10 text-slate-600" />
                      </div>
                      <div className="space-y-2">
                        {searchQuery ? (
                          <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-base">No events for "{searchQuery}"</p>
                        ) : (
                          <>
                            <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-base">No events yet</p>
                            <p className="text-slate-500 text-sm font-medium">Create your first judged event to start scoring.</p>
                          </>
                        )}
                      </div>
                      {!searchQuery && (
                        <Button variant="outline" onClick={() => setIsAddOpen(true)} className="rounded-2xl font-black mt-4 border-slate-800 bg-black text-white hover:bg-slate-900 hover:text-white px-8 h-12 transition-all shadow-xl">
                          <Plus className="w-5 h-5 mr-2" /> Create Event
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
        <DialogContent className="rounded-[2rem] p-8 border-none premium-shadow bg-slate-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Event Name</label>
                <Input value={editingEvent.name} onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Category</label>
                  <Select value={editingEvent.category} onValueChange={(v) => setEditingEvent({ ...editingEvent, category: v })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Date</label>
                  <Input type="date" value={editingEvent.date} onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Status</label>
                <Select value={editingEvent.status} onValueChange={(v) => setEditingEvent({ ...editingEvent, status: v as JudgedEvent["status"] })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-800 bg-slate-950 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Judge Names</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editingEvent.judges.map((judge, i) => (
                    <Input
                      key={i}
                      value={judge}
                      onChange={(e) => {
                        const updated = [...editingEvent.judges];
                        updated[i] = e.target.value;
                        setEditingEvent({ ...editingEvent, judges: updated });
                      }}
                      placeholder={`Judge ${i + 1}`}
                      className="h-10 rounded-xl border-slate-800 bg-slate-950 text-white text-sm"
                    />
                  ))}
                </div>
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
