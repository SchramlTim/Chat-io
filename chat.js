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
    var found = false;
    for(var i = 0; i < userList.length; i++) {
      if(userList[i].nickname == parsedMessage.nickname){
        found = true;
      }
    }
    if(!found){
      userList.push({"nickname":parsedMessage.nickname,"id":socket.id});
    }
    if(parsedMessage.message.startsWith("/w")){

      var reciever = parsedMessage.message.substr(parsedMessage.message.indexOf('"')+1,parsedMessage.message.indexOf('"',parsedMessage.message.indexOf('"')+1) - parsedMessage.message.indexOf('"')-1);
      console.log("whisper to " +reciever);
      socketID = "";
      for(var i = 0; i < userList.length; i++){
        if(reciever.toLowerCase() == userList[i].nickname.toLowerCase()){
          socketID = userList[i].id;
        }
      }
      var fullMessage = "<span class='user-nickname private'>" + parsedMessage.nickname + ":</span>" + parsedMessage.message.substr(parsedMessage.message.indexOf('" ')+2,parsedMessage.message.length);
      io.to(socketID).emit('chat message', fullMessage);
      io.to(socket.id).emit('chat message', fullMessage);
    }else{
      var fullMessage = "<span class='user-nickname'>" + parsedMessage.nickname + ":</span>" + parsedMessage.message;
      io.emit('chat message', fullMessage);
    }



    var tmpList = [];
    for(var i = 0; i < userList.length; i++){
      tmpList.push(userList[i].nickname);
    }
    io.emit('user list', tmpList);
  });
});

http.listen(process.env.PORT, function(){
  console.log('listening on *:3000');
});