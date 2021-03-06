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
var activeMusixiserId = [];//as index... temporarily
var activeMusixiserInfo = [];

io.on('connection', function(socket) {
    var addedUser = false;
    // musician create a stage, best have a userauth here
    //艹，应该stage名跟着musixiserId好，还是谁抢占快。应该第一种吧,现在是按照第二种逻辑，但第一种也许更合理？！？！？！？！？！
    socket.on('create stage', function(userInfo) {
        var musixiserId = ''+userInfo.uid;
        // if (activeMusixiserId.indexOf(musixiserId)==-1) {
        socket.join(musixiserId);
        activeMusixiserId.push(musixiserId);
        userInfo.beginTime = + new Date();
        activeMusixiserInfo.push(userInfo);
        console.log('stage ' + musixiserId + ' created'+JSON.stringify(userInfo));
        io.emit('moreActiveMusician',userInfo); //用this或socket，stagelist端收不到。use io will send to every where, 也许不是design pattern....凑活先用
        // } else {
        // socket.emit('dup stage');
        // }
        this.on('disconnect', function() {
            console.log('musixiser' + musixiserId + 'disconnect');
            io.emit('lessActiveMusician',musixiserId);
            this.broadcast.to(musixiserId).emit('no stage');
            var l = activeMusixiserId.length;
            for (var i = 0; i <= l - 1; i++) {
                if (activeMusixiserId[i] == musixiserId) {
                    activeMusixiserId.splice(i, 1);
                    activeMusixiserInfo.splice(i, 1);
                    break;
                }
            }
            socket.leave(musixiserId);
        });
        this.on('destroy stage', function() {
            console.log('musixiser' + musixiserId + 'disconnect');
            io.emit('lessActiveMusician',musixiserId);
            this.broadcast.to(musixiserId).emit('no stage');
            var l = activeMusixiserId.length;
            for (var i = 0; i <= l - 1; i++) {
                if (activeMusixiserId[i] == musixiserId) {
                    activeMusixiserId.splice(i, 1);
                    activeMusixiserInfo.splice(i, 1);
                    break;
                }
            }
            socket.leave(musixiserId);
        });

        // when the client emits 'new message', this listens and executes
        this.on('mmsg', function(data) {
            console.log('sendingg note to ' + musixiserId);
            this.broadcast.to(musixiserId).emit('res_MusixiserMIDI', {
                username: musixiserId,
                message: data
            });
        });

        this.on('req_MusixiserComment', function(data) {
            this.broadcast.to(musixiserId).emit('res_MusixiserComment', data);
        });

        this.on('req_MusixiserPickSong', function(data) {
            this.broadcast.to(musixiserId).emit('res_MusixiserPickSong', data);
        });

    });

    // audience enter a stage
    socket.on('audienceEnterStage', function(musixiserId) {
        for (var i = 0;i<=activeMusixiserId.length-1;i++) {
            if (activeMusixiserId[i]==musixiserId) {
                activeMusixiserInfo[i].audienceNum += 1;
                this.emit('res_AudienceEnterStage',activeMusixiserInfo[i]);
                break;
            }
        }
        //make sure audience enter a created stage
        io.emit('audienceNumUpdate',{musixiserId:musixiserId,amountdiff:1});
        if (activeMusixiserId.indexOf(musixiserId) >= 0) {
            this.join(musixiserId);
            this.broadcast.to(musixiserId).emit('AudienceCome');
            console.log('stage ' + musixiserId + ' entered');
        } else {
            this.emit('no stage');
        }

        this.on('req_AudienceComment', function(commentMsg) {
            this.broadcast.to(musixiserId).emit('res_AudienceComment', commentMsg);
        });
        this.on('req_AudienceOrderSong', function(order_songname) { //听众点歌
            console.log('观众点歌');
            this.broadcast.to(musixiserId).emit('res_AudienceOrderSong', order_songname);
        });
        this.on('disconnect', function() { //not real disconnect
            // console.log('audience leave a stage');
            for (var i = 0;i<=activeMusixiserId.length-1;i++) {
                if (activeMusixiserId[i]==musixiserId) {
                    activeMusixiserInfo[i].audienceNum -= 1;
                    break;
                }
            }
            this.broadcast.to(musixiserId).emit('AudienceLeave');
            io.emit('audienceNumUpdate',{musixiserId:musixiserId,amountdiff:-1});
        });
        this.on('req_AudienceLeaveRoom', function() {
            //也要做对应的人数更新操作呀呀呀
            this.broadcast.to(musixiserId).emit('res_AudienceLeaveRoom');
            this.leave(musixiserId);
        })

    });

    // audience enter app, checking online musician list
    socket.on('audienceEnterApp',function(){
        this.emit('currentMusicianList',activeMusixiserInfo);
    });

});




// if (!module.parent) {
//     app.listen(3002);
//     console.log('listening on port 3002');
//
