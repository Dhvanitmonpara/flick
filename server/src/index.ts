import connectDB from "./db/index.js"
import { server } from "./app.js"
import { EventEmitter } from "node:events";
import { env } from "./conf/env.js";
import { createSocketServer } from "./services/socket.service.js";

EventEmitter.defaultMaxListeners = 20; // or whatever makes sense

connectDB().then(() => {
    server.listen(env.port, () => {
        console.log(`Server is listening to port ${env.port}`)
        createSocketServer()
    })
    server.on("error", (error) => {
        console.log("ERROR: ", error)
        throw error
    })
}).catch((error) => {
    console.log("MongoDB connection failed: ", error)
})