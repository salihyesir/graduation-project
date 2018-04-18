var userList = {};
var waitingList = {};
var socketCount=0;
//connection komutu diğer fonksiyonlarımızı kapsar.Bağlantılar, client iletişimi vs vs herşey bu fonksiyon altında tanımlanır.
var ioEvents = function(io,easyrtc){
    io.sockets.on("connection", function(socket) {  
        socketCount++;
      
          //bu kısımda kullanıcının girişi ile olan olaylar ele alındı.app.js(server olmayan)'de
        socket.on("init_user", function(userData){
            // kullanıcı listesi güncelle
            userList[socket.id] = {"id": socket.id, "name": userData.name};
            console.log(userList[socket.id]);
            // bağlı kullanıcı listesini yeni kullanıcıya gönderin
            socket.emit("ui_user_set", userList);
            console.log(userList);
            // yeni kullanıcıyı diğer tüm kullanıcılara gönderin.
            socket.broadcast.emit("ui_user_add", userList[socket.id]);
        });
      
          //next user olayı ele alındı.
          socket.on("next_user", function() {
            console.log(waitingList[socket.id]);
            if(waitingList[socket.id]){
              console.log("return");
              return;
            } 
        
            if (Object.keys(waitingList).length == 0) {
              waitingList[socket.id] = true;
              console.log(Object.keys(waitingList)[0]);
            } else {
              // bekleme listesinden bir ortak seç
              socket.partnerId = Object.keys(waitingList)[0];
              console.log(socket.partnerId+"=<partner");
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
    var webServer = https.createServer(
    {
        key:  fs.readFileSync(path.join(__dirname, '../../private/privatekey.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../../private/certificate.pem'))
    },app);
    var io = require('socket.io')(webServer,{"log level":1});
    var easyrtc = require("easyrtc"); 
    
    var easyrtcServer = easyrtc.listen(app, io, {'apiEnable':'true'});
    // Define all Events
    ioEvents(io,easyrtc);
    return webServer;
}
module.exports = init;