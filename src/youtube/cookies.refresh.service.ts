import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { Browser, BrowserContext, Cookie, Page } from 'playwright-core';

type CamoufoxFn = (opts: {
  headless?: boolean;
  user_data_dir?: string;
  [key: string]: unknown;
}) => Promise<BrowserContext>;

let camoufoxInstance: CamoufoxFn | null = null;
async function getCamoufox(): Promise<CamoufoxFn> {
  if (!camoufoxInstance) {
    camoufoxInstance = (await import('camoufox-js')).Camoufox;
  }
  return camoufoxInstance;
}

export interface CookieRecord {
  domain: string;
  name: string;
  value: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

@Injectable()
export class CookiesRefreshService implements OnModuleDestroy {
  private readonly logger = new Logger(CookiesRefreshService.name);
  private readonly cookiesPath: string;
  private readonly profileDir: string;
  private readonly enabled: boolean;
  private activeBrowser: Browser | null = null;
  private refreshing = false;

  constructor(private readonly config: ConfigService) {
    this.cookiesPath =
      this.config.get<string>('YT_COOKIES_FILE') ??
      path.join(process.cwd(), 'data', 'yt-cookies.txt');
    this.profileDir =
      this.config.get<string>('YT_PROFILE_DIR') ??
      path.join(process.cwd(), 'data', 'pw-profile');
    this.enabled =
      this.config.get<string>('YT_COOKIES_REFRESH_ENABLED', 'true') === 'true';
  }

  async refresh(): Promise<{ ok: boolean; count: number; ageSec?: number }> {
    if (!this.enabled) {
      this.logger.log('cookies.refresh_disabled');
      return { ok: false, count: 0 };
    }

    if (!fs.existsSync(this.profileDir)) {
      this.logger.warn(
        'cookies.profile_missing — run the provisioning script first',
      );
      return { ok: false, count: 0 };
    }

    if (this.refreshing) {
      this.logger.warn('cookies.refresh.skipped — already in progress');
      return { ok: false, count: 0 };
    }
    this.refreshing = true;

    let ctx: BrowserContext | undefined;
    try {
      const Camoufox = await getCamoufox();
      ctx = await Camoufox({
        headless: true,
        user_data_dir: this.profileDir,
        viewport: null,
      });
      this.activeBrowser = ctx.browser();

      const page = await ctx.newPage();
      await page.goto('https://www.youtube.com/', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await page.waitForTimeout(5000);
      // await this.saveScreenshot(page, 'loaded');

      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => '');
      if (
        bodyText.includes('Before you continue') ||
        bodyText.includes('recaptcha') ||
        bodyText.includes('Sign in')
      ) {
        this.logger.warn('cookies.detected_blocker or not signed in');
        await this.saveScreenshot(page, 'blocker');
        return { ok: false, count: 0 };
      }

      const cookies = (await ctx.cookies()).filter(
        (c: Cookie) =>
          c.domain.includes('youtube.com') || c.domain.includes('.ytimg.com'),
      );

      const netscape = this.toNetscape(cookies);
      const dir = path.dirname(this.cookiesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cookiesPath, netscape, 'utf-8');

      const stat = fs.statSync(this.cookiesPath);
      const ageSec = Math.floor((Date.now() - stat.mtime.getTime()) / 1000);

      this.logger.log(
        `cookies.refresh.success count=${cookies.length} ageSec=${ageSec}`,
      );

      return { ok: true, count: cookies.length, ageSec };
    } catch (err) {
      this.logger.warn(`cookies.refresh.failed ${(err as Error).message}`);
      if (ctx) {
        const pages = ctx.pages();
        if (pages.length > 0) {
          await this.saveScreenshot(pages[0], 'error').catch(() => {});
        }
      }
      return { ok: false, count: 0 };
    } finally {
      await this.closeBrowser();
      this.refreshing = false;
    }
  }

  private async saveScreenshot(page: Page, label: string) {
    const dir = path.join(path.dirname(this.cookiesPath), 'screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const ts = Date.now();
    const fp = path.join(dir, `yt-${label}-${ts}.png`);
    await page.screenshot({ path: fp, fullPage: false });
    this.logger.log(`screenshot saved: ${fp}`);
  }

  private toNetscape(cookies: CookieRecord[]): string {
    const lines: string[] = ['# Netscape HTTP Cookie File'];
    for (const c of cookies) {
      const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
      const includeSub = 'TRUE';
      const p = c.path || '/';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expires = c.expires > 0 ? Math.floor(c.expires) : 0;
      lines.push(
        [domain, includeSub, p, secure, expires, c.name, c.value].join('\t'),
      );
    }
    return lines.join('\n') + '\n';
  }

  getStatus(): { exists: boolean; ageSec: number } {
    try {
      const stat = fs.statSync(this.cookiesPath);
      const ageSec = Math.floor((Date.now() - stat.mtime.getTime()) / 1000);
      return { exists: true, ageSec };
    } catch {
      return { exists: false, ageSec: 0 };
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private async closeBrowser() {
    if (this.activeBrowser) {
      try {
        await this.activeBrowser.close();
      } catch {
        /* best-effort */
      }
      this.activeBrowser = null;
    }
  }
}
