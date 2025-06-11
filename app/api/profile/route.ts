import { NextResponse } from 'next/server';
import { UserProfile, UserSettings } from '@/lib/types';

// Mock database - replace with actual database
let mockProfile: UserProfile = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://github.com/shadcn.png',
  bio: 'Research scientist specializing in AI and machine learning',
  researchInterests: ['Artificial Intelligence', 'Machine Learning', 'Natural Language Processing'],
  expertise: ['Python', 'TensorFlow', 'PyTorch', 'Data Analysis'],
  institution: 'University of Example',
  role: 'Research Scientist',
  socialLinks: {
    github: 'https://github.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
  },
  notificationPreferences: {
    email: true,
    push: true,
    researchUpdates: true,
    collaborationRequests: true,
  },
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let mockSettings: UserSettings = {
  profile: mockProfile,
  displayName: 'John Doe',
  emailNotifications: true,
  pushNotifications: true,
  researchUpdateFrequency: 'weekly',
  collaborationPreferences: {
    allowRequests: true,
    autoAccept: false,
    minimumRating: 3,
  },
  privacy: {
    showEmail: true,
    showInstitution: true,
    showResearchInterests: true,
    showExpertise: true,
  },
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
};

export async function GET() {
  return NextResponse.json({ profile: mockProfile, settings: mockSettings });
}

export async function PUT(request: Request) {
  try {
    const { profile, settings } = await request.json();

    if (profile) {
      mockProfile = {
        ...mockProfile,
        ...profile,
        updatedAt: new Date().toISOString(),
      };
    }

    if (settings) {
      mockSettings = {
        ...mockSettings,
        ...settings,
        profile: mockProfile,
      };
    }

    return NextResponse.json({ profile: mockProfile, settings: mockSettings });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
