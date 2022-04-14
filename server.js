const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages')
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users')
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const mongo = require('mongodb').MongoClient;
const Msg = require('./models/messages');
const mongoose = require('mongoose');
const { sendStatus } = require('express/lib/response');

//set static folder
app.use(express.static(path.join(__dirname, 'public')));

//const uri = 'mongodb+srv://admin:8a7qlULP1fD9rNpB@cluster0.ypfd1.mongodb.net/chatroom-messages?retryWrites=true&w=majority';
uri ='mongodb://localhost:27017/?readPreference=primary&directConnection=true&ssl=false';
mongo.connect(uri, function(err,db) {
    if(err){
        throw err;
    }
    console.log('Connected to database');

    const botname = 'Admin';

    //Run when client connects
    io.on('connection', socket => {
        const mydb = db.db('chatroom-messages')
        const chat = mydb.collection('msgs');
        socket.on('joinRoom', ({ username, room}) => {
            
            const user = userJoin(socket.id, username, room);
            socket.join(user.room);

            //Welcome current user
            socket.emit('message', formatMessage(botname, 'Welcome to ChatChord!'));
            
            //Broadcast when a user connects
            socket.broadcast
            .to(user.room)
            .emit('message', formatMessage(botname,`${user.username} has joined the chat`));

            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
            
            //Get chat collection
            chat.find().limit(100).sort({_id:1}).toArray(function(err, res) {
                if (err) {
                    throw err
                }
                for (i in res) {
                    if(res[i].room === user.room) {
                        socket.emit('message', formatMessage(res[i].username, res[i].msg));
                    }
                }
            });
        });

        //Listen for chatMessage
        socket.on('chatMessage', msg => {   
            const user = getCurrentUser(socket.id);
            var username = user.username
            var room = user.room
            const message = new Msg({msg,username,room});
            chat.insertOne(message).then(
                io.to(user.room).emit('message', formatMessage(user.username,msg))
            )
            
               
        });

         //Runs when a client disconnects 
        socket.on('disconnect', () => {
            const user = userLeave(socket.id);

            if(user) {
                io.to(user.room).emit(
                    'message',
                    formatMessage(botname,`${user.username} has left the chat`)
                    );
                io.to(user.room).emit('roomUsers', {
                    room: user.room,
                    users: getRoomUsers(user.room)
                });
            }
            
        });
    });

});



const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})