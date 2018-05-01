var config 	= require('../config');
var redis 	= require('redis').createClient;
var adapter = require('socket.io-redis');

var userList = {};
var waitingList = {};
var socketCount=0;

var ioEvents = function(io,easyrtc){
  io.sockets.on("connection", function(socket) {  
    socketCount++;
    //bu kısımda kullanıcının girişi ile olan olaylar ele alındı.app.js(server olmayan)'de
    socket.on("init_user", function(userData){
      // kullanıcı listesi güncelle
      userList[socket.id] = {"id": socket.id, "name": userData.name};
      // bağlı kullanıcı listesini yeni kullanıcıya gönderin
      socket.emit("ui_user_set", userList);
      // yeni kullanıcıyı diğer tüm kullanıcılara gönderin.
      socket.broadcast.emit("ui_user_add", userList[socket.id]);
    });
  //next user olayı ele alındı.
  socket.on("next_user", function() 
  {
    if(waitingList[socket.id]){
      return;
    } 
    if (Object.keys(waitingList).length == 0) {
      waitingList[socket.id] = true;
    } else 
    {
      // bekleme listesinden bir ortak seç
      socket.partnerId = Object.keys(waitingList)[0];
      // iki kullanıcı birbirine bağlamak
      socket.emit("connect_partner", {'caller':false, 'partnerId': socket.partnerId});
      //2.0.x ve 1.0.x' de bu kısımda hata vermekte sebebi io.sockets.socket tanımlanmamış socket.id' kaldırılmış olması
      //Çözdüm
      partnerSocket = io.sockets.connected[socket.partnerId];
      //partnerSocket = io.sockets.socket(socket.partnerId);
      partnerSocket.partnerId = socket.id;
      partnerSocket.emit("connect_partner", {'caller':true, 'partnerId': socket.id});
      // eşi bekleme listesinden sil
      delete waitingList[socket.partnerId];
    }
  });
  });
  // Bu olay da kullanıcın çıkması
  // EasyRTC tarafından "disconnect" olayı tüketildiğinden,
  // socket.on ("disconnect", function () {}) çalışmaz
  // bağlantı kesmek için easyrtc olay listener kullandık
  easyrtc.events.on("disconnect", function(connectionObj, next){
  // varsayılan bağlantı kesme yöntemini çağır
    easyrtc.events.emitDefault("disconnect", connectionObj, next);
    var socket = connectionObj.socket;
    var id = socket.id; 
    // sunucu tarafındaki değişkenleri temizle
    socketCount--;
    delete userList[id];
    delete waitingList[id];
    // istemci tarafını ayarla
    io.sockets.emit("ui_user_remove", id);
    if (socket.partnerId){
      //partnerSocket = io.sockets.sockets[socket.partnerId];
      //partnerSocket = io.sockets.socket(socket.partnerId);
      io.to(socket.partnerId).emit("disconnect_partner", socket.id);
        //partnerSocket.emit("disconnect_partner", socket.id);
        socket.partnerId = null;
      }
  });
}      
var init = function(app){
  //App Https
  var https = require("https"),//For Https
  fs= require("fs");//File system core modules
  var easyrtc = require("easyrtc"); 
    
    var webServer = https.createServer(
    {
        key:  fs.readFileSync(path.join(__dirname, '../../private/server.key')),
        cert: fs.readFileSync(path.join(__dirname, '../../private/server.crt'))
    },app);
    var io = require('socket.io')(webServer,{"log level":1});
    easyrtc.setOption("logLevel", "debug");    
    //var easyrtcServer = easyrtc.listen(app, io, {'apiEnable':'true'});

        // Start EasyRTC server
    var rtc = easyrtc.listen(app, io, null, function(err, rtcRef) {
      rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
          appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
      });
    });
    let port = config.redis.port;
	  let host = config.redis.host;
	  let password = config.redis.password;
	  let pubClient = redis(port, host, { auth_pass: password });
	  let subClient = redis(port, host, { auth_pass: password, return_buffers: true, });
	  io.adapter(adapter({ pubClient, subClient }));

    // Define all Events
    ioEvents(io,easyrtc);
    rtcEvents(io,easyrtc);
    return webServer;
}
module.exports = init;

var rtcEvents = function(io,easyrtc){
  // Overriding the default easyrtcAuth listener, only so we can directly access its callback
  easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
      if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }
        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});
        callback(err, connectionObj);
    });
  });
  // To test, lets print the credential to the console for every room join!
  easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
  });
}