import http from "http";
import { env } from "./conf/env.js";
import express from "express";
import cors, { CorsOptions } from "cors";
import { Server } from "socket.io";
import { Redis } from "ioredis";
import cookieParser from "cookie-parser";
// import './socketHandler.js'

const allowedOrigins = [env.accessControlOrigin, env.adminAccessControlOrigin];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

if (typeof Redis === "undefined") throw new Error("Redis is not installed");
const redis = new Redis({
  host: env.redisHost,
  port: parseInt(env.redisPort),
});

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// CORS middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

const commonPublicRoute = "/api/public/v1/";
const commonAdminRoute = "/api/admin/v1/";

import postRouter from "./routes/post.routes.js";
import commentRouter from "./routes/comment.routes.js";
import userRouter from "./routes/user.routes.js";
import voteRouter from "./routes/vote.routes.js";
import collegeRouter from "./routes/college.routes.js";
import manageRouter from "./routes/manage.route.js";
import reportRouter from "./routes/report.routes.js";
import adminRouter from "./routes/admin.routes.js";
import { verifyAdminJWT } from "./middleware/auth.middleware.js";
import { sessionMiddleware } from "./middleware/session.middleware.js";

// globale middlewares
app.use(sessionMiddleware)

// public routes
app.use(`${commonPublicRoute}posts`, postRouter);
app.use(`${commonPublicRoute}users`, userRouter);
app.use(`${commonPublicRoute}votes`, voteRouter);
app.use(`${commonPublicRoute}comments`, commentRouter);
app.use(`${commonPublicRoute}reports`, reportRouter);

// admin routes
app.use(`${commonAdminRoute}manage`, verifyAdminJWT, manageRouter);
app.use(`${commonAdminRoute}colleges`, verifyAdminJWT, collegeRouter);
app.use(`${commonAdminRoute}auth`, adminRouter);

// Export server and app
export { app, server, io, redis };
