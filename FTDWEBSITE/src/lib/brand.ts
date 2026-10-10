import 'server-only';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** Resolved once per server process: is the official logo file in place? */
export const hasLogoAsset = existsSync(path.join(process.cwd(), 'public', 'brand', 'fgdr-logo.png'));

/** Is a pre-rendered hero poster frame available? */
export const hasHeroPoster = existsSync(path.join(process.cwd(), 'public', 'brand', 'hero-poster.jpg'));
