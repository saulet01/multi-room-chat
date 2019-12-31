var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
// Static Folder
app.use('/application', express.static('application'))

// Main array of users object that stores username and their room
let users = [];
// Store private room name and password
let roomWithPassword = {};
// Admin objects 
let admins = {};
// Store users socket
var socketStore = {};
// Store banned users object
let bannedUsers = {};

server.listen(process.env.PORT || 3000);
console.log('Server running...');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html')
});

io.sockets.on('connection', function(socket){
  // **************************************
  // Disconnect
  // **************************************
  socket.on('disconnect', function(data){
    // Simple notification to everyone in 'lobby' room that users leave
    socket.broadcast.to('lobby').emit('notifications', `${socket.username} left room`);
    // Remove disconnected user from users array of object
    users = users.filter(i => { return i.username !== socket.username });
    updateUsersAndRooms();
    // Remove disconnected user from admins object
    delete admins[socket.username];
    updateAdminsInRooms();
  });

  // **************************************
  // Send Message Within Same Room
  // **************************************
  socket.on('send message', function(data){
    io.sockets.in(socket.room).emit('new message', {msg: data, user: socket.username});
  });

  // **************************************
  // Send Private Message (no matter rooms)
  // **************************************
  socket.on('send private message', function(username, messagePrivate){
    // Get Socket Id to send Private Message
    for(var j in socketStore){
      if(j == username){
        io.sockets.to(socketStore[j].id).emit('new secret message', {msg: messagePrivate, username: socket.username});
        socket.emit('new secret message', {msg: messagePrivate, username: socket.username});
      }
    }
  });

  // **************************************
  // Create New Room Without Password
  // **************************************
  socket.on('create room without password', function(roomName, callback){
    // Change Room (left old room)
    socket.leave(socket.room);
    // Join to new room
    socket.join(roomName);
    // Notify everyone in the old room that users left room
    socket.broadcast.to(socket.room).emit('notifications', `${socket.username} left room`);
    // Join to new room
    socket.room = roomName;

     // Update users array of objects that users has changed room
    objIndex = users.findIndex((obj => obj.username == socket.username));
    users[objIndex].room = roomName;
    // update admins object as follows: {"username": "room"}
    admins[socket.username] = roomName;
    callback(true);
    updateUsersAndRooms();
    updateAdminsInRooms();
  });

  // **************************************
  // Create New Room With Password
  // **************************************
  socket.on('create room with password', function(roomName, roomPass, callback){
    // Change Room (left old room)
    socket.leave(socket.room);
    // Join to new room
    socket.join(roomName);
    // Notify everyone in the old room that users left room
    socket.broadcast.to(socket.room).emit('notifications', `${socket.username} left room`);
    // Join to new room
    socket.room = roomName;

    // Update users array of objects that users has changed room
    objIndex = users.findIndex((obj => obj.username == socket.username));
    users[objIndex].room = roomName;
    // Store room and associated password in roomWithPassword object as follows: { "room": "password" }
    roomWithPassword[roomName] = roomPass;
    // update admins object as follows: {"username": "room"}
    admins[socket.username] = roomName;
    callback(true);
    updateUsersAndRooms();
    updateAdminsInRooms();
  });

  // **************************************
  // Creative Portion: Give Administrator Privilege to User
  // **************************************
  socket.on('assign admin', function(username, callback){
    // Check whether socket.username is admin of the room or not. If socket is admin the contienue. Otherwise, return
    for (var j in admins){
      if(socket.username == j && socket.room == admins[j]){
        // update admins object as follows: {"username": "room"}
        admins[username] = admins[j];
        updateAdminsInRooms();
        callback(true);
      }else{
        callback(false);
      }
    }
  });

  // **************************************
  // Kick User Out of the Room (kicked user could rejoin to the room)
  // **************************************
  socket.on('kick user', function(username, callback){
    // Check whether socket.username is admin of the room or not. If socket is admin the contienue. Otherwise, return
    for(var i in admins){
      if(socket.username == i && socket.room == admins[i]){
        // Get kicked username socket in order to kick him/her from the room
        for(var d in socketStore){
          if(d == username){
             // Kick user to 'lobby' room
            socketStore[d].leave(socket.room);
            socketStore[d].join('lobby');
            socketStore[d].room = 'lobby';
            // Update users array of objects that users has changed room
            objIndex = users.findIndex((obj => obj.username == username));
            users[objIndex].room = 'lobby';
            updateUsersAndRooms();
            callback(true);      
          }
        }
      }
    }
  });

  // **************************************
  // Ban User (banned user cannot rejoin to the room)
  // **************************************
  socket.on('ban user', function(username, callback){
    // Check whether socket.username is admin of the room or not. If socket is admin the contienue. Otherwise, return
    for(var i in admins){
      if(socket.username == i && socket.room == admins[i]){
        // Get banned username socket in order to kick him/her from the room
        for(var d in socketStore){
          if(d == username){
            bannedUsers[username] = socketStore[d].room;
            // Kick user to 'lobby' room
            socketStore[d].leave(socket.room);
            socketStore[d].join('lobby');
            socketStore[d].room = 'lobby';
             // Update users array of objects that users has changed room
            objIndex = users.findIndex((obj => obj.username == username));
            users[objIndex].room = 'lobby';
            updateUsersAndRooms();
            callback(true);      
          }
        }
      }
    }
  });
  
  // **************************************
  // Join to Room With Password
  // **************************************
  socket.on('join room with password', function(joinRoomName, joinRoomPass, callback){
      // Check whether is banned or not. If not then continue, otherwise return
    for(var j in bannedUsers){
      if(j == socket.username && bannedUsers[j] == joinRoomName){
        callback(false);
        return;
      }
    }
    for(var i in roomWithPassword){
      if(joinRoomName === i && joinRoomPass === roomWithPassword[i]){
        callback(true);
        // Change from old room to new room 
        socket.leave(socket.room);
        socket.join(joinRoomName);
         // Notify everybody that user has left the room
        socket.broadcast.to(socket.room).emit('notifications', `${socket.username} left room`);
        socket.room = joinRoomName;
         // Update users array of objects that users has changed room
        objIndex = users.findIndex((obj => obj.username == socket.username));
        users[objIndex].room = joinRoomName;
        updateUsersAndRooms();
      }
    }
  });

  // **************************************
  // Join Room Without Password
  // **************************************
  socket.on('join room without password', function(joinRoomName, callback){
    // Get All room
    let uniqueRooms = [...new Set(users.map(item => item.room))];
    // Check whether is banned or not. If not then continue, otherwise return
    for(var j in bannedUsers){
      if(j == socket.username && bannedUsers[j] == joinRoomName){
        callback(false);
        return;
      }
    }
    uniqueRooms.map(d => {
      if(d === joinRoomName){
        callback(true);
        // Change from old room to new room 
        socket.leave(socket.room);
        socket.join(joinRoomName);
        // Notify everybody that user has left the room
        socket.broadcast.to(socket.room).emit('notifications', `${socket.username} left room`);
        socket.room = joinRoomName;
        // Update users array of objects that users has changed room
        objIndex = users.findIndex((obj => obj.username == socket.username));
        users[objIndex].room = joinRoomName;
        updateUsersAndRooms();
      }
    });
  });

  // **************************************
  // New User
  // **************************************
  socket.on('new user', function(data, callback){
    var theData = {};
    // Check whether users with the same name in rooms or not 
    var userIsExist = users.find( u => {
      return u.username === data;
    })
    if (userIsExist){
      callback(false);
    }else{
      callback(true);

      socket.username = data;
      theData.username = data;
      theData.room = "lobby";
      // Store users socket
      socketStore[data] = socket;
      // Store users as array of objects
      users.push(theData);

      // Assign any users when logs in in to 'lobby' room
      socket.room = 'lobby';
      socket.join('lobby');
      
      // Notification everyone in the room that username connected
      io.sockets.emit('notifications', `${socket.username} connected!`);
      updateUsersAndRooms();
      console.log(users);
    }
  });

  // **************************************
  // Update Users and Associated Rooms
  // **************************************
  function updateUsersAndRooms(){
    io.sockets.emit('getUsersInRoom', users);
  }

  function updateAdminsInRooms(){
    io.sockets.emit('get admins in rooms', admins);
  }

});