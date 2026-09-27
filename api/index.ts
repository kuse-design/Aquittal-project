import serverless from "serverless-http";
import { createApp } from "../server/_core/index";

let cachedHandler: ReturnType<typeof serverless> | null = null;

function getHandler() {
  if (!cachedHandler) {
    const app = createApp();
    cachedHandler = serverless(app);
  }
  return cachedHandler;
}

export default async function handler(req: any, res: any) {
  const serverlessHandler = getHandler();
  return serverlessHandler(req, res);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
    responseLimit: "8mb",
  },
};