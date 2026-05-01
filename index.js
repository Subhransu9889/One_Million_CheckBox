import http from 'http';
import path from 'node:path';

import dotenv from 'dotenv';
import express from 'express';
import {Server} from 'socket.io';

dotenv.config();

const PORT = process.env.PORT || 9000;

async function main(){
    const app = express();
    app.use(express.static(path.resolve("./public")));
    const io = new Server();
    const server = http.createServer(app);
    io.attach(server);

    //io handlers
    io.on('connection', (socket) => {
        console.log('A user connected', {id: socket.id});
        socket.on('client:checkbox-change', (data) => {
            console.log('Received checkbox change from client', data);
            io.emit('server:checkbox-change', data);
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected', {id: socket.id});
        });
    });


    //express handlers
    app.get('/health', (req, res)=>{
        res.json({
            message: "Server is healthy",
            helathy: true
        })
    })

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    })
}

main();