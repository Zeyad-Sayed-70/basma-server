import * as path from 'node:path';
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import type { BrowserContext, Cookie } from 'playwright-core';

type CamoufoxFnType = (opts: {
  headless?: boolean;
  user_data_dir?: string;
  [key: string]: unknown;
}) => Promise<BrowserContext>;

let camoufoxInstance: CamoufoxFnType | null = null;
async function getCamoufox(): Promise<CamoufoxFnType> {
  if (!camoufoxInstance) {
    camoufoxInstance = (await import('camoufox-js')).Camoufox;
  }
  return camoufoxInstance;
}

const PROFILE_DIR = process.env.YT_PROFILE_DIR
  ? path.resolve(process.env.YT_PROFILE_DIR)
  : path.resolve(__dirname, '..', 'data', 'pw-profile');

const COOKIES_FILE = process.env.YT_COOKIES_FILE
  ? path.resolve(process.env.YT_COOKIES_FILE)
  : path.resolve(__dirname, '..', 'data', 'yt-cookies.txt');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  console.log(`Profile dir: ${PROFILE_DIR}`);
  console.log(`Cookies file: ${COOKIES_FILE}`);

  const Camoufox = await getCamoufox();
  const ctx = await Camoufox({
    headless: false,
    user_data_dir: PROFILE_DIR,
    viewport: null,
  });

  const page = await ctx.newPage();
  await page.goto('https://www.youtube.com/', { waitUntil: 'networkidle' });

  console.log('\n==============================');
  console.log('Sign in to YouTube in the browser window.');
  console.log('After signing in and landing on YouTube, come back here.');
  console.log('Press Enter when ready to save cookies...');
  console.log('(or type "skip" and press Enter to skip cookie saving)\n');

  await new Promise<void>((resolve) => {
    rl.question('> ', (answer) => {
      if (answer.toLowerCase() === 'skip') {
        console.log('Skipping cookie save.');
      }
      resolve();
    });
  });

  const cookies: Cookie[] = await ctx.cookies();
  const ytCookies = cookies.filter(
    (c) => c.domain.includes('youtube.com') || c.domain.includes('.ytimg.com'),
  );

  const netscape = toNetscape(ytCookies);
  const dir = path.dirname(COOKIES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(COOKIES_FILE, netscape, 'utf-8');

  console.log(`Saved ${ytCookies.length} cookies to ${COOKIES_FILE}`);

  await ctx.close();
  rl.close();
}

function toNetscape(
  cookies: Array<{
    domain: string;
    name: string;
    value: string;
    path?: string;
    expires?: number;
    secure?: boolean;
    sameSite?: string;
  }>,
): string {
  const lines: string[] = ['# Netscape HTTP Cookie File'];
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
    const includeSub = 'TRUE';
    const p = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = Math.floor(c.expires || 0).toString();
    lines.push(
      [domain, includeSub, p, secure, expires, c.name, c.value].join('\t'),
    );
  }
  return lines.join('\n') + '\n';
}

main().catch((err: unknown) => {
  console.error('Failed:', (err as Error).message);
  process.exit(1);
});
