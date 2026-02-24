import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";

const EXTERNAL_API = process.env.EXTERNAL_API_URL || "https://appmyjantes.mytoolsgroup.eu";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUrl = `${EXTERNAL_API}/api${req.url}`;

      const headers: Record<string, string> = {
        "host": new URL(EXTERNAL_API).host,
      };

      if (req.headers["content-type"]) {
        headers["content-type"] = req.headers["content-type"] as string;
      }
      if (req.headers["cookie"]) {
        headers["cookie"] = req.headers["cookie"] as string;
      }
      if (req.headers["authorization"]) {
        headers["authorization"] = req.headers["authorization"] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        redirect: "manual",
      };

      if (req.method !== "GET" && req.method !== "HEAD") {
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          fetchOptions.body = JSON.stringify(req.body);
        } else if (contentType.includes("multipart/form-data")) {
          fetchOptions.body = req.rawBody as any;
          headers["content-type"] = contentType;
        } else if (contentType.includes("urlencoded")) {
          const params = new URLSearchParams(req.body);
          fetchOptions.body = params.toString();
        } else if (req.rawBody) {
          fetchOptions.body = req.rawBody as any;
        } else {
          fetchOptions.body = JSON.stringify(req.body);
          headers["content-type"] = "application/json";
        }
      }

      const response = await fetch(targetUrl, fetchOptions);

      response.headers.forEach((value, key) => {
        const lk = key.toLowerCase();
        if (lk === "transfer-encoding") return;
        if (lk === "content-encoding") return;
        if (lk === "set-cookie") {
          res.appendHeader("set-cookie", value);
          return;
        }
        res.setHeader(key, value);
      });

      res.status(response.status);
      const body = await response.arrayBuffer();
      res.send(Buffer.from(body));
    } catch (err: any) {
      console.error("API proxy error:", err.message);
      res.status(502).json({ message: "Erreur de connexion au serveur API" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
