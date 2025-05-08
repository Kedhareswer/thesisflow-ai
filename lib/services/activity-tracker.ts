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
    upcomingDeadlines: 0,
    writingStreak: 0,
    lastSession: null as { title: string; link: string } | null
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
    const now = new Date();
    this.stats = {
      papersSummarized: this.activities.filter((a: Activity) => a.type === 'paper_summarized').length,
      collaborators: this.activities.filter((a: Activity) => a.type === 'collaborator_joined').length,
      researchIdeas: this.activities.reduce((sum: number, a: Activity) => 
        a.type === 'idea_generated' ? sum + (a.details?.count || 1) : sum, 0),
      upcomingDeadlines: this.activities.filter((a: Activity) => 
        a.type === 'deadline_added' && !this.activities.some((b: Activity) => 
          b.type === 'deadline_completed' && b.details?.deadline_id === a.details?.deadline_id
        )).length,
      writingStreak: this.calculateWritingStreak(),
      lastSession: this.findLastSession()
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
  public getLastSession() {
    return this.stats.lastSession;
  }

  public getWritingStreak() {
    return this.stats.writingStreak;
  }

  public getPapersSummarizedThisMonth() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.activities.filter(a => 
      a.type === 'paper_summarized' && 
      a.timestamp >= startOfMonth
    ).length;
  }

  public getCollaborationSessions() {
    return this.activities.filter(a => 
      a.type === 'collaboration_session'
    ).length;
  }

  public getHighlights() {
    return this.activities
      .filter(a => a.type === 'highlight_created')
      .map(a => a.title);
  }

  public getAISuggestion() {
    const suggestions = [
      'Consider reviewing recent papers in your field',
      'Time to collaborate with peers on your research',
      'Update your research notes and highlights',
      'Plan your next writing session'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private calculateWritingStreak() {
    let streak = 0;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const hasWritingToday = this.activities.some(a => 
      a.type === 'writing_session' && 
      a.timestamp.toDateString() === now.toDateString()
    );

    const hasWritingYesterday = this.activities.some(a => 
      a.type === 'writing_session' && 
      a.timestamp.toDateString() === yesterday.toDateString()
    );

    if (hasWritingToday || hasWritingYesterday) {
      streak = 1;
      let checkDate = new Date(yesterday);

      
      while (this.activities.some(a => 
        a.type === 'writing_session' && 
        a.timestamp.toDateString() === checkDate.toDateString()
      )) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return streak;
  }

  private findLastSession() {
    const lastSession = this.activities.find(a => 
      a.type === 'session_start' && 
      !this.activities.some(b => 
        b.type === 'session_end' && 
        b.details?.session_id === a.details?.session_id
      )
    );

    if (lastSession) {
      return {
        title: lastSession.title,
        link: lastSession.details?.link || '/'
      };
    }

    return null;
  }
}

export const activityTracker = ActivityTracker.getInstance();