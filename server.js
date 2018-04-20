//App Https
var https = require("https"),//For Https
fs= require("fs");//File system core modules
//App Web dependencies
var express = require('express'),
    app = express()
    path = require('path'),
    bodyParser = require('body-parser'),
    flash 		= require('connect-flash');
//App components
var routes 		= require('./app_server/routes'),
    session 	= require('./app_server/session'),
    passport    = require('./app_server/auth'),
    ioServer 	= require('./app_server/socket')(app),
    logger 		= require('./app_server/logger');

//webrtc franework 
var easyrtc = require("easyrtc");  

var port = process.env.PORT || 8443;
// View engine ejs
app.set('views', path.join(__dirname, 'app_server/views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


app.use('/', routes);

// Middleware to catch 404 errors
app.use(function(req, res, next) {
    res.status(404).sendFile(process.cwd() + '/app_server/views/404.htm');
  }); 

  ioServer.listen(port);

