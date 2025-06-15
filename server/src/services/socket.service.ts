import { DefaultEventsMap, Server } from "socket.io";
import { server } from "../app.js";
import { NotificationModel } from "../models/notification.model.js";
import allowedOrigins from "../conf/allowedOrigins.js";

type IOServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  any
>;

let isInitialized = false;
let ioReady: Promise<IOServer>;
let ioResolve: (io: IOServer) => void;

ioReady = new Promise((resolve) => {
  ioResolve = resolve;
});

const createSocketServer = () => {
  if (isInitialized) return;
  isInitialized = true;

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  ioResolve(io);

  const handleSocketError = (socket: any, error: any) => {
    console.error(`Socket ${socket.id} error:`, error);
    socket.emit("operation-error", {
      code: error.code || "GENERIC_ERROR",
      message: error.message,
    });
  };

  const getNotificationCount = async (userId: string) => {
    try {
      const notificationCount = await NotificationModel.find({
        receiverId: userId,
        seen: false,
      }).countDocuments();
      return notificationCount ?? 0;
    } catch (error) {
      console.log("Error getting notification count: ", error);
      return 0;
    }
  };

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.emit("user-connected", { socketId: socket.id });

    socket.on("initial-setup", async (data) => {
      try {
        const { userId } = data;

        const notificationCount = await getNotificationCount(userId);
        socket.emit("notification-count", { count: notificationCount });
      } catch (error) {
        handleSocketError(socket, error);
      }
    });

    socket.on("disconnect", () => {
      try {
        console.log(`User disconnected: ${socket.id}`);
      } catch (error) {
        handleSocketError(socket, error);
      }
    });
  });
};

const getIOAsync = () => ioReady

export { getIOAsync, createSocketServer, IOServer };
