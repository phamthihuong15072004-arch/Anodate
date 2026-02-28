const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname));

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("findPartner", () => {
        if (waitingUser) {
            socket.partner = waitingUser;
            waitingUser.partner = socket;

            waitingUser = null;
        } else {
            waitingUser = socket;
        }
    });

    socket.on("chatMessage", (msg) => {
        if (socket.partner) {
            socket.partner.emit("chatMessage", "Người lạ: " + msg);
        }
    });

    socket.on("disconnect", () => {
        if (socket.partner) {
            socket.partner.emit("chatMessage", "Người lạ đã rời đi.");
            socket.partner.partner = null;
        }

        if (waitingUser === socket) {
            waitingUser = null;
        }

        console.log("User disconnected:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
