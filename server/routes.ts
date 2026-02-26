import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";

const EXTERNAL_API = process.env.EXTERNAL_API_URL || "https://appmyjantes5.mytoolsgroup.eu";

export async function registerRoutes(app: Express): Promise<Server> {
  app.delete("/api/users/me", async (req: Request, res: Response) => {
    try {
      const headers: Record<string, string> = {
        "host": new URL(EXTERNAL_API).host,
      };
      if (req.headers["cookie"]) {
        headers["cookie"] = req.headers["cookie"] as string;
      }
      if (req.headers["authorization"]) {
        headers["authorization"] = req.headers["authorization"] as string;
      }

      const userRes = await fetch(`${EXTERNAL_API}/api/auth/user`, {
        method: "GET",
        headers,
        redirect: "manual",
      });

      if (!userRes.ok) {
        return res.status(401).json({ message: "Non authentifié. Veuillez vous reconnecter." });
      }

      const userData = await userRes.json() as any;
      const userId = userData?.id || userData?.user?.id || userData?._id;

      if (!userId) {
        return res.status(400).json({ message: "Impossible d'identifier l'utilisateur." });
      }

      const deleteRes = await fetch(`${EXTERNAL_API}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        redirect: "manual",
      });

      if (deleteRes.ok || deleteRes.status === 204) {
        return res.status(200).json({ message: "Compte supprimé avec succès." });
      }

      const selfDeleteRes = await fetch(`${EXTERNAL_API}/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        redirect: "manual",
      });

      if (selfDeleteRes.ok || selfDeleteRes.status === 204) {
        return res.status(200).json({ message: "Compte supprimé avec succès." });
      }

      const selfDeleteMe = await fetch(`${EXTERNAL_API}/api/users/me`, {
        method: "DELETE",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        redirect: "manual",
      });

      if (selfDeleteMe.ok || selfDeleteMe.status === 204) {
        return res.status(200).json({ message: "Compte supprimé avec succès." });
      }

      const selfDeleteAccount = await fetch(`${EXTERNAL_API}/api/account/delete`, {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify({ userId, confirm: true }),
        redirect: "manual",
      });

      if (selfDeleteAccount.ok || selfDeleteAccount.status === 204) {
        return res.status(200).json({ message: "Compte supprimé avec succès." });
      }

      let errorBody = "";
      try { errorBody = await selfDeleteAccount.text(); } catch {}
      console.error("Account deletion failed - all endpoints tried:", {
        userId,
        adminStatus: deleteRes.status,
        usersStatus: selfDeleteRes.status,
        meStatus: selfDeleteMe.status,
        accountStatus: selfDeleteAccount.status,
        errorBody,
      });

      return res.status(500).json({
        message: "La suppression du compte a échoué. Veuillez contacter le support."
      });
    } catch (err: any) {
      console.error("Account deletion error:", err.message);
      return res.status(502).json({ message: "Erreur de connexion au serveur. Veuillez réessayer." });
    }
  });

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
