// Socket connection
let socket = io.connect();
// Toast Notifications
$('.toast').toast('hide');

// **************************************
// Send Public Messages Within Rooms
// **************************************
$('#messageSection').submit((event) => {
  event.preventDefault();
  socket.emit('send message', $('#sendMessagesText').val());
  $('#sendMessagesText').val('');
});

// **************************************
// Send Private Messages
// **************************************
$('#sendPrivateMessage').submit((event) => {
  event.preventDefault();
  // get username and message
  let username = $('#privateMessageUsername').val();
  let msg = $('#messagePrivate').val();
  socket.emit('send private message', username, msg);
  // clear the value
  $('#messagePrivate').val('');
});

// **************************************
// Get all users and their associated rooms
// **************************************
socket.on('getUsersInRoom', (data) => {
  // Get all rooms in array for instance: ['lobby', 'private message']
  let uniqueRooms = [...new Set(data.map(item => item.room))];
  let availableRooms = '';
  let html = '';
  data.map(d => {
    html += `<small class="list-group-item"><strong>${d.username}</strong> is in '${d.room}' room</small>`;
  })
  uniqueRooms.map(d => {
    availableRooms += `<li class="list-group-item">${d}</li>`;
  });

  // Append online users and their associated room
  $('.online-users').html(html);
  // Get available rooms
  $('.available-rooms').html(availableRooms);
});

// **************************************
// Admins in Rooms
// **************************************
socket.on('get admins in rooms', (data) => {
  let adminInRooms = '';
  for(var j in data){
    adminInRooms += `<small class="list-group-item"><strong>${j}</strong> in "${data[j]}" room</small>`;
  }
  $('.admins-in-rooms').html(adminInRooms);
});

// **************************************
// Public Messages 
// **************************************
socket.on('new message',(data) => {
    $('.messages').append(`<p><strong>${data.user}: </strong>${data.msg}</p>`);
})

// **************************************
// Private Messages
// **************************************
socket.on('new secret message', (data) => {
  $('.private-messages-area').append(`<p><strong>${data.username} </strong>${data.msg}</p>`);
});

// **************************************
// Notifications (whenever users connect, disconnect or leave rooms)
// **************************************
socket.on('notifications', (data) => {
    $('.notifications').append(`<p class="lead">${data}</p>`)
});

// **************************************
// Login Section
// **************************************
$('#userForm').submit( (event) => {
  event.preventDefault();
  let nameUser = $('#usernameEnter').val();
  socket.emit('new user', nameUser, (data) => {
    if(data){
      // Remove Login Scetion
      $('.login-section').remove();
      // Change Jumbotron Welcome Text
      $('.jumbotron .container').append(`<h1 class="display-4 text-center">Welcome "${nameUser}"</h1>`);
      // Show all hidden section
      $('.user-provided-name').show();
      // Add animation
      $('.jumbotron h1').addClass('jumbtron-animation');
    }else{
      // Failed notification with message:
      toastFailed('User with same username already exists. Choose different username!');
    }
  });
});

// **************************************
// Join Room
// **************************************
$('#joinRoom').submit( (event) => {
  event.preventDefault();
  // Get Room Name
  let joinRoomName = $('#joinRoomName').val();
  // Get Room Passwird
  let joinRoomPass = $('#joinRoomPassword').val();
  if(joinRoomPass){
    socket.emit('join room with password', joinRoomName, joinRoomPass, (data) => {
      if(data){
        // Succesfull notification with message:
        toastSuccess(`You joined to "${joinRoomName}" room`);
        // Remove previous message from old room
        $('.messages').empty();
        scrollToTop();
      }else{
        // Failed notification with message:
        toastFailed(`Wrong password! Or you have been banned!`);
        scrollToTop();
      }
    });
  }else{
    socket.emit('join room without password', joinRoomName, (data) => {
      if(data){
        // Succesfull notification with message:
        toastSuccess(`You joined to "${joinRoomName}" room`);
        // Remove previous message from old room
        $('.messages').empty();
        scrollToTop();
      }else{
        // Failed notification with message:
        toastFailed(`Entered room does not exist. Or you have been banned`);
        scrollToTop();
      }
    });
  }
  // clear the value
  $('#joinRoomName').val('');
  $('#joinRoomPassword').val('');
});

// **************************************
// Admin Panel: Kick User
// **************************************
$('#kickUserForm').submit((event) => {
  event.preventDefault();
  // Get username to kick
  let username = $('.kickUsername').val();
  socket.emit('kick user', username, (data) => {
    if(data){
      // Succesfull notification with message:
      toastSuccess(`"${username}" user was kicked out`);
      scrollToTop();
    }else{
      // Failed notification with message:
      toastFailed(`You do not have administrator privilege, or entered username does not exist!`);
      scrollToTop();
    }
  });
  // clear the value
  $('.kickUsername').val('');
});

// **************************************
// Admin Panel: Ban User
// **************************************
$('#banForm').submit((event) => {
  event.preventDefault();
  // Get username to ban
  let username = $('.banUsername').val();
  socket.emit('ban user', username, (data) => {
    if(data){
      // Succesfull notification with message:
      toastSuccess(`"${username}" user was banned!`);
      scrollToTop();
    }else{
      // Failed notification with message:
      toastFailed(`You do not have administrator privilege, or entered username does not exist!`);
      scrollToTop();
    }
  });
  // clear the value
  $('.banUsername').val('');
});

// **************************************
// Creative Portion: Give admin privilege to a user
// **************************************
$('#giveAdminPrivilige').submit((event) => {
  event.preventDefault();
  // Get username to assign admin privilege
  let username = $('.assign-admin-privilege').val();
  socket.emit('assign admin', username, (data) => {
    if(data){
      // Succesfull notification with message:
      toastSuccess(`"${username}" has become admin`);
      scrollToTop();
    }else{
      // Failed notification with message:
      toastFailed(`You do not have administrator privilege, or entered username does not exist!`);
      scrollToTop();
    }
  });
  // Dismiss the admin modal
  $('#modalAdmin').modal('hide');
  // clear the value
  $('.assign-admin-privilege').val('');
});

// **************************************
// Create Room
// **************************************
$('#createRoom').submit( (event) => {
  event.preventDefault();
  // Get Room Name
  let roomName = $('#roomName').val();
  // Get Room Password
  let roomPass = $('#roomPassword').val();
  if(roomPass){
    socket.emit('create room with password', roomName, roomPass, (data) => {
      if(data){
        // Succesfull notification with message:
        toastSuccess(`Room is created. You already joined to "${roomName}" room`);
        $('.messages').empty();
        // Scroll to Top
        scrollToTop();
      }else{
        // Failed notification with message:
        toastFailed(`Error! Could create a room`);
        scrollToTop();
      }
    });
  }else{
    socket.emit('create room without password', roomName, (data) => {
      if(data){
        // Succesfull notification with message:
        toastSuccess(`Room is created. You already joined to "${roomName}" room`);
        // Remove previous messages from old room
        $('.messages').empty();
        scrollToTop();
      }
    });
  }
  // clear the value
  $('#roomName').val('');
  $('#roomPassword').val('');
});

function scrollToTop(){
  $("html, body").animate({scrollTop: 0}, 1000);
}

// **************************************
// Toast Success Notifications
// **************************************
function toastSuccess(bodyMessage){
    $('.toast-info').removeClass('text-danger');
    $('.toast-info').addClass('text-success');
    $('.toast-info').html('Successful!');
    $('.toast-body').text(bodyMessage);
    $('.toast').addClass('testing_toasts');
    $('.toast').toast('show');
}

// **************************************
// Toast Fail Notifications
// **************************************
function toastFailed(bodyMessage){
    $('.toast-info').removeClass('text-success');
    $('.toast-info').addClass('text-danger');
    $('.toast-info').html('Failed!');
    $('.toast-body').text(bodyMessage);
    $('.toast').addClass('testing_toasts');
    $('.toast').toast('show');
}
