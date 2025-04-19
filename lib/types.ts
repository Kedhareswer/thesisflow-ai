export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  researchInterests: string[];
  expertise: string[];
  institution?: string;
  role?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  notificationPreferences: {
    email: boolean;
    push: boolean;
    researchUpdates: boolean;
    collaborationRequests: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  profile: UserProfile;
  displayName: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  researchUpdateFrequency: 'daily' | 'weekly' | 'monthly';
  collaborationPreferences: {
    allowRequests: boolean;
    autoAccept: boolean;
    minimumRating: number;
  };
  privacy: {
    showEmail: boolean;
    showInstitution: boolean;
    showResearchInterests: boolean;
    showExpertise: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
} 