const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = {};
let waitingUsers = [];

io.on("connection", (socket) => {

socket.on("findPartner", ({ myGender, findGender }) => {

users[socket.id] = {
id: socket.id,
myGender,
findGender,
partner: null
};

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
waitingUsers.splice(foundIndex,1);

users[socket.id].partner = partnerId;
users[partnerId].partner = socket.id;

io.to(socket.id).emit("matched", users[partnerId].myGender);
io.to(partnerId).emit("matched", users[socket.id].myGender);

} else {
waitingUsers.push(socket.id);
socket.emit("waiting");
}
});

socket.on("chatMessage", (msg) => {
const partnerId = users[socket.id]?.partner;
if (partnerId) {
io.to(partnerId).emit("chatMessage", msg);
}
});

socket.on("leaveChat", () => {
const partnerId = users[socket.id]?.partner;

if (partnerId && users[partnerId]) {
io.to(partnerId).emit("partnerLeft");
users[partnerId].partner = null;
}

users[socket.id].partner = null;
});

socket.on("disconnect", () => {
const partnerId = users[socket.id]?.partner;

if (partnerId && users[partnerId]) {
io.to(partnerId).emit("partnerLeft");
users[partnerId].partner = null;
}

waitingUsers = waitingUsers.filter(id => id !== socket.id);
delete users[socket.id];
});

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
console.log("Server running on port", PORT);
});
