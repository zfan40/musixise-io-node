'use strict';
const messages = require('./controllers/messages');
const compress = require('koa-compress');
const logger = require('koa-logger');
const serve = require('koa-static');
const route = require('koa-route');
const koa = require('koa');
const path = require('path');
const app = module.exports = koa();

// Logger
app.use(logger());

app.use(route.get('/', messages.home));
app.use(route.get('/messages', messages.list));
app.use(route.get('/messages/:id', messages.fetch));
app.use(route.post('/messages', messages.create));
app.use(route.get('/async', messages.delay));
app.use(route.get('/promise', messages.promise));

// Serve static files
app.use(serve(path.join(__dirname, 'public')));

// Compress
app.use(compress());







/********* socket io *********/
// attach socket io after all the app.use
// const server = require('http').Server(app.callback());
// const io = require('socket.io')(server);

var io = require('socket.io').listen(app.listen(3002)); //wocao...!!!
var activeRooms = [];

io.on('connection', function(socket) {
    var addedUser = false;
    // musician create a stage
    //best have a userauth here
    //艹，应该stage名跟着nickname好，还是谁抢占快。应该第一种吧,现在是按照第二种逻辑，但第一种也许更合理？！？！？！？！？！
    socket.on('create stage', function(nickname) {
        // if (activeRooms.indexOf(nickname)==-1) {
        socket.join(nickname);
        activeRooms.push(nickname);
        console.log('stage ' + nickname + ' created');
        // } else {
        // socket.emit('dup stage');
        // }
        this.on('disconnect', function() {
            console.log('musixiser' + nickname + 'disconnect');
            this.broadcast.to(nickname).emit('no stage');
            var l = activeRooms.length;
            for (var i = 0; i <= l - 1; i++) {
                if (activeRooms[i] == nickname) {
                    activeRooms.splice(i, 1);
                    break;
                }
            }
        });


        // when the client emits 'new message', this listens and executes
        this.on('mmsg', function(data) {
            console.log('sendingg note to ' + nickname);
            this.broadcast.to(nickname).emit('res_MusixiserMIDI', {
                username: nickname,
                message: data
            });
        });

        this.on('req_MusixiserComment', function(data) {
            this.broadcast.to(nickname).emit('res_MusixiserComment', data);
        });
        
        this.on('req_MusixiserPickSong', function(data) {
            this.broadcast.to(nickname).emit('res_MusixiserPickSong', data);
        });

    });

    // audience enter a stage
    socket.on('audienceEnterStage', function(nickname) {
        //make sure audience enter a created stage
        if (activeRooms.indexOf(nickname) >= 0) {
            this.join(nickname);
            this.broadcast.to(nickname).emit('AudienceCome');
            console.log('stage ' + nickname + ' entered');
        } else {
            this.emit('no stage');
        }

        this.on('req_AudienceComment', function(commentMsg) {
            this.broadcast.to(nickname).emit('res_AudienceComment', commentMsg);
        });
        this.on('req_AudienceOrderSong', function(order_songname) { //听众点歌
            console.log('观众点歌');
            this.broadcast.to(nickname).emit('res_AudienceOrderSong', order_songname);
        });
        this.on('disconnect', function() { //not real disconnect
            // console.log('audience leave a stage');
            // this.broadcast.to(nickname).emit('AudienceLeave');
        });
        this.on('req_AudienceLeaveRoom', function() {
            this.broadcast.to(nickname).emit('res_AudienceLeaveRoom');
            this.leave(nickname);
        })

    });

});




// if (!module.parent) {
//     app.listen(3002);
//     console.log('listening on port 3002');
//