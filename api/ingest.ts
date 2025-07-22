import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user_id, source_url, image_base64, note } = req.body ?? {};

    if (!user_id) {
      return res.status(400).json({ error: 'missing user_id' });
    }

    let image_path: string | null = null;

    if (image_base64) {
      const buf = Buffer.from(image_base64, 'base64');
      const filename = `${user_id}/${nanoid()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filename, buf, {
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      image_path = filename;
    }

    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id,
        source_url: source_url ?? null,
        raw_text: note ?? null,
        image_path,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, item_id: data.id });

  } catch (err: any) {
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'internal_error', message: err.message });
  }
}
