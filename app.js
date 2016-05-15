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
    console.log('connected');
    var addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on('mmsg', function(data) {
        // we tell the client to execute 'new message'
        var stageName = JSON.parse(data).from; //stageName is the nickname
        // console.log(JSON.stringify(data));
        console.log('sending note to ' + stageName);
        //send to all in the room except the sender. different from io.socket.in.emit
        socket.broadcast.to(stageName).emit('tocmsg', {
            // socket.broadcast.emit('new message', {  
            // io.sockets.in(stageName).emit('new message', {
            // io.sockets.emit('new message', {
            username: socket.username,
            message: data
        });
    });

    /************* example code *************/
    // when the client emits 'add user', this listens and executes
    // socket.on('add user', function(username) {
    //     if (addedUser) return;
    //     // we store the username in the socket session for this client
    //     socket.username = username;
    //     ++numUsers;
    //     addedUser = true;
    //     socket.emit('login', {
    //         numUsers: numUsers
    //     });
    //     // echo globally (all clients) that a person has connected
    //     socket.broadcast.emit('user joined', {
    //         username: socket.username,
    //         numUsers: numUsers
    //     });
    // });
    // when the user disconnects.. perform this
    // socket.on('disconnect', function() {
    //     if (addedUser) {
    //         --numUsers;
    //         // echo globally that this client has left
    //         socket.broadcast.emit('user left', {
    //             username: socket.username,
    //             numUsers: numUsers
    //         });
    //     }
    // });

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
        		this.broadcast.to(nickname).emit('no stage');
        		var l = activeRooms.length;
        		for (var i = 0; i<=l-1;i++) {
        			if (activeRooms[i]==nickname) {
        				activeRooms.splice(i,1);
        				break;
        			}
        		}
        });
    });

    // audience enter a stage
    socket.on('enter stage', function(nickname) {
        //make sure audience enter a created stage
        if (activeRooms.indexOf(nickname) >= 0) {
            socket.join(nickname);
            console.log('stage ' + nickname + ' entered');
        } else {
            socket.emit('no stage');
        }

    });

});




// if (!module.parent) {
//     app.listen(3002);
//     console.log('listening on port 3002');
// 