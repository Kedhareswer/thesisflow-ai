import { supabase } from "@/integrations/supabase/client";
import type { Citation, FormattedCitation } from "@/lib/services/citation.service";
import { citationService } from "@/lib/services/citation.service";

export interface CitationItem {
  id: string;
  title?: string;
  year?: string;
  doi?: string;
  url?: string;
  journal?: string;
  csl_json?: any;
  styles?: any;
  collection_id?: string | null;
  created_at?: string;
}

export interface CitationCollection {
  id: string;
  name: string;
  created_at?: string;
}

export const bibliographyService = {
  async getUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  },

  async listCollections(): Promise<CitationCollection[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("citation_collections")
      .select("id,name,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as any[]) || [];
  },

  async createCollection(name: string): Promise<CitationCollection | null> {
    const userId = await this.getUserId();
    if (!userId) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("citation_collections")
      .insert({ name, user_id: userId })
      .select("id,name,created_at")
      .single();
    if (error) throw new Error(error.message);
    return data as any;
  },

  async renameCollection(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from("citation_collections")
      .update({ name })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteCollection(id: string): Promise<void> {
    const { error } = await supabase
      .from("citation_collections")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listItems(collectionId: string | null): Promise<CitationItem[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    let query = supabase
      .from("citation_items")
      .select("id,title,year,doi,url,journal,csl_json,styles,collection_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (collectionId) query = query.eq("collection_id", collectionId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as any[]) || [];
  },

  async addItem(citation: Citation, formatted: FormattedCitation, collectionId: string | null): Promise<CitationItem | null> {
    const userId = await this.getUserId();
    if (!userId) throw new Error("Not authenticated");
    const csl = citationService.toCSLJSON(citation);
    const payload = {
      user_id: userId,
      collection_id: collectionId,
      title: citation.title,
      year: citation.year,
      doi: citation.doi,
      url: citation.url,
      journal: citation.journal,
      csl_json: csl,
      styles: formatted,
    };
    const { data, error } = await supabase
      .from("citation_items")
      .insert(payload)
      .select("id,title,year,doi,url,journal,csl_json,styles,collection_id,created_at")
      .single();
    if (error) throw new Error(error.message);
    return data as any;
  },

  async moveItem(itemId: string, newCollectionId: string | null): Promise<void> {
    const { error } = await supabase
      .from("citation_items")
      .update({ collection_id: newCollectionId })
      .eq("id", itemId);
    if (error) throw new Error(error.message);
  },

  async removeItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("citation_items")
      .delete()
      .eq("id", itemId);
    if (error) throw new Error(error.message);
  },
};
