/**
 * Supabase User Repository implementation
 */

import { supabase } from '../../../integrations/supabase/client';
import { 
  IUserRepository, 
  CreateUserParams, 
  UserProfileUpdate 
} from '../../core/interfaces/IUserRepository';
import { 
  User, 
  UserProfile, 
  UserSettings 
} from '../../core/entities/User';

export class SupabaseUserRepository implements IUserRepository {
  /**
   * Create a new user with authentication
   */
  async createUser(userData: CreateUserParams): Promise<User> {
    try {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            display_name: userData.displayName,
            avatar_url: userData.avatarUrl
          }
        }
      });

      if (authError) {
        throw new Error(`Auth signup failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }

      // Create user profile in database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          username: userData.username,
          display_name: userData.displayName,
          avatar_url: userData.avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, delete the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Create default user settings
      await this.createUserSettings(authData.user.id);

      return this.mapProfileToUser(profileData);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          followers_count,
          following_count,
          posts_count
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Database error: ${error.message}`);
      }

      return this.mapProfileToUser(data);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Database error: ${error.message}`);
      }

      return this.mapProfileToUser(data);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Database error: ${error.message}`);
      }

      return this.mapProfileToUser(data);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Get user profile for public display
   */
  async getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          banner_url,
          bio,
          is_verified,
          verification_type,
          followers_count,
          following_count,
          posts_count
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Database error: ${error.message}`);
      }

      // Check if viewer is following this user
      let isFollowing = false;
      if (viewerId && viewerId !== userId) {
        const { data: followData } = await supabase
          .from('relationships')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('following_id', userId)
          .eq('status', 'accepted')
          .maybeSingle();
        
        isFollowing = !!followData;
      }

      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bannerUrl: data.banner_url,
        bio: data.bio,
        isVerified: data.is_verified,
        verificationType: data.verification_type,
        followersCount: data.followers_count || 0,
        followingCount: data.following_count || 0,
        postsCount: data.posts_count || 0,
        isFollowing,
        isOwnProfile: viewerId === userId
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfileUpdate>): Promise<User> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
      if (updates.bannerUrl !== undefined) updateData.banner_url = updates.bannerUrl;
      if (updates.username !== undefined) updateData.username = updates.username;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return this.mapProfileToUser(data);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          privacy: settings.privacy,
          notifications: settings.notifications,
          appearance: settings.appearance,
          security: settings.security,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Return default settings if none exist
          return this.getDefaultUserSettings();
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          followers_count
        `)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data.map((profile: any) => ({
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        isVerified: profile.is_verified,
        followersCount: profile.followers_count || 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
        isOwnProfile: false
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get followers list
   */
  async getFollowers(userId: string, limit: number = 20): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select(`
          follower:profiles!follower_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            followers_count
          )
        `)
        .eq('following_id', userId)
        .eq('status', 'accepted')
        .limit(limit);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data.map((rel: any) => ({
        id: rel.follower.id,
        username: rel.follower.username,
        displayName: rel.follower.display_name,
        avatarUrl: rel.follower.avatar_url,
        isVerified: rel.follower.is_verified,
        followersCount: rel.follower.followers_count || 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
        isOwnProfile: false
      }));
    } catch (error) {
      console.error('Error getting followers:', error);
      throw error;
    }
  }

  /**
   * Get following list
   */
  async getFollowing(userId: string, limit: number = 20): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select(`
          following:profiles!following_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            followers_count
          )
        `)
        .eq('follower_id', userId)
        .eq('status', 'accepted')
        .limit(limit);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data.map((rel: any) => ({
        id: rel.following.id,
        username: rel.following.username,
        displayName: rel.following.display_name,
        avatarUrl: rel.following.avatar_url,
        isVerified: rel.following.is_verified,
        followersCount: rel.following.followers_count || 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
        isOwnProfile: false
      }));
    } catch (error) {
      console.error('Error getting following:', error);
      throw error;
    }
  }

  /**
   * Update user's online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating last seen:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Delete user data in proper order due to foreign key constraints
      await supabase.from('user_settings').delete().eq('user_id', userId);
      await supabase.from('relationships').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
      await supabase.from('posts').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      
      // Delete auth user
      await supabase.auth.admin.deleteUser(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Helper method to create default user settings
   */
  private async createUserSettings(userId: string): Promise<void> {
    const defaultSettings = this.getDefaultUserSettings();
    
    await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        ...defaultSettings
      });
  }

  /**
   * Helper method to get default user settings
   */
  private getDefaultUserSettings(): UserSettings {
    return {
      privacy: {
        profileVisibility: 'public',
        messagePermissions: 'everyone',
        showOnlineStatus: true,
        showLastSeen: true,
        allowTags: true
      },
      notifications: {
        email: {
          messages: true,
          comments: true,
          likes: true,
          follows: true,
          mentions: true,
          weeklyDigest: false
        },
        push: {
          messages: true,
          comments: true,
          likes: true,
          follows: true,
          mentions: true,
          soundEnabled: true
        },
        inApp: {
          messages: true,
          comments: true,
          likes: true,
          follows: true,
          mentions: true,
          showPreviews: true
        }
      },
      appearance: {
        theme: 'system',
        language: 'pt',
        fontSize: 'medium',
        fontFamily: 'Inter'
      },
      security: {
        twoFactorEnabled: false,
        loginAlerts: true,
        sessionTimeout: 30,
        trustedDevices: []
      }
    };
  }

  /**
   * Helper method to map database profile to User entity
   */
  private mapProfileToUser(profile: any): User {
    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bannerUrl: profile.banner_url,
      bio: profile.bio,
      isVerified: profile.is_verified || false,
      verificationType: profile.verification_type,
      followersCount: profile.followers_count || 0,
      followingCount: profile.following_count || 0,
      postsCount: profile.posts_count || 0,
      walletBalance: profile.wallet_balance || 0,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
      lastSeenAt: profile.last_seen_at ? new Date(profile.last_seen_at) : new Date(),
      isActive: profile.is_active !== false,
      isOnline: profile.is_online || false
    };
  }
}