import express from "express";
import type { Platform } from "@clip-central/shared";
import type { WorkerServices } from "./services.js";
import {
  refreshCampaignClips,
  refreshClip,
  syncClipMedia,
  verifyProfile,
  verifyVideo,
} from "./services.js";

function authMiddleware(apiKey: string) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const key = req.headers["x-api-key"] ?? req.headers.authorization?.replace("Bearer ", "");
    if (key !== apiKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

export function createHttpServer(svc: WorkerServices, apiKey: string): express.Application {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware(apiKey));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/verify-profile", async (req, res) => {
    const { platform, handle, verificationCode } = req.body as {
      platform?: Platform;
      handle?: string;
      verificationCode?: string;
    };

    if (!platform || !handle || !verificationCode) {
      res.status(400).json({ error: "platform, handle, and verificationCode required" });
      return;
    }

    const result = await verifyProfile(svc, platform, handle, verificationCode);
    console.log("verify-profile", result);
    res.json(result);
  });

  app.post("/verify-video", async (req, res) => {
    const { url, discordId } = req.body as { url?: string; discordId?: string };

    if (!url || !discordId) {
      res.status(400).json({ error: "url and discordId required" });
      return;
    }

    const result = await verifyVideo(svc, url, discordId);
    res.json(result);
  });

  app.post("/update-clip", async (req, res) => {
    const { clipId } = req.body as { clipId?: string };
    if (!clipId) {
      res.status(400).json({ error: "clipId required" });
      return;
    }

    try {
      const result = await refreshClip(svc, clipId);
      res.json(result);
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });

  app.post("/update-campaign", async (req, res) => {
    const { campaignId } = req.body as { campaignId?: string };
    if (!campaignId) {
      res.status(400).json({ error: "campaignId required" });
      return;
    }

    const result = await refreshCampaignClips(svc, campaignId);
    res.json(result);
  });

  app.post("/sync-clip-media", async (req, res) => {
    const { clipId } = req.body as { clipId?: string };
    if (!clipId) {
      res.status(400).json({ error: "clipId required" });
      return;
    }

    try {
      await syncClipMedia(svc, clipId);
      res.json({ ok: true });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : "Failed" });
    }
  });

  return app;
}
