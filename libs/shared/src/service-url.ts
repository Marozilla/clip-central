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

function isBrokenCompositeUrl(url: string): boolean {
  if (/^https?:\/\/:?$/i.test(url.trim())) return true;
  try {
    const parsed = new URL(url);
    return !parsed.hostname;
  } catch {
    return false;
  }
}

function railwayReferenceHelp(name: string, hostVar: string, portVar: string): string {
  return (
    `${name} is invalid (often shows as "http://:"). ` +
    `Delete ${name} from this service and from Shared Variables. ` +
    `In Railway → Variables → Add Reference, set ${hostVar} and ${portVar} separately. ` +
    "Service names on the canvas must match exactly (e.g. discord-bot, videos-worker). " +
    "See DEPLOY.md."
  );
}

/**
 * Resolve an internal service URL from either a full URL or host+port pair.
 * Railway: add DISCORD_BOT_PRIVATE_HOST / PORT as separate variable references
 * instead of pasting a composite Railway reference string as one URL value.
 */
export function resolveServiceUrl(input: ResolveServiceUrlInput): string {
  const originalUrl = input.url?.trim();
  let rawUrl = originalUrl;

  if (rawUrl?.includes(RAILWAY_TEMPLATE_MARKER)) {
    throw new Error(railwayReferenceHelp(input.name, "HOST", "PORT"));
  }

  if (rawUrl) {
    if (isBrokenCompositeUrl(rawUrl)) {
      rawUrl = undefined;
    } else {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname) {
          return parsed.toString().replace(/\/$/, "");
        }
        rawUrl = undefined;
      } catch {
        throw new Error(`${input.name} is not a valid URL: "${rawUrl}"`);
      }
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

  if (originalUrl && isBrokenCompositeUrl(originalUrl)) {
    const [hostVar, portVar] =
      input.name === "WORKER_URL"
        ? ["VIDEOS_WORKER_PRIVATE_HOST", "VIDEOS_WORKER_PRIVATE_PORT"]
        : ["DISCORD_BOT_PRIVATE_HOST", "DISCORD_BOT_PRIVATE_PORT"];
    throw new Error(railwayReferenceHelp(input.name, hostVar, portVar));
  }

  return input.defaultUrl;
}
