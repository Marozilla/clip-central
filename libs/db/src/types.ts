export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campaign_participants: {
        Row: {
          campaign_id: string
          discord_id: string
          joined_at: string
        }
        Insert: {
          campaign_id: string
          discord_id: string
          joined_at?: string
        }
        Update: {
          campaign_id?: string
          discord_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          budget_cap: number | null
          created_at: string
          created_by: string | null
          description: string | null
          discord_channel_id: string | null
          discord_guild_id: string | null
          discord_message_id: string | null
          embed_image_url: string | null
          embed_thumbnail_url: string | null
          ends_at: string | null
          id: string
          min_views_for_payout: number
          platforms: Database["public"]["Enums"]["platform"][]
          rate_per_view: number
          starts_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at: string
        }
        Insert: {
          budget_cap?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_channel_id?: string | null
          discord_guild_id?: string | null
          discord_message_id?: string | null
          embed_image_url?: string | null
          embed_thumbnail_url?: string | null
          ends_at?: string | null
          id?: string
          min_views_for_payout?: number
          platforms?: Database["public"]["Enums"]["platform"][]
          rate_per_view: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
          updated_at?: string
        }
        Update: {
          budget_cap?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_channel_id?: string | null
          discord_guild_id?: string | null
          discord_message_id?: string | null
          embed_image_url?: string | null
          embed_thumbnail_url?: string | null
          ends_at?: string | null
          id?: string
          min_views_for_payout?: number
          platforms?: Database["public"]["Enums"]["platform"][]
          rate_per_view?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clip_view_history: {
        Row: {
          captured_at: string
          clip_id: string
          id: string
          views: number
        }
        Insert: {
          captured_at?: string
          clip_id: string
          id?: string
          views: number
        }
        Update: {
          captured_at?: string
          clip_id?: string
          id?: string
          views?: number
        }
        Relationships: []
      }
      clips: {
        Row: {
          campaign_id: string
          current_views: number
          discord_id: string
          failure_strikes: number
          id: string
          initial_views: number
          owner_handle: string | null
          platform: Database["public"]["Enums"]["platform"]
          reject_reason: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["clip_status"]
          submitted_at: string
          thumbnail_url: string | null
          thumbnail_path: string | null
          title: string | null
          url: string
          video_id: string
          video_metadata: Json
          metadata_fetched_at: string | null
        }
        Insert: {
          campaign_id: string
          current_views?: number
          discord_id: string
          failure_strikes?: number
          id?: string
          initial_views?: number
          owner_handle?: string | null
          platform: Database["public"]["Enums"]["platform"]
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["clip_status"]
          submitted_at?: string
          thumbnail_url?: string | null
          thumbnail_path?: string | null
          title?: string | null
          url: string
          video_id: string
          video_metadata?: Json
          metadata_fetched_at?: string | null
        }
        Update: {
          campaign_id?: string
          current_views?: number
          discord_id?: string
          failure_strikes?: number
          id?: string
          initial_views?: number
          owner_handle?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["clip_status"]
          submitted_at?: string
          thumbnail_url?: string | null
          thumbnail_path?: string | null
          title?: string | null
          url?: string
          video_id?: string
          video_metadata?: Json
          metadata_fetched_at?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string
          discord_id: string
          follower_count: number | null
          handle: string
          id: string
          platform: Database["public"]["Enums"]["platform"]
          verification_code: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          discord_id: string
          follower_count?: number | null
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          verification_code?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          discord_id?: string
          follower_count?: number | null
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          verification_code?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      submission_queue: {
        Row: {
          campaign_id: string
          created_at: string
          discord_id: string
          error_message: string | null
          id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["queue_status"]
          url: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          discord_id: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          url: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          discord_id?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
          url?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          discord_avatar: string | null
          discord_id: string
          discord_username: string
        }
        Insert: {
          created_at?: string
          discord_avatar?: string | null
          discord_id: string
          discord_username: string
        }
        Update: {
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string
          discord_username?: string
        }
        Relationships: []
      }
      worker_heartbeat: {
        Row: {
          id: string
          last_seen_at: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
        }
        Update: {
          id?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      leaderboard_settings: {
        Row: {
          id: string
          enabled: boolean
          discord_channel_id: string | null
          discord_message_id: string | null
          refresh_interval_minutes: number
          last_posted_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          enabled?: boolean
          discord_channel_id?: string | null
          discord_message_id?: string | null
          refresh_interval_minutes?: number
          last_posted_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          enabled?: boolean
          discord_channel_id?: string | null
          discord_message_id?: string | null
          refresh_interval_minutes?: number
          last_posted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      connect_panel_settings: {
        Row: {
          id: string
          discord_channel_id: string | null
          discord_message_id: string | null
          title: string | null
          description: string | null
          last_posted_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          discord_channel_id?: string | null
          discord_message_id?: string | null
          title?: string | null
          description?: string | null
          last_posted_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          discord_channel_id?: string | null
          discord_message_id?: string | null
          title?: string | null
          description?: string | null
          last_posted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_leaderboard_top_users: {
        Args: { p_limit?: number }
        Returns: {
          rank: number
          discord_id: string
          discord_username: string
          discord_avatar: string | null
          total_views: number
          clip_count: number
        }[]
      }
      get_user_stats: {
        Args: { p_discord_id: string }
        Returns: {
          approved_clips: number
          total_views_gained: number
        }[]
      }
    }
    Enums: {
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      clip_status: "pending" | "approved" | "rejected" | "tracking" | "deleted"
      platform: "youtube" | "tiktok" | "instagram" | "twitter"
      queue_status: "pending" | "processing" | "completed" | "failed"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Platform = Database["public"]["Enums"]["platform"]
export type CampaignStatus = Database["public"]["Enums"]["campaign_status"]
export type ClipStatus = Database["public"]["Enums"]["clip_status"]
export type QueueStatus = Database["public"]["Enums"]["queue_status"]

export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"]
export type Clip = Database["public"]["Tables"]["clips"]["Row"]
export type User = Database["public"]["Tables"]["users"]["Row"]
export type SocialAccount = Database["public"]["Tables"]["social_accounts"]["Row"]
