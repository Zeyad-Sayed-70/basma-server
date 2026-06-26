import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface OpencodeClient {
  session: {
    list: () => Promise<unknown>;
    create: (params: { body: unknown }) => Promise<{ data: { id: string } }>;
    prompt: (params: { path: { id: string }; body: unknown }) => Promise<{
      data: { parts: { type: string; text?: string; tool?: string; state?: string; callID?: string }[] };
    }>;
  };
}

@Injectable()
export class OpencodeService implements OnModuleDestroy {
  private readonly logger = new Logger(OpencodeService.name);
  private client: OpencodeClient | null = null;
  private readonly baseUrl: string;
  private readonly zenModel: string;
  private readonly nimModel: string;
  private readonly nimApiKey: string;
  private readonly nimBaseUrl: string;
  private readonly serverProcess: any = null;
  private readonly projectsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = `http://${configService.get('OPENCODE_SERVER_HOSTNAME', '127.0.0.1')}:${configService.get('OPENCODE_SERVER_PORT', '4096')}`;
    this.zenModel = configService.get(
      'OPENCODE_ZEN_MODEL',
      'opencode/deepseek-v3-0324',
    );
    this.nimModel = configService.get('NIM_MODEL', 'nvidia/deepseek-r1');
    this.nimApiKey = configService.get('NIM_API_KEY', '');
    this.nimBaseUrl = configService.get(
      'NIM_BASE_URL',
      'https://integrate.api.nvidia.com/v1',
    );
    this.projectsDir = path.join(os.tmpdir(), 'basma-agent');
    fs.mkdirSync(this.projectsDir, { recursive: true });
  }

  async onModuleInit() {
    try {
      const { createOpencodeClient } = await import(
        '@opencode-ai/sdk'
      ) as { createOpencodeClient: (opts: { baseUrl: string }) => OpencodeClient };
      this.client = createOpencodeClient({ baseUrl: this.baseUrl }) as unknown as OpencodeClient;
      await this.client.session.list();
      this.logger.log(`Connected to OpenCode server at ${this.baseUrl}`);
    } catch {
      this.logger.warn(
        `Could not connect to OpenCode server at ${this.baseUrl}. Make sure 'opencode serve' is running.`,
      );
    }
  }

  onModuleDestroy() {}

  getClient(): OpencodeClient | null {
    return this.client;
  }

  getZenModel(): string {
    return this.zenModel;
  }

  getNimModel(): string {
    return this.nimModel;
  }

  getNimApiKey(): string {
    return this.nimApiKey;
  }

  getNimBaseUrl(): string {
    return this.nimBaseUrl;
  }

  getProjectsDir(): string {
    return this.projectsDir;
  }

  getTeacherProjectDir(instanceId: string): string {
    return path.join(this.projectsDir, instanceId);
  }

  ensureTeacherProject(
    instanceId: string,
    teacherName: string,
    agentMdContent: string,
  ) {
    const projectDir = this.getTeacherProjectDir(instanceId);
    fs.mkdirSync(projectDir, { recursive: true });

    const opencodeConfig = {
      $schema: 'https://opencode.ai/config.json',
      model: this.zenModel,
      permission: {
        edit: 'deny',
        write: 'deny',
        bash: 'deny',
        read: 'deny',
        list: 'deny',
        glob: 'deny',
        grep: 'deny',
        webfetch: 'deny',
        websearch: 'deny',
        external_directory: 'deny',
        lsp: 'deny',
        skill: 'deny',
        task: 'deny',
        todowrite: 'deny',
        question: 'deny',
      },
      mcp: {
        'basma-mcp': {
          type: 'local' as const,
          command: ['node', path.join(__dirname, 'mcp-server', 'index.js')],
          environment: {
            BASMA_INSTANCE_ID: instanceId,
            DATABASE_URL: this.configService.getOrThrow<string>('DATABASE_URL'),
            NODE_ENV: this.configService.get<string>('NODE_ENV', 'development'),
          },
          enabled: true,
        },
      },
      agent: {
        'teacher-assistant': {
          description: `AI teaching assistant for teacher ${teacherName}`,
          mode: 'primary' as const,
          prompt: `{file:./agent.md}`,
          permission: {
            edit: 'deny',
            write: 'deny',
            bash: 'deny',
            read: 'deny',
            list: 'deny',
            glob: 'deny',
            grep: 'deny',
            webfetch: 'deny',
            websearch: 'deny',
            external_directory: 'deny',
            lsp: 'deny',
            skill: 'deny',
            task: 'deny',
            todowrite: 'deny',
            question: 'deny',
          },
        },
      },
      tools: {
        'basma-mcp_*': true,
      },
    };

    fs.writeFileSync(
      path.join(projectDir, 'opencode.json'),
      JSON.stringify(opencodeConfig, null, 2),
    );

    fs.writeFileSync(path.join(projectDir, 'agent.md'), agentMdContent);
    fs.writeFileSync(
      path.join(projectDir, 'AGENTS.md'),
      `# ${teacherName}'s AI Assistant Project\n\nThis is the AI teaching assistant for ${teacherName}.\n`,
    );
  }

  writeAgentMd(instanceId: string, content: string) {
    const projectDir = this.getTeacherProjectDir(instanceId);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'agent.md'), content);
  }

  readAgentMd(instanceId: string): string | null {
    const filePath = path.join(
      this.getTeacherProjectDir(instanceId),
      'agent.md',
    );
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}
