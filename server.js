const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = {};   // Lưu thông tin user
let waitingUsers = [];  // Hàng chờ

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Khi user tìm người
    socket.on("findPartner", ({ myGender, findGender }) => {

        // Lưu thông tin user
        users[socket.id] = {
            id: socket.id,
            myGender,
            findGender,
            partner: null
        };

        // Tìm người phù hợp trong hàng chờ
        let foundIndex = waitingUsers.findIndex(otherId => {
            const other = users[otherId];
            if (!other) return false;

            return (
                (findGender === "Any" || other.myGender === findGender) &&
                (other.findGender === "Any" || myGender === other.findGender)
            );
        });

        if (foundIndex !== -1) {
            const partnerId = waitingUsers[foundIndex];

            // Xoá khỏi hàng chờ
            waitingUsers.splice(foundIndex, 1);

            // Lưu partner cho cả hai
            users[socket.id].partner = partnerId;
            users[partnerId].partner = socket.id;

            // Báo match
            io.to(socket.id).emit("matched", users[partnerId].myGender);
            io.to(partnerId).emit("matched", users[socket.id].myGender);

        } else {
            // Nếu chưa tìm được thì thêm vào hàng chờ
            waitingUsers.push(socket.id);
            socket.emit("waiting");
        }
    });

    // Nhận tin nhắn
    socket.on("chatMessage", (msg) => {
        const partnerId = users[socket.id]?.partner;
        if (partnerId) {
            io.to(partnerId).emit("chatMessage", msg);
        }
    });

    // 🔥 Khi người dùng thoát
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        const partnerId = users[socket.id]?.partner;

        // Nếu có partner thì thông báo cho người kia
        if (partnerId && users[partnerId]) {
            io.to(partnerId).emit("partnerLeft");

            // Xoá partner của người kia
            users[partnerId].partner = null;
        }

        // Xoá khỏi hàng chờ nếu đang chờ
        waitingUsers = waitingUsers.filter(id => id !== socket.id);

        // Xoá user
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
