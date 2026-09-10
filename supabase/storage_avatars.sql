-- Ensure public avatars bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Avatars Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Delete" ON storage.objects;

-- Enable public read on avatars
CREATE POLICY "Avatars Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Avatars Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatar
CREATE POLICY "Avatars Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their avatar
CREATE POLICY "Avatars Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
