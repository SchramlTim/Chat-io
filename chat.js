var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var userList = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/chat.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    var parsedMessage = JSON.parse(msg);
    var sender = getUsername(socket.id);
    var currentdate = new Date();
    var timestamp = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();

    if(parsedMessage.message.startsWith("/w")){
      var reciever = parsedMessage.message.substr(parsedMessage.message.indexOf('"')+1,parsedMessage.message.indexOf('"',parsedMessage.message.indexOf('"')+1) - parsedMessage.message.indexOf('"')-1);
      console.log("whisper to " +reciever);
      var socketID = getSocketID(reciever);
      var fullMessage = "<span class='timestamp'>"+timestamp+"</span> <span class='user-nickname private'>" + sender + " (privat):</span>" + parsedMessage.message.substr(parsedMessage.message.indexOf('" ')+2,parsedMessage.message.length);
      io.to(socketID).emit('chat message', fullMessage);
      io.to(socket.id).emit('chat message', fullMessage);
    }
    else if(parsedMessage.message.startsWith("/list")){
      var tmpList = [];
      for(var i = 0; i < userList.length; i++){
        tmpList.push(userList[i].nickname);
      }
      io.emit('user list', tmpList);
    }
    else{
      var fullMessage = "<span class='timestamp'>"+timestamp+"</span> <span class='user-nickname'>" + sender + ":</span>" + parsedMessage.message;
      io.emit('chat message', fullMessage);
    }
  });
  socket.on('login', function(username){
    if(NutzerEintragen(username,socket.id) && username != ""){
      io.emit('chat message', "<span class='user-connected'>Benutzer " + username + " ist dem Chat beigetreten!</span>");
    }else{
      io.to(socket.id).emit('nickname error','Nickname ist schon vergeben!')
    }
  });
  socket.on('disconnect', function(){
    var username = getUsername(socket.id);
    NutzerAustragen(username,socket.id);
    io.emit('chat message', "<span class='user-connected'>Benutzer " + username + " hat kein Bock mehr auf euch!</span>");
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function NutzerEintragen(name,socketID){
  var eingetragen = false;
  if(!istNutzerSchonEingetragen(name)){
    userList.push({"nickname":name,"id":socketID});
    eingetragen = true;
  }
  return eingetragen;
}

function NutzerAustragen(name,socketID){
  var ausgetragen = false;
  if(istNutzerSchonEingetragen(name)){
    for(var i = 0; i < userList.length; i++) {
      if(userList[i].nickname == name && userList[i].id == socketID){
        userList.splice(i,1);
        ausgetragen = true;
        break;
      }
    }
  }
  return ausgetragen;
}

function istNutzerSchonEingetragen(name){
  var found = false;
  for(var i = 0; i < userList.length; i++) {
    if(userList[i].nickname == name){
      found = true;
      break;
    }
  }
  return found;
}

function getUsername(socketID){
  var usernameFound = "";
  for(var i = 0; i < userList.length; i++) {
    if(userList[i].id == socketID){
      usernameFound = userList[i].nickname;
      break;
    }
  }
  return usernameFound;
}

function getSocketID(username){
  var idFound = "";
  for(var i = 0; i < userList.length; i++) {
    if(userList[i].nickname == username){
      idFound = userList[i].id;
      break;
    }
  }
  return idFound;
}