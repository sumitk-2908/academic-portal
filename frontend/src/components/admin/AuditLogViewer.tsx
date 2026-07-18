"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/api/core";
import { Clock, CheckCircle, Trash2, ShieldAlert, FileText, User } from "lucide-react";

type AuditLog = {
  id: string;
  admin_id: string;
  action: 'approve' | 'reject' | 'delete' | 'dismiss_flags';
  target_id: number;
  metadata: any;
  created_at: string;
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('admin_audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setLogs(data as unknown as AuditLog[]);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  const getActionIcon = (action: string) => {
    switch(action) {
      case 'approve': return <CheckCircle className="size-4 text-success" />;
      case 'reject': return <Trash2 className="size-4 text-destructive" />;
      case 'dismiss_flags': return <ShieldAlert className="size-4 text-warning" />;
      default: return <FileText className="size-4 text-muted" />;
    }
  };

  const getActionText = (action: string) => {
    switch(action) {
      case 'approve': return 'Approved document';
      case 'reject': return 'Rejected document';
      case 'delete': return 'Deleted document';
      case 'dismiss_flags': return 'Dismissed flags on document';
      default: return action;
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-surface-hover/50" />)}
    </div>;
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
        No recent administrative actions logged.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm transition-colors hover:bg-surface-hover">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background border border-border">
            {getActionIcon(log.action)}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">
                {getActionText(log.action)} #{log.target_id}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                <Clock className="size-3" />
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            {log.metadata?.reason && (
              <p className="mt-1 text-muted italic">Reason: {log.metadata.reason}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <User className="size-3" />
              <span className="font-mono text-[10px]">{log.admin_id}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
