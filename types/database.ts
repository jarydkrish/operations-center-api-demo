export interface Database {
  public: {
    Tables: {
      john_deere_connections: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          selected_org_id: string | null;
          selected_org_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          selected_org_id?: string | null;
          selected_org_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          selected_org_id?: string | null;
          selected_org_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type JohnDeereConnection = Database['public']['Tables']['john_deere_connections']['Row'];
