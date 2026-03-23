/*
  # Allow users to update their own preferred_area_unit

  1. Security
    - Add UPDATE policy on `john_deere_connections` for authenticated users
    - Users can only update their own row (user_id = auth.uid())
    - Policy is scoped to allow updates only

  2. Notes
    - This complements the existing SELECT policy
    - Edge Functions continue to use service role for token-related updates
*/

CREATE POLICY "Users can update own connection preferences"
  ON john_deere_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);