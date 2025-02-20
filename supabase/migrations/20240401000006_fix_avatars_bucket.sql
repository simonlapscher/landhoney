-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated avatar uploads" ON storage.objects
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'avatars');

-- Create policy to allow public to view avatars
CREATE POLICY "Allow public viewing of avatars" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Create policy to allow authenticated users to update their own avatars
CREATE POLICY "Allow users to update own avatars" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow authenticated users to delete their own avatars
CREATE POLICY "Allow users to delete own avatars" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]); 