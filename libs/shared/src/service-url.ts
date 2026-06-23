export interface ResolveServiceUrlInput {
  /** Full URL, e.g. http://localhost:3001 */
  url?: string;
  /** Private hostname, e.g. discord-bot.railway.internal */
  host?: string;
  port?: string | number;
  defaultUrl: string;
  name: string;
}

const RAILWAY_TEMPLATE_MARKER = "$" + "{{";

/**
 * Resolve an internal service URL from either a full URL or host+port pair.
 * Railway: add DISCORD_BOT_PRIVATE_HOST / PORT as separate variable references
 * instead of pasting a composite Railway reference string as one URL value.
 */
export function resolveServiceUrl(input: ResolveServiceUrlInput): string {
  const rawUrl = input.url?.trim();

  if (rawUrl) {
    if (rawUrl.includes(RAILWAY_TEMPLATE_MARKER)) {
      throw new Error(
        `${input.name} contains an unexpanded Railway variable reference. ` +
          `Delete ${input.name} and use separate host + port variables instead (see DEPLOY.md).`,
      );
    }
    try {
      const parsed = new URL(rawUrl);
      return parsed.toString().replace(/\/$/, "");
    } catch {
      throw new Error(`${input.name} is not a valid URL: "${rawUrl}"`);
    }
  }

  const host = input.host?.trim();
  const port =
    input.port !== undefined && input.port !== "" ? String(input.port).trim() : "";

  if (host || port) {
    if (!host || !port) {
      throw new Error(
        `${input.name}: set both host and port, or neither. Got host="${host ?? ""}" port="${port}"`,
      );
    }
    if (host.includes(RAILWAY_TEMPLATE_MARKER) || port.includes(RAILWAY_TEMPLATE_MARKER)) {
      throw new Error(
        `${input.name} host/port contains an unexpanded Railway variable reference. ` +
          "Use Variables → Add Reference for each field.",
      );
    }
    return `http://${host}:${port}`;
  }

  return input.defaultUrl;
}
