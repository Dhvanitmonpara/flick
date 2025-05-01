import http from "http";
import { env } from "./conf/env.js";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { Redis } from "ioredis";
import cookieParser from "cookie-parser";
// import './socketHandler.js'

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.accessControlOrigin, // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

if (typeof Redis === "undefined") throw new Error("Redis is not installed");
const redis = new Redis({
  host: env.redisHost,
  port: parseInt(env.redisPort),
});

const corsOptions = {
  origin: env.accessControlOrigin, // Default to localhost
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  optionsSuccessStatus: 200,
};

// CORS middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.options("*", cors());

const commonPublicRoute = "/api/public/v1/";
const commonAdminRoute = "/api/admin/v1/";

import postRouter from "./routes/post.routes.js";
import userRouter from "./routes/user.routes.js";
import collegeRouter from "./routes/college.routes.js";
import reportRouter from "./routes/manage.route.js";
import adminRouter from "./routes/admin.routes.js";

// public routes
app.use(`${commonPublicRoute}posts`, postRouter);
app.use(`${commonPublicRoute}users`, userRouter);
app.use(`${commonPublicRoute}colleges`, collegeRouter);

// admin routes
app.use(`${commonAdminRoute}routes`, reportRouter);
app.use(`${commonAdminRoute}auth`, adminRouter);

// Export server and app
export { app, server, io, redis };
