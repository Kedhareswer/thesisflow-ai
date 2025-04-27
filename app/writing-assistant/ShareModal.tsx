"use client";
import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (email: string, permission: "viewer" | "editor") => void;
}

export function ShareModal({ open, onOpenChange, onShare }: ShareModalProps) {
  const [email, setEmail] = React.useState("");
  const [permission, setPermission] = React.useState<"viewer" | "editor">("viewer");

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onShare(email, permission);
    setEmail("");
    setPermission("viewer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Invite someone to view or edit this document. Set their permission below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleShare} className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Select value={permission} onValueChange={v => setPermission(v as "viewer" | "editor") }>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="submit" className="w-full">Send Invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
