//App Https
var https = require("https"),//For Https
    fs= require("fs");//File system core modules

//App Web dependencies
var express = require('express'),
    app = express()
    path = require('path'),
    bodyParser = require('body-parser');

var flash 		= require('connect-flash');
//App components
var routes 		= require('./app_server/routes');
var session 	= require('./app_server/session');
var passport    = require('./app_server/auth');



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
var webServer = https.createServer(
    {
        key:  fs.readFileSync(path.join(__dirname, './private/privatekey.pem')),
        cert: fs.readFileSync(path.join(__dirname, './private/certificate.pem'))
    },
    app).listen(8443);



// Middleware to catch 404 errors
app.use(function(req, res, next) {
    res.status(404).sendFile(process.cwd() + '/app_server/views/404.htm');
  }); 