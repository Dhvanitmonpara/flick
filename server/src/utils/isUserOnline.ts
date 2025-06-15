import { io } from "../app.js";

async function isUserOnline(userId: string): Promise<boolean> {
  const sockets = await io.in(userId).fetchSockets();
  return sockets.length > 0;
}

export default isUserOnline;