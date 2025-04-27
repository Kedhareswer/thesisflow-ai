import { FileText, Users, Lightbulb, Calendar, BookOpen } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import type { Database } from '../../src/integrations/supabase/types';

interface Activity {
  id?: string;
  type: string;
  title: string;
  timestamp: Date;
  details?: any;
  user_id?: string | null;
}

class ActivityTracker {
  private static instance: ActivityTracker;
  private activities: Activity[] = [];
  private stats = {
    papersSummarized: 0,
    collaborators: 0,
    researchIdeas: 0,
    upcomingDeadlines: 0
  };

  private constructor() {
    this.loadInitialData();
  }

  private async loadInitialData() {
    const user = supabase.auth.getUser();
    if (!user) return;

    try {
      // Load recent activities
      const { data: activities, error: activitiesError } = await supabase
        .from('user_activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (activitiesError) throw activitiesError;
      this.activities = activities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        timestamp: new Date(a.timestamp),
        details: a.details,
        user_id: a.user_id
      }));

      // Calculate stats from activities
      this.calculateStats();
    } catch (error) {
      console.error('Failed to load initial activity data:', error);
    }
  }

  private calculateStats() {
    this.stats = {
      papersSummarized: this.activities.filter((a: Activity) => a.type === 'paper_summarized').length,
      collaborators: this.activities.filter((a: Activity) => a.type === 'collaborator_joined').length,
      researchIdeas: this.activities.reduce((sum: number, a: Activity) => 
        a.type === 'idea_generated' ? sum + (a.details?.count || 1) : sum, 0),
      upcomingDeadlines: this.activities.filter((a: Activity) => 
        a.type === 'deadline_added' && !this.activities.some((b: Activity) => 
          b.type === 'deadline_completed' && b.details?.deadline_id === a.details?.deadline_id
        )).length
    };
  }

  public static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  public async trackActivity(type: string, title: string, details?: any) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return;

    const activity: Activity = {
      type,
      title,
      timestamp: new Date(),
      details,
      user_id: user.data.user.id
    };

    try {
      const { data, error } = await supabase
        .from('user_activities')
        .insert([{
          ...activity,
          timestamp: activity.timestamp.toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      const newActivity: Activity = {
        id: data.id,
        type: data.type,
        title: data.title,
        timestamp: new Date(data.timestamp),
        details: data.details,
        user_id: data.user_id
      };
      this.activities.unshift(newActivity);
      if (this.activities.length > 100) {
        this.activities = this.activities.slice(0, 100);
      }

      this.calculateStats();
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }

  public getStats() {
    return this.stats;
  }

  public getRecentActivities(limit: number = 4) {
    return this.activities.slice(0, limit);
  }

  public async refreshActivities() {
    await this.loadInitialData();
  }
}

export const activityTracker = ActivityTracker.getInstance();