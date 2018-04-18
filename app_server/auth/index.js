var config 		= require('../config');
var passport 	= require('passport');
var logger 		= require('../logger');

var LocalStrategy 		= require('passport-local').Strategy;
var FacebookStrategy  	= require('passport-facebook').Strategy;
var TwitterStrategy  	= require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
//For token 
//const JwtStrategy = require('passport-jwt').Strategy;
//const { ExtractJwt } = require('passport-jwt');

var User = require('../models/user');

/**
 * Encapsulates all code for authentication 
 * Either by using username and password, or by using social accounts
 *
 */
var init = function(){

	// Serialize and Deserialize user instances to and from the session.
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function (err, user) {
			done(err, user);
		});
	});

/*
	passport.use(new JwtStrategy({
		jwtFromRequest: ExtractJwt.fromHeader('authorization'),
		secretOrKey: config.jwtSecret
	}, function (payload, done)  {
		try {
			// Find the user specified in token
			const user =  User.findById(payload.sub);
	
			// If user doesn't exists, handle it
			if (!user) {
				return done(null, false);
			}
	
			// Otherwise, return the user
			done(null, user);
		} catch(error) {
			done(error, false);
		}
	}));
*/

	// Plug-in Local Strategy
	passport.use(new LocalStrategy(
	  function(username, password, done) {
	    User.findOne({ username: new RegExp(username, 'i'), socialId: null }, function(err, user) {
	      if (err) { return done(err); }

	      if (!user) {
	        return done(null, false, { message: 'Incorrect username or password.' });
	      }

	      user.validatePassword(password, function(err, isMatch) {
	        	if (err) { return done(err); }
	        	if (!isMatch){
	        		return done(null, false, { message: 'Incorrect username or password.' });
	        	}
	        	return done(null, user);
	      });

	    });
	  }
	));

	// In case of Facebook, tokenA is the access token, while tokenB is the refersh token.
	// In case of Twitter, tokenA is the token, whilet tokenB is the tokenSecret.
	var verifySocialAccount = function(tokenA, tokenB, data, done) {
		User.findOrCreate(data, function (err, user) {
	      	if (err) { return done(err); }
			return done(err, user); 
		});
	};

	// Plug-in Facebook & Twitter Strategies
	passport.use(new FacebookStrategy(config.facebook, verifySocialAccount));
	passport.use(new TwitterStrategy(config.twitter, verifySocialAccount));
	passport.use(new GoogleStrategy(config.google, verifySocialAccount));

	return passport;
}
	
module.exports = init();