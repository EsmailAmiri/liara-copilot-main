import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { MockLiaraClient, HttpLiaraClient, type LiaraClient } from '@copilot/liara-client';
import { defaultToolRegistry, classifyToolRisk, redact, type ToolContext } from '@copilot/tools';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const isLive = process.env.LIARA_MODE === 'live' && !!process.env.LIARA_API_TOKEN;

let client: LiaraClient;
if (isLive) {
  client = new HttpLiaraClient({
    apiToken: process.env.LIARA_API_TOKEN!,
    baseURL: process.env.LIARA_API_BASE_URL || 'https://api.iran.liara.ir',
    teamId: process.env.LIARA_TEAM_ID,
  });
} else {
  client = new MockLiaraClient('missing_env_500');
}

const server = new Server(
  {
    name: 'liara-copilot-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const toolContext: ToolContext = {
  client,
  traceId: `mcp_tr_${Date.now()}`,
};

// 1. List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = defaultToolRegistry.getAll();
  return {
    tools: tools.map((t) => {
      const risk = classifyToolRisk(t, {}, toolContext);
      return {
        name: t.name,
        description: `[Risk: ${risk.toUpperCase()}] ${t.description}`,
        inputSchema: {
          type: 'object',
          properties: {
            app: { type: 'string', description: 'Application identifier' },
            confirmed: {
              type: 'boolean',
              description: 'Required confirmation flag for high-risk tools',
            },
          },
        },
      };
    }),
  };
});

// 2. Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const tool = defaultToolRegistry.get(name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Tool "${name}" not found.` }],
      isError: true,
    };
  }

  const risk = classifyToolRisk(tool, args, toolContext);

  // If high risk and not confirmed by user: return APPROVAL_REQUIRED
  if (risk === 'high' && !args['confirmed']) {
    let card = null;
    if (tool.describe) {
      card = tool.describe(args as never, toolContext);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ok: false,
              code: 'APPROVAL_REQUIRED',
              message:
                'این عملیات دارای سطح ریسک بالا (High Risk) است و بدون تأیید صریح اجرا نمی‌شود. لطفاً برای اجرا مقدار confirmed: true ارسال نمایید.',
              card,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  try {
    const res = await defaultToolRegistry.executeTool(name, args, toolContext);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(redact(res), null, 2),
        },
      ],
      isError: !res.ok,
    };
  } catch (err: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((err) => {
  console.error('Fatal MCP Server Error:', err);
  process.exit(1);
});
