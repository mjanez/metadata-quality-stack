import type { APIRoute } from 'astro';
import { promises as fs } from 'fs';
import path from 'path';
import gettext from 'gettext-parser';
import { METRIC_LABELS } from '../../../../frontend/config';

// Path to the locale directory relative to this file
const LOCALE_DIR = path.join(process.cwd(), '..', '..', 'locale');

export const get: APIRoute = async () => {
  try {
    // Read the Spanish .mo file (since English is the default/fallback)
    const moFile = await fs.readFile(
      path.join(LOCALE_DIR, 'es', 'LC_MESSAGES', 'mqa.mo')
    );

    // Parse the .mo file
    const mo = gettext.mo.parse(moFile);
    const translations: Record<string, { en: string; es: string }> = {};

    // Convert the mo format to our translation format
    Object.entries(mo.translations['']).forEach(([key, value]) => {
      if (key && value.msgid && value.msgstr[0]) {
        translations[key] = {
          en: value.msgid, // Original text is English
          es: value.msgstr[0] // Translated text is Spanish
        };
      }
    });

    // Merge with metric labels
    const merged = {
      ...translations,
      ...METRIC_LABELS
    };

    return new Response(JSON.stringify(merged), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error loading translations:', error);
    return new Response(JSON.stringify({ error: 'Failed to load translations' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}