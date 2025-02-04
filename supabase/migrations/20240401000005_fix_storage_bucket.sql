-- Create assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'assets');

-- Create policy to allow public to view files
CREATE POLICY "Allow public viewing of files" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'assets');

-- Create policy to allow authenticated users to update their own files
CREATE POLICY "Allow users to update own files" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'assets')
    WITH CHECK (bucket_id = 'assets');

-- Create policy to allow authenticated users to delete their own files
CREATE POLICY "Allow users to delete own files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'assets'); 