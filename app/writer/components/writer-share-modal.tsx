"use client";

import { useCallback, useEffect, useState } from "react";
import DocumentService from "@/lib/services/document.service";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface WriterShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  documentTitle: string;
}

export default function WriterShareModal({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: WriterShareModalProps) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Fetch teams once modal opens
  useEffect(() => {
    if (!open) return;
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Login required");
        const res = await fetch("/api/collaborate/teams", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load teams");
        const json = await res.json();
        if (json.success) {
          setTeams(
            json.teams.map((t: any) => ({
              id: t.id,
              name: t.name,
              description: t.description,
            }))
          );
        } else throw new Error(json.error || "Error loading teams");
      } catch (e) {
        toast({
          title: "Error",
          description:
            e instanceof Error ? e.message : "Could not fetch your teams.",
          variant: "destructive",
        });
      } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeams();
  }, [open, toast]);

  const toggleTeam = (id: string) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleShare = useCallback(async () => {
    if (!documentId) {
      toast({
        title: "Save document first",
        description: "Document must be saved before sharing.",
        variant: "destructive",
      });
      return;
    }
    if (selectedTeams.size === 0) {
      toast({ title: "Select a team" });
      return;
    }
    try {
      setSharing(true);

      // 1. Export current document as Markdown blob
      const blob = await DocumentService.getInstance().exportDocument(
        documentId!,
        "markdown"
      );
      const fileNameSafe = documentTitle
        .trim()
        .replace(/[^a-z0-9\-]+/gi, "_")
        .slice(0, 50);
      const fileExt = "md";
      const fileBaseName = `${fileNameSafe || "document"}.${fileExt}`;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Login required");

      // Loop through selected teams and process sequentially to simplify error handling
      for (const teamId of selectedTeams) {
        // 2. Upload file to Supabase Storage under documents bucket (teams/<id>/...)
        const storagePath = `teams/${teamId}/${uuidv4()}-${fileBaseName}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, blob, {
            contentType: "text/markdown",
            upsert: false,
            cacheControl: "3600",
          });
        if (uploadError) throw new Error(uploadError.message);

        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(storagePath);

        // 3. Register file in Collaborate Files for the team
        await fetch("/api/collaborate/files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            teamId,
            type: "file",
            name: fileBaseName,
            url: publicUrl,
            fileType: "text/markdown",
            fileSize: blob.size,
            description: `Shared from Writer page`,
            isPublic: false,
          }),
        });

        // 4. Post system chat message with file reference
        await fetch("/api/collaborate/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            teamId,
            content: `📎 *${documentTitle}* uploaded: ${publicUrl}`,
            type: "system",
          }),
        });
      }

      toast({
        title: "Shared",
        description: "Document uploaded and shared with selected teams.",
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to share document.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  }, [documentId, documentTitle, onOpenChange, selectedTeams, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share with teams</DialogTitle>
        </DialogHeader>
        {loadingTeams ? (
          <p className="text-sm text-muted-foreground">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no teams.</p>
        ) : (
          <ScrollArea className="h-60 pr-3">
            {teams.map((team) => (
              <div key={team.id} className="flex items-start gap-2 py-2">
                <Checkbox
                  checked={selectedTeams.has(team.id)}
                  onCheckedChange={() => toggleTeam(team.id)}
                />
                <div>
                  <p className="font-medium text-sm leading-none">{team.name}</p>
                  {team.description && (
                    <p className="text-xs text-muted-foreground">{team.description}</p>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
        <Separator />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={sharing || loadingTeams || selectedTeams.size === 0}>
            {sharing ? "Sharing..." : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
