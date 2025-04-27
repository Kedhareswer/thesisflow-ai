import { NextResponse } from 'next/server';
import { formatRelativeTime } from '@/lib/utils/date';

interface Activity {
  type: string;
  title: string;
  timestamp: Date;
  details?: any;
}

interface UserStats {
  papersSummarized: number;
  collaborators: number;
  researchIdeas: number;
  upcomingDeadlines: number;
  activities: Activity[];
}

// In a real application, this would be fetched from a database
const getUserStats = async (userId: string): Promise<UserStats> => {
  // This is where you would normally query your database
  // For now, we'll return mock data based on actual user activity tracking
  return {
    papersSummarized: 0,
    collaborators: 0,
    researchIdeas: 0,
    upcomingDeadlines: 0,
    activities: []
  };
};

export async function GET(request: Request) {
  try {
    // In a real app, get the user ID from the session/token
    const userId = 'current-user'; // Placeholder
    const stats = await getUserStats(userId);

    // Format the data for the dashboard
    const formattedData = {
      stats: [
        {
          title: 'Papers Summarized',
          value: stats.papersSummarized.toString(),
          description: 'Research papers processed',
          icon: null // Icons are handled on the client side
        },
        {
          title: 'Collaborators',
          value: stats.collaborators.toString(),
          description: 'Active research partners',
          icon: null
        },
        {
          title: 'Research Ideas',
          value: stats.researchIdeas.toString(),
          description: 'Generated and saved',
          icon: null
        },
        {
          title: 'Upcoming Deadlines',
          value: stats.upcomingDeadlines.toString(),
          description: 'Tasks due this week',
          icon: null
        }
      ],
      recentActivity: stats.activities.map(activity => ({
        icon: null, // Icons are handled on the client side
        title: activity.title,
        time: formatRelativeTime(activity.timestamp)
      })).slice(0, 4) // Only show the 4 most recent activities
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
};

// POST endpoint to update user stats
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { type, details } = data;

    // In a real app, this would update the database
    // For now, we'll just return a success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
};