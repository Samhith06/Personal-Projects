import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL || 'file:./fgdr.db';
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

// Local file databases use the SQLite dialect; hosted libSQL (Turso) needs a token.
export default url.startsWith('file:')
  ? defineConfig({
      dialect: 'sqlite',
      schema: './src/server/db/schema.ts',
      out: './drizzle',
      dbCredentials: { url },
    })
  : defineConfig({
      dialect: 'turso',
      schema: './src/server/db/schema.ts',
      out: './drizzle',
      dbCredentials: { url, authToken },
    });
