const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let waitingUsers = [];

io.on("connection", (socket) => {

  socket.on("findPartner", (data) => {

    socket.myGender = data.myGender;
    socket.findGender = data.findGender;

    const matchIndex = waitingUsers.findIndex(user => {
      return (
        (socket.findGender === "Any" || user.myGender === socket.findGender) &&
        (user.findGender === "Any" || socket.myGender === user.findGender)
      );
    });

    if (matchIndex !== -1) {
      const partner = waitingUsers.splice(matchIndex, 1)[0];

      socket.partner = partner;
      partner.partner = socket;

      socket.emit("matched", partner.myGender);
      partner.emit("matched", socket.myGender);

    } else {
      waitingUsers.push(socket);
      socket.emit("waiting");
    }
  });

  socket.on("chatMessage", (msg) => {
    if (socket.partner) {
      socket.partner.emit("chatMessage", msg);
    }
  });

  socket.on("leaveChat", () => {

    if (socket.partner) {
      socket.partner.emit("partnerLeft");
      socket.partner.partner = null;
    }

    socket.partner = null;
  });

  socket.on("disconnect", () => {

    if (socket.partner) {
      socket.partner.emit("partnerLeft");
      socket.partner.partner = null;
    }

    waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
  });

});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
