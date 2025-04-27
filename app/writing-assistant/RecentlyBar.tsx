import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface RecentItem {
  id: string;
  type: "topic" | "literature" | "idea";
  label: string;
  content: string;
}

interface RecentlyBarProps {
  items: RecentItem[];
  onPaste: (content: string) => void;
}

export function RecentlyBar({ items, onPaste }: RecentlyBarProps) {
  return (
    <aside className="w-80 bg-muted p-4 rounded shadow flex flex-col gap-4">
      <h2 className="text-lg font-bold mb-2">Recently</h2>
      <div>
        <h3 className="font-semibold mb-1">Topics</h3>
        {items.filter(i => i.type === "topic").map(item => (
          <RecentItemCard key={item.id} item={item} onPaste={onPaste} />
        ))}
      </div>
      <div>
        <h3 className="font-semibold mb-1">Literature Review</h3>
        {items.filter(i => i.type === "literature").map(item => (
          <RecentItemCard key={item.id} item={item} onPaste={onPaste} />
        ))}
      </div>
      <div>
        <h3 className="font-semibold mb-1">Ideas</h3>
        {items.filter(i => i.type === "idea").map(item => (
          <RecentItemCard key={item.id} item={item} onPaste={onPaste} />
        ))}
      </div>
    </aside>
  );
}

function RecentItemCard({ item, onPaste }: { item: RecentItem; onPaste: (content: string) => void }) {
  return (
    <div className="bg-white rounded p-2 mb-2 flex items-center justify-between gap-2 shadow-sm border">
      <span className="truncate max-w-[120px]" title={item.content}>{item.label}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(item.content)} title="Copy">
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onPaste(item.content)} title="Paste into Editor">Paste</Button>
      </div>
    </div>
  );
}
