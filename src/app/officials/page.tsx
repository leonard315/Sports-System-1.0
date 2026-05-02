
"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCheck, ShieldCheck, Mail, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfficialsRegistryPage() {
  const firestore = useFirestore();
  
  const officialsQuery = useMemoFirebase(() => 
    query(collection(firestore, "roles_admin"), orderBy("createdAt", "desc")),
    [firestore]
  );

  const { data: officials, isLoading } = useCollection<any>(officialsQuery);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2 text-slate-500 hover:text-white font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white">Officials <span className="text-primary">Registry</span></h2>
          <p className="text-slate-400 font-medium mt-1">Authorized personnel with administrative tabulation privileges.</p>
        </div>
      </div>

      <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-slate-900 premium-shadow">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black border-b border-slate-800">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-6 pl-8 text-slate-500">Official Identity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-6 text-slate-500">Access Channel</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-6 text-slate-500">Role Status</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest py-6 pr-8 text-slate-500">Registry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {officials && officials.length > 0 ? (
                officials.map((official) => (
                  <TableRow key={official.id} className="group transition-colors border-slate-800/50 hover:bg-slate-800/30">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-primary/50 transition-colors">
                          <UserCheck className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="font-black text-slate-100 text-base">{official.displayName || "Official Admin"}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">UID: {official.uid?.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-600" />
                        {official.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase px-3 py-1 gap-1.5">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Official
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                          <Calendar className="w-3 h-3" />
                          {official.createdAt ? new Date(official.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 py-20">
                      <UserCheck className="w-16 h-16 text-slate-800 animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Registry Synchronizing</p>
                        <p className="text-slate-600 text-xs font-medium">Fetching authorized official records from database...</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="font-black text-white text-sm uppercase tracking-wide">Security Audit Protocol</h4>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            The officials listed here have direct write access to the tabulation database. All score entries are cryptographically linked to these identities to ensure 100% audit accuracy and prevent unauthorized data modification.
          </p>
        </div>
      </div>
    </div>
  );
}
