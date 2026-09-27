import { createApp } from "./index";
import { createServer } from "http";

const app = createApp();
const server = createServer(app);
const port = parseInt(process.env.PORT || "3000");

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});