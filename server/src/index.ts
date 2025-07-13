import connectDB from "./db/index.js"
import { server } from "./app.js"
import { EventEmitter } from "node:events";
import { env } from "./conf/env.js";

EventEmitter.defaultMaxListeners = 20; // or whatever makes sense

connectDB().then(() => {
    const port = parseInt(env.port || "3000", 10)
    server.listen(port, () => {
        console.log(`Server is listening to port ${port}`)
    })
    server.on("error", (error) => {
        console.log("ERROR: ", error)
        throw error
    })
}).catch((error) => {
    console.log("MongoDB connection failed: ", error)
})