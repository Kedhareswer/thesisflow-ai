import { supabase } from '@/lib/supabase';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

class TokenManager {
  private static instance: TokenManager;
  private tokenData: TokenData | null = null;
  private refreshPromise: Promise<TokenData> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async getValidToken(): Promise<string | null> {
    // Check if we have a valid token
    if (this.tokenData && this.isTokenValid()) {
      return this.tokenData.access_token;
    }

    // If token is expired or missing, refresh it
    try {
      const tokenData = await this.refreshToken();
      return tokenData.access_token;
    } catch (error) {
      console.error('Failed to get valid token:', error);
      return null;
    }
  }

  private isTokenValid(): boolean {
    if (!this.tokenData) return false;
    
    // Check if token expires in the next 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return this.tokenData.expires_at > fiveMinutesFromNow;
  }

  private async refreshToken(): Promise<TokenData> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<TokenData> {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      throw new Error('No valid session found');
    }

    const tokenData: TokenData = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + (60 * 60 * 1000)
    };

    this.tokenData = tokenData;
    return tokenData;
  }

  async initialize(): Promise<void> {
    try {
      await this.refreshToken();
    } catch (error) {
      console.error('Failed to initialize token manager:', error);
    }
  }

  clearTokens(): void {
    this.tokenData = null;
    this.refreshPromise = null;
  }

  // Listen for auth state changes
  setupAuthListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        this.clearTokens();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.tokenData = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + (60 * 60 * 1000)
        };
      }
    });
  }
}

export const tokenManager = TokenManager.getInstance();