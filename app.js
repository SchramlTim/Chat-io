var express = require('express');
var io = require('socket.io');

var app = express.createServer();





var wholeUserList = [];
var wholeChatroomList = [];
wholeChatroomList.push(new GlobalChatroom("GlobalChat"));


function User(name,socketID,publicKey){
    this.name = name;
    this.socketID = socketID;
    this.publicKey = publicKey;
    this.chatroom = null;
    var packetBase = Math.random() * 9999;
    var packetCounter = 0;

    this.changeName = function(newName){
      this.name = newName;
    }
    this.setChatroom = function(chatroom){
      this.chatroom = chatroom;
    }
    this.unsetChatroom = function(){
      this.chatroom = null;
    }
    this.messageCounter = function(){
      return packetBase + packetCounter;
    }
    this.increaseMessageCounter = function(){
      packetCounter++;
  }

}

function Chatroom(roomName){
  this.roomName = roomName;
  this.userList = new Array();

  this.joinUser = function(user){
    if(!this.isUserAlreadyJoined(user)){ 
      var oldChat = user.chatroom; 
      if(oldChat != null){
        oldChat.leaveUser(user); 
      }   
      user.setChatroom(this);
      this.userList.push(user);
      this.sendListOfPublicKey();
      this.serverMessage("User " + user.name + " ist dem Chat beigetreten")
      io.to(user.socketID).emit('chatroom name',this.roomName);
    }
  }
  this.leaveUser = function(user){
    if(this.isUserAlreadyJoined(user)){
      for(var i = 0; i < this.userList.length; i++) {
        if(this.userList[i].name === user.name && this.userList[i].socketID === user.socketID) {
          this.userList.splice(i, 1);
        }
      }
    }
  }
  this.sendMessageToChatroom = function(user,message){
    var prefix = "";
    if(this.userList != null){
      for(var i = 0; i < this.userList.length; i++){
        prefix = user.name;
        io.to(this.userList[i].socketID).emit('chat message',prefix,message);
        console.log("Sendet zu " + this.userList[i].name);
      }
    }
  }
  this.isUserAlreadyJoined = function(user){
    var joined = false;
    if(this.userList != null){
      for(var i = 0; i < this.userList.length; i++){
        if(this.userList[i].name == user.name){
          joined = true;
        }
      }
    }    
    return joined;
  }
  this.sendListOfPublicKey = function(){
    var listOfKeys = {};
    for(var i = 0; i < this.userList.length; i++){
      listOfKeys[this.userList[i].name] = this.userList[i].publicKey;
    }
    for(var i = 0; i < this.userList.length; i++){
      io.to(this.userList[i].socketID).emit('public key list',JSON.stringify(listOfKeys));
    }
    JSON.stringify(listOfKeys);
  }
  this.serverMessage = function(message){
    for(var i = 0; i < this.userList.length; i++){
      io.to(this.userList[i].socketID).emit('server message',message);
    }
  }
  this.closeChatroom = function(){
    for(var i = 0; i < wholeChatroomList.length; i++) {
      if(wholeChatroomList[i].roomName == this.roomName) {
        wholeChatroomList.splice(i, 1);
      }
    }
    if(this.userList.length > 0){
      for(var i = 0; i < this.userList.length; i++) {
        wholeChatroomList[0].joinUser(this.userList[i]);
        io.to(this.userList[i].socketID).emit('chatroom got closed',"Der Chatroom wurde geschlossen! Du wurdest wieder in " + wholeChatroomList[0].name + " geschoben.");
      }
    }
  }
}

function GlobalChatroom(roomName){
  this.base = Chatroom;
  this.base(roomName)
}

function UserChatroom(roomName,admin){
  this.base = Chatroom;
  this.base(roomName)
  this.admin = admin;
  
  this.password = "";
  this.userWhitelist = new Array();
  this.requestedUser = new Array();
    
  this.requestChatroom = function(user){
    if(!this.isUserRequested(user)){
      this.requestedUser.push(user);
    }
  }
  
  this.deleteUserFromRequestList = function(user){
    for(var i = 0; i < this.requestedUser.length; i++) {        
      if(this.requestedUser[i].name == user.name && this.requestedUser[i].socketID == user.socketID) {
        this.requestedUser.splice(i, 1);         
      }
    }
  }
    
  this.addAllowedUser = function(user){
    if(!this.isUserWhitelisted(user)){
      this.userWhitelist.push(user);
    }
  }
  
  this.setPassword = function(password){
    this.password = password;
  }
  
  this.checkPassword = function(password){
    var isRight = false;
    if(this.password == password){
      isRight = true;      
    }
    return isRight;    
  }
  
  this.isUserWhitelisted = function(user){
    var whitelisted = false;
    if(this.userWhitelist != null){
      for(var i = 0; i < this.userWhitelist.length; i++){
        if(this.userWhitelist[i].name == user.name){
          whitelisted = true;
        }
      }
    }    
    return whitelisted;
  }
  
  this.isUserRequested = function(user){
    var requested = false;
    if(this.requestedUser != null){
      for(var i = 0; i < this.requestedUser.length; i++){
        if(this.requestedUser[i].name == user.name){
          requested = true;
        }
      }
    }    
    return requested;
  }
  
  this.joinUser = function(user){
    if(!this.isUserAlreadyJoined(user) || isUserWhitelisted(user)){ 
      var oldChat = user.chatroom; 
      if(oldChat != null){
        oldChat.leaveUser(user); 
      }   
      user.setChatroom(this);
      this.userList.push(user);
      this.sendListOfPublicKey();
      this.serverMessage("User " + user.name + " ist dem Chat beigetreten")
      io.to(user.socketID).emit('chatroom name',this.roomName);
    }
  }
  
  this.leaveUser = function(user){
    if(this.isUserAlreadyJoined(user)){     
      for(var i = 0; i < this.userList.length; i++) {        
        if(this.userList[i].name === user.name && this.userList[i].socketID === user.socketID) {
          this.userList.splice(i, 1);         
        }
      }
      if(user.name == admin.name){
        user.chatroom.closeChatroom();
      }
    }
  }
}

UserChatroom.prototype = new Chatroom;
GlobalChatroom.prototype = new Chatroom;

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    if(istNutzerSchonEingetragen(socket.id)){
      var user = getUserBySocketID(socket.id)
      user.chatroom.sendMessageToChatroom(user,msg);
      console.log(user.chatroom.roomName);
    }
  });
  socket.on('get user list', function(){
    var listOfUser = new Array();
    var user = getUserBySocketID(socket.id);
    for(var i = 0; i < user.chatroom.userList.length; i++) {
      if(user.chatroom.userList[i] instanceof User){
        listOfUser.push(user.chatroom.userList[i].name);
      }
    }
    io.to(socket.id).emit('get user list',JSON.stringify(listOfUser));
  });
  socket.on('whisper', function(name,msg){
    var prefix = name;
    var sender = getUserBySocketID(socket.id);
    var receiver = getUserByName(name);
    if(getUserBySocketID(socket.id).chatroom.isUserAlreadyJoined(receiver)){
      if(receiver.socketID != sender.socketID){
        io.to(receiver.socketID).emit('chat message',sender.name,msg);      
        io.to(sender.socketID).emit('chat message',sender.name,msg);  
      }else{
        io.to(sender.socketID).emit('error',"Du kannst dir nicht selber schrieben!");  
      }
    }
  });
  socket.on('get chatroom list', function(){
    var listOfChatrooms = new Array();
    for(var i = 0; i < wholeChatroomList.length; i++) {
      if(wholeChatroomList[i] instanceof UserChatroom){
        listOfChatrooms.push(wholeChatroomList[i].roomName);
      }
    }
    io.to(socket.id).emit('get chatroom list',JSON.stringify(listOfChatrooms));
  });
  socket.on('get requested user', function(){
    var listOfRequestedUsers = new Array();
    var user = getUserBySocketID(socket.id)
    if(user.name == user.chatroom.admin.name){
      var requested = user.chatroom.requestedUser;
      for(var i = 0; i < requested.length; i++) {
        if(requested[i] instanceof User){
          listOfRequestedUsers.push(requested[i].name);
        }
      }
      io.to(socket.id).emit('get requested user',JSON.stringify(listOfRequestedUsers));
    }
  }); 
  socket.on('get whole user for whitelist', function(){
    var listOfWholeUser = new Array();
    var user = getUserBySocketID(socket.id)
    if(user.name == user.chatroom.admin.name){      
      for(var i = 0; i < wholeUserList.length; i++) {
        if(wholeUserList[i] instanceof User){
          listOfWholeUser.push(wholeUserList[i].name);
        }
      }
      io.to(socket.id).emit('get whole user for whitelist',JSON.stringify(listOfWholeUser));
    }
  });  
  socket.on('set chat password', function(password){
    var user = getUserBySocketID(socket.id);
    var chatroom = getChatroomByAdmin(user);
    console.log(chatroom);
    if(chatroom != null && user.name == chatroom.admin.name){
      console.log("Setzt password "+ password);
      chatroom.setPassword(password);
    } 
  });
  socket.on('create new chatroom', function(chatroomName){
    if(getChatroomByName(chatroomName) == null){
      var admin = getUserBySocketID(socket.id);
      var chatroom = new UserChatroom(chatroomName,admin);
      chatroom.joinUser(admin);
      wholeChatroomList.push(chatroom);            
      io.to(socket.id).emit('chat is created');
      io.to(socket.id).emit('active admin panel');
    }else{
      io.to(socket.id).emit('error',"Der Chatroomname existiert schon! Wähle einen anderen.");
    }
  });
  socket.on('join chatroom', function(chatroomName){
      var user = getUserBySocketID(socket.id);
      var chatroom = getChatroomByName(chatroomName);  
      if(chatroom != null && chatroom.isUserWhitelisted(user)){
          user.chatroom.leaveUser(user);
          chatroom.joinUser(user);
          io.to(socket.id).emit('user joined new chatroom');
      }else{  
        io.to(socket.id).emit('password input',chatroomName);        
      }
  });
  socket.on('password input', function(chatroomName,password){
      var user = getUserBySocketID(socket.id);
      var chatroom = getChatroomByName(chatroomName);
      if(chatroom != null && chatroom.checkPassword(password)){
         user.chatroom.leaveUser(user);
         chatroom.joinUser(user);
         io.to(socket.id).emit('user joined new chatroom');
      }else{
        io.to(socket.id).emit('error',"Es ist etwas falsch gelaufen!");
      }
  });
  socket.on('get sec', function(){    
    io.to(socket.id).emit('prompt',"Der Server arbeitet mit einer End-zu-End-Verschlüsselung!");
  });
  socket.on('request chatroom', function(roomName){
      var user = getUserBySocketID(socket.id);
      var chatroom = getChatroomByName(roomName);  
      if(user != null & chatroom != null){  
        chatroom.requestChatroom(user);
      }else{
        io.to(socket.id).emit('error',"Es ist etwas falsch gelaufen!");
      }
  });
  socket.on('allow user', function(userName){
      var user = getUserBySocketID(socket.id);
      var chatroom = getChatroomByAdmin(user);
      if(chatroom != null && user != null){
        var allowedUser = getUserByName(userName);
        chatroom.addAllowedUser(allowedUser);
        chatroom.deleteUserFromRequestList(allowedUser);         
        io.to(allowedUser.socketID).emit('prompt',"Du wurdest für den Chatroom: " + chatroom.roomName + " zugelassen!");
      }else{
        io.to(socket.id).emit('error',"Es ist etwas falsch gelaufen!");
      }
  });
  socket.on('whitelist user', function(userName){
      var user = getUserBySocketID(socket.id);
      var chatroom = getChatroomByAdmin(user);
      if(chatroom != null){
        var allowedUser = getUserByName(userName);
        chatroom.addAllowedUser(allowedUser);         
        io.to(allowedUser.socketID).emit('prompt',"Du wurdest für den Chatroom: " + chatroom.roomName + " gewhitelisted!");
      }else{
        io.to(socket.id).emit('error',"Es ist etwas falsch gelaufen!");
      }
  });   
  socket.on('leave chatroom', function(){
      var user = getUserBySocketID(socket.id);
      var chatroom = wholeChatroomList[0];
      if(chatroom != null){
        user.chatroom.leaveUser(user);
        chatroom.joinUser(user);
      }else{
        io.to(socket.id).emit('error',"Ein Fehler beim verlassen des Chatrooms ist passiert. Versuch es noch einmal!");
      }
  });
  socket.on('login', function(username, publicKey){
    var user = NutzerEintragen(username,socket.id,publicKey)
    if(user != null){
      console.log("joint user");
      wholeChatroomList[0].joinUser(user);    
    }else{
      console.log("sendet error");
      io.to(socket.id).emit('nickname error',"Name existiert schon!"); 
    }
  });
  socket.on('disconnect', function(){    
    var user = NutzerAustragen(socket.id);
    if(user != null){
      user.chatroom.serverMessage("User " + user.name + " hat keine Lust mehr auf euch!");
      user.chatroom.leaveUser(user);
    }else{
      console.log("Es ist ein Fehler beim Disconnect eines Users entstanden");
    }
  });
});



function NutzerEintragen(name,socketID,publicKey){
  var eingetragen = null;
  if(!istNutzerSchonEingetragen(socketID) && !nameExist(name)){
    eingetragen = new User(name,socketID,publicKey);    
    wholeUserList.push(eingetragen);
  }  
  return eingetragen;
}

function NutzerAustragen(socketID){
  var ausgetragen = null;
  if(istNutzerSchonEingetragen(socketID)){
    for(var i = 0; i < wholeUserList.length; i++) {
      if(wholeUserList[i].socketID == socketID){
        ausgetragen = wholeUserList[i];        
        wholeUserList.splice(i,1);
        break;
      }
    }
  }
  return ausgetragen;
}

function istNutzerSchonEingetragen(socketID){
  var found = false;
  for(var i = 0; i < wholeUserList.length; i++) {
    if(wholeUserList[i].socketID == socketID){
      found = true;      
      break;     
    }
  }
  return found;
}

function nameExist(name){
  var found = false;
  for(var i = 0; i < wholeUserList.length; i++) {
    if(wholeUserList[i].name == name){
      found = true;
      break;     
    }
  }
  return found;
}

function getUserBySocketID(socketID){
  var user = null;
  if(wholeUserList != null){
    for(var i = 0; i < wholeUserList.length; i++) {
      if(wholeUserList[i].socketID == socketID){
        user = wholeUserList[i];
        break;
      }
    }
  }
  return user;
}

function getUserByName(name){
  var user = null;
  if(wholeUserList != null) {
    for (var i = 0; i < wholeUserList.length; i++) {
      if (wholeUserList[i].name == name) {
        user = wholeUserList[i];
        break;
      }
    }
  }
  return user;
}

function getChatroomByName(chatroomName){
  var chatroom = null;
  if(wholeChatroomList != null) {
    for (var i = 0; i < wholeChatroomList.length; i++) {
      if (wholeChatroomList[i].roomName == chatroomName) {
        chatroom = wholeChatroomList[i];
        break;
      }
    }
  }
  return chatroom;
}

function getChatroomByAdmin(chatroomAdmin){
  var chatroom = null;
  if(wholeChatroomList != null) {
    for (var i = 0; i < wholeChatroomList.length; i++) {
      if (wholeChatroomList[i] instanceof UserChatroom && wholeChatroomList[i].admin.name == chatroomAdmin.name) {
        chatroom = wholeChatroomList[i];
        break;
      }
    }
  }
  return chatroom;
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/chat.html');
});

app.listen(process.env.port, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});