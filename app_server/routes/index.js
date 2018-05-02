var express	 	= require('express');
var router 		= express.Router();
var passport 	= require('passport');
var bcrypt      = require('bcrypt-nodejs');

var User = require('../models/user');

// Home page
router.get('/', function(req, res, next) {
	// If user is already logged in, then redirect to rooms page
	if(req.isAuthenticated()){
		res.redirect('/profile');
	}
	else{
		res.render('login', {
			success: req.flash('success')[0],
			errors: req.flash('error'), 
			showRegisterForm: req.flash('showRegisterForm')[0]
		});
	}
});

// Login
router.post('/login', passport.authenticate('local', { 
	successRedirect: '/profile', 
	failureRedirect: '/',
	failureFlash: true
}));

// Register via username and password
router.post('/register', function(req, res, next) {
	var credentials = {'name' : req.body.name ,'username': req.body.username, 'password': req.body.password };
	if( credentials.username === '' || credentials.password === '', credentials.name ==='' ){
		req.flash('error', 'Missing credentials');
		req.flash('showRegisterForm', true);
		res.redirect('/');
	}else{
		// Check if the username already exists for non-social account
		User.findOne({'username': new RegExp('^' + req.body.username + '$', 'i'), 'socialId': null}, function(err, user){
			if(err) throw err;
			if(user){
				req.flash('error', 'Username already exists.');
				req.flash('showRegisterForm', true);
				res.redirect('/');
			}else{
				User.create(credentials, function(err, newUser){
					if(err) throw err;
					req.flash('success', 'Your account has been created. Please log in.');
					res.redirect('/');
				});
			}
		});
	}
});

// Social Authentication routes
// 1. Login via Facebook
router.get('/auth/facebook', passport.authenticate('facebook'));
router.get('/auth/facebook/callback', passport.authenticate('facebook', {
		successRedirect: '/profile',
		failureRedirect: '/',
		failureFlash: true
}));

// 2. Login via Twitter
router.get('/auth/twitter', passport.authenticate('twitter'));
router.get('/auth/twitter/callback', passport.authenticate('twitter', {
		successRedirect: '/profile',
		failureRedirect: '/',
		failureFlash: true
}));

// 3. Login via Google
router.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));


  router.get('/auth/google/callback', passport.authenticate('google', {
		successRedirect: '/profile',
		failureRedirect: '/',
		failureFlash: true
}));

// profile
router.get('/profile', [User.isAuthenticated, function(req, res, next) {
	User.find({username: req.user.directory},function (err, result) {
		if(err) throw err;
		else{
			res.render('profile', { user: req.user , directory: result });
		}
	});
}]);

router.post('/adduser',  [User.isAuthenticated, function(req, res, next){
	var adduser = req.body.adduser;
	//User Control
	User.find({username:adduser},function (err, result) {
		if(err) throw err;
		if(result.length === 0){
			req.flash('error', 'User not found.');
		}
		else if(req.user.directory.indexOf(adduser) > -1){
			req.flash('error', 'User already exist.');
		}
		else{
			var query = {$push: { directory:  adduser } }; 
			User.findOneAndUpdate(req.user._id, query ,function (err,docs) {
				if(err) throw err;
			});
		}	
	});
	res.redirect('/');
}]);
router.post('/deleteUser',  [User.isAuthenticated, function(req, res, next){
	
	console.log(req.body);
	var str = JSON.stringify(req.body);  
	var obj = JSON.parse(str);
	if(req.user.directory.indexOf(obj[0].username) > -1){
		var query = {$pull: { directory:  obj[0].username } }; 
		User.findOneAndUpdate(req.user._id, query ,function (err,docs) {
			if(err) throw err;
		});
	}
	res.redirect('/');
}]);

router.post('/update',  [User.isAuthenticated, function(req, res, next) {
	var credentials = {'name' : req.body.name ,'username': req.body.username, 
		'password': req.body.password, 'email' : req.body.email };
	if( credentials.username === '' || credentials.password === '', credentials.name ==='' ){
		req.flash('error', 'Missing credentials');
		req.flash('showRegisterForm', true);
	}
	else{
		bcrypt.genSalt(10, function(err, salt) {
			if (err) return next(err);
			bcrypt.hash(credentials.password, salt, null, function(err, hash) {
				if (err) return next(err);
				credentials.password = hash;
				User.findOneAndUpdate(req.user._id, credentials ,function (err,docs) {
					if(err) throw err;
					console.log(docs);
				});
			});
		});
	}
	res.redirect('/');
}]);
router.get('/random', function(req, res, next) {
	res.render('random');
});

router.get('/web',[User.isAuthenticated, function(req, res, next) {
	User.find({username: req.user.directory},function (err, result) {
		if(err) throw err;
		else{
			res.render('web', { user: req.user , directory: result });
		}
	});
	console.log(req.user);
}]);

// Logout
router.get('/logout', function(req, res, next) {
	// remove the req.user property and clear the login session
	req.logout();
	// destroy session data
	req.session = null;
	// redirect to homepage
	res.redirect('/');
});
module.exports = router;