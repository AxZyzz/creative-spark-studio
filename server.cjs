require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Add explicit CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const port = process.env.PORT || 3001;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const tableName = process.env.VITE_SUPABASE_TABLE_NAME || 'images';
const storageBucket = process.env.VITE_SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

app.get('/api/signed-url', async (req, res) => {
  try {
    const path = req.query.path;
    if (!path) {
      return res.status(400).json({ error: 'path query param required' });
    }

    console.log(`Creating signed URL for path: ${path}`);

    const { data, error } = await supabaseAdmin.storage
      .from(storageBucket)
      .createSignedUrl(path, 24 * 60 * 60); // 24 hours

    if (error) {
      console.error('Error creating signed URL:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✓ Signed URL created:', data.signedUrl);
    return res.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/images', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error });
    }

    console.log(`Raw rows from ${tableName}:`, JSON.stringify(data, null, 2));

    // If storage bucket configured, convert storage paths to SIGNED URLs (works with RLS)
    if (storageBucket && Array.isArray(data)) {
      const transformed = await Promise.all(
        data.map(async (row, idx) => {
          try {
            const imageField = row.image_url || row.url || row.path || row.file;
            console.log(`Row ${idx}: imageField=`, imageField);
            
            if (imageField && typeof imageField === 'string' && !/^https?:\/\//i.test(imageField)) {
              // remove leading slash
              const path = imageField.replace(/^\//, '');
              console.log(`Converting storage path "${path}" to signed URL in bucket "${storageBucket}"`);
              
              try {
                // Use signed URL (expires in 24 hours) - works even with RLS enabled
                const { data: signed, error: signedErr } = await supabaseAdmin.storage
                  .from(storageBucket)
                  .createSignedUrl(path, 24 * 60 * 60); // 24 hours
                
                if (!signedErr && signed && signed.signedUrl) {
                  console.log(`✓ Signed URL (24h): ${signed.signedUrl}`);
                  row.image_url = signed.signedUrl;
                } else {
                  console.warn(`✗ Failed to create signed URL for "${path}":`, signedErr);
                  // Fallback: try public URL anyway
                  const { data: urlData, error: urlError } = await supabaseAdmin.storage
                    .from(storageBucket)
                    .getPublicUrl(path);
                  
                  if (!urlError && urlData && urlData.publicUrl) {
                    console.log(`✓ Public URL (fallback): ${urlData.publicUrl}`);
                    row.image_url = urlData.publicUrl;
                  }
                }
              } catch (e) {
                console.error(`Error creating signed URL for "${path}":`, e);
              }
            }
          } catch (e) {
            console.error(`Error processing row ${idx}:`, e);
          }
          return row;
        })
      );

      console.log(`Transformed rows:`, JSON.stringify(transformed, null, 2));
      return res.json({ data: transformed });
    }

    return res.json({ data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Supabase proxy running at http://localhost:${port}/api/images`);
});
