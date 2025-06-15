import { DefaultEventsMap, Server, Socket } from "socket.io";
import { NotificationModel } from "../models/notification.model.js";

class SocketService {
  handleSocketError = (socket: any, error: any) => {
    console.error(`Socket ${socket.id} error:`, error);
    socket.emit("operation-error", {
      code: error.code || "GENERIC_ERROR",
      message: error.message,
    });
  };

  getNotificationCount = async (userId: string) => {
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
  listenSocket = (
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) => {
    console.log(`User connected: ${socket.id}`);

    socket.emit("user-connected", { socketId: socket.id });

    socket.on("initial-setup", async (data) => {
      try {
        const { userId } = data;

        const notificationCount = await this.getNotificationCount(userId);
        socket.emit("notification-count", { count: notificationCount });
      } catch (error) {
        this.handleSocketError(socket, error);
      }
    });

    socket.on("disconnect", () => {
      try {
        console.log(`User disconnected: ${socket.id}`);
      } catch (error) {
        this.handleSocketError(socket, error);
      }
    });
  };
}

export { SocketService };
