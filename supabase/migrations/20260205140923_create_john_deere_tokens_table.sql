/*
  # John Deere Operations Center Integration Schema

  1. New Tables
    - `john_deere_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique - one connection per user)
      - `access_token` (text, encrypted token for API calls)
      - `refresh_token` (text, encrypted token for refreshing access)
      - `token_expires_at` (timestamptz, when the access token expires)
      - `selected_org_id` (text, the user's selected organization ID)
      - `selected_org_name` (text, the user's selected organization name for display)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `john_deere_connections` table
    - Add policy for authenticated users to manage their own connection
    - Users can only access their own tokens

  3. Notes
    - Each user can have only one John Deere connection
    - Tokens are stored securely and only accessible by the owning user
*/

CREATE TABLE IF NOT EXISTS john_deere_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  selected_org_id text,
  selected_org_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE john_deere_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own John Deere connection"
  ON john_deere_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own John Deere connection"
  ON john_deere_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own John Deere connection"
  ON john_deere_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own John Deere connection"
  ON john_deere_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_john_deere_connections_user_id ON john_deere_connections(user_id);