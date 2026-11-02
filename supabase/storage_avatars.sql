-- Ensure public avatars bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Avatars Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Authenticated Delete" ON storage.objects;

-- 1. Enable public read on avatars
CREATE POLICY "Avatars Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Allow authenticated users to upload avatars ONLY into their own user ID folder
CREATE POLICY "Avatars Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to update avatars ONLY within their own user ID folder
CREATE POLICY "Avatars Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow authenticated users to delete avatars ONLY within their own user ID folder
CREATE POLICY "Avatars Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
