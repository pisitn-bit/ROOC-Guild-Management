import app from "../server.js";

export default function handler(req: any, res: any) {
  // Safely resolve the Express app function handling both ESM and CommonJS default exports
  const expressApp = (app as any).default || app;
  return expressApp(req, res);
}
