import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { BrowserContext } from 'playwright-core';

type CamoufoxFn = (opts: {
  headless?: boolean;
  user_data_dir?: string;
  [key: string]: unknown;
}) => Promise<BrowserContext>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const profileDir = path.join(root, 'data', 'pw-profile');

async function main() {
  console.log('=== YouTube Profile Provisioning ===\n');

  fs.mkdirSync(profileDir, { recursive: true });
  console.log(`Profile directory: ${profileDir}`);

  const { Camoufox } = (await import(
    path.join(root, 'node_modules', 'camoufox-js')
  )) as { Camoufox: CamoufoxFn };

  console.log('\nLaunching browser (non-headless)...');
  console.log('A browser window will open. Please:');
  console.log('  1. Wait for YouTube to load');
  console.log('  2. Sign in to your Google/YouTube account');
  console.log('  3. Return to this terminal and press Enter when done\n');

  const ctx = await Camoufox({
    headless: false,
    user_data_dir: profileDir,
    viewport: null,
  });

  const page = await ctx.newPage();
  await page.goto('https://www.youtube.com/', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.question('Press Enter after signing in to YouTube...', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\nSaving profile and closing browser...');
  await ctx.close();

  console.log('\n✓ Profile saved successfully!');
  console.log('  You can now restart the API: pm2 restart basma-api');
}

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
