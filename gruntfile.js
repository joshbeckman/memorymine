module.exports = function(grunt) {

  var Account = require('./models/account')
    , Memory = require('./models/memory')
    , mongoose = require('mongoose')
    , moment = require('moment')
    , twitter = require('twitter')
    , fb = require('fb')
    , twHandler = require('./lib/twitterHandler')
    , fs = require('fs')
    , config = JSON.parse(fs.readFileSync('./config.json'));
  // Define what/which mongo to yell at
  var mongoUri = process.env.MONGOLAB_URI
                || process.env.MONGOHQ_URL
                || 'mongodb://localhost/memorymine';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json')
  });
  grunt.registerTask('pullFacebook', 'Pull fb for all the users', function() {
    // Invoke async mode
    var done = this.async();
    // Connect mongoose
    mongoose.connect(mongoUri);
    Account.find().lean().exec(function(err,accounts){
      for(i=0;i<accounts.length;i++){
        if(accounts[i].facebookToken){
          fb.setAccessToken(accounts[i].facebookToken);
          fb.api(accounts[i].facebookUid, { fields: ['id', 'posts', 'photos'] }, function(resp) {
            console.log(resp);
          });
        }
      };
      done();
    })
  });
  grunt.registerTask('pullTwitter', 'Pull tweets for all the users', function() {
    // Invoke async mode
    var done = this.async();
    // Connect mongoose
    mongoose.connect(mongoUri);
    Account.find().lean().exec(function(err,accounts){
      var i=0;last=accounts.length;
      (function loop() {
        if(i<last){
          if(accounts[i].twitterToken){
            var twit = new twitter({
              consumer_key: process.env.TWITTER_CONSUMER_KEY || config.twitter.consumer_key,
              consumer_secret: process.env.TWITTER_CONSUMER_SECRET || config.twitter.consumer_secret,
              access_token_key: accounts[i].twitterToken,
              access_token_secret: accounts[i].twitterTokenSecret
            });
            twit.get('/favorites/list.json', {user_id:accounts[i].twitterUid,count:50,include_entities:true}, function(data) {
              twHandler.favesHandler({accountId:accounts[i]._id}, data,function(){
                twit.get('/statuses/user_timeline.json', {user_id:accounts[i].twitterUid,count:50,include_entities:true}, function(data) {
                  twHandler.tweetsHandler({accountId:accounts[i]._id}, data, function(){
                    i++;loop();
                  });
                });
              });
            });
          }else{console.log('token absent for '+accounts[i].email);i++;loop();}
        }else{done();}
      })();
    })
  });
};