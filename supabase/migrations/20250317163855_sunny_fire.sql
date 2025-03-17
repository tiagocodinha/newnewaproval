/*
  # Add support for multiple assignees per content item

  1. Changes
    - Create new junction table `content_item_assignees` to support many-to-many relationships
    - Migrate existing assignments to the new table
    - Update RLS policies to handle multiple assignees

  2. Security
    - Maintain existing security model with multiple assignees
    - Enable RLS on new table
    - Add appropriate policies for access control
*/

-- Create junction table for multiple assignees
CREATE TABLE content_item_assignees (
  content_item_id uuid REFERENCES content_items(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (content_item_id, profile_id)
);

-- Enable RLS
ALTER TABLE content_item_assignees ENABLE ROW LEVEL SECURITY;

-- Migrate existing assignments
INSERT INTO content_item_assignees (content_item_id, profile_id)
SELECT id, assigned_to
FROM content_items
WHERE assigned_to IS NOT NULL;

-- Add RLS policies for the new table
CREATE POLICY "Allow users to read their assignments"
  ON content_item_assignees
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Allow admins to manage assignments"
  ON content_item_assignees
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Update content_items policies
DROP POLICY IF EXISTS "Allow users to read assigned content" ON content_items;
DROP POLICY IF EXISTS "Allow content management" ON content_items;

CREATE POLICY "Allow users to read assigned content"
  ON content_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_item_assignees
      WHERE content_item_assignees.content_item_id = id
      AND content_item_assignees.profile_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "Allow content management"
  ON content_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content_item_assignees
      WHERE content_item_assignees.content_item_id = id
      AND content_item_assignees.profile_id = auth.uid()
    ) OR is_admin()
  );

-- Make assigned_to nullable (will be removed in a future migration)
ALTER TABLE content_items ALTER COLUMN assigned_to DROP NOT NULL;