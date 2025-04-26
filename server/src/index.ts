import "./config/env.js"
import connectDB from "./db/index.js"
import { server } from "./app.js"
import { EventEmitter } from "node:events";

EventEmitter.defaultMaxListeners = 20; // or whatever makes sense

const port = process.env.HTTP_PORT || 8000

connectDB().then(() => {
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