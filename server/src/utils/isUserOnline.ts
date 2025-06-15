import { getIOAsync } from "../services/socket.service.js";

async function isUserOnline(userId: string): Promise<boolean> {
  const io = await getIOAsync()
  const sockets = await io.in(userId).fetchSockets();
  return sockets.length > 0;
}

export default isUserOnline;