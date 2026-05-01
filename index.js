import http from 'http';
import path from 'node:path';

import dotenv from 'dotenv';
import express from 'express';
import {Server} from 'socket.io';

import { publisher, subscriber, redis } from './redis-connection.js';

dotenv.config();

const PORT = process.env.PORT || 9000;

async function main(){
    const app = express();
    app.use(express.static(path.resolve("./public")));
    const io = new Server();
    const server = http.createServer(app);
    io.attach(server);
    await subscriber.subscribe('internal-server:checkbox-change', (err, count) => {
        if(err){
            console.error('Failed to subscribe to Redis channel', err);
        } else {
            console.log(`Subscribed to Redis channel. Currently subscribed to ${count} channel(s).`);
        }
    });
    subscriber.on('message', (channel, message) => {
        console.log(`Received message from channel ${channel}: ${message}`);
        if(channel === 'internal-server:checkbox-change'){
            const data = JSON.parse(message);
            // state.checkboxes[data.id] = data.checked;
            io.emit('server:checkbox-change', data);
        }
    });
    
    const CHECKBOX_COUNT = 100;
    const CHECKBOX_STATE_KEY = 'checkbox_state';
    const rateLimitMap = new Map();
    // const state = {
    //     checkboxes: new Array(CHECKBOX_COUNT).fill(false)
    // }


    //io handlers
    io.on('connection', (socket) => {
        console.log('A user connected', {id: socket.id});
        socket.on('client:checkbox-change', async(data) => {
            console.log('Received checkbox change from client', data);

            // const lastOperationTime = rateLimitMap.get(socket.id) || 0;
            const lastOperationTime = await redis.get(`rate-limiting:${socket.id}`);
            if(lastOperationTime){
                const timeElapsed = Date.now() - lastOperationTime;
                if(timeElapsed < 5.5 * 1000){
                    socket.emit('server:rate-limit', {
                        message: `You are changing checkboxes too quickly. Please wait for ${Math.ceil((5.5 * 1000 - timeElapsed) / 1000)} seconds before making another change.`
                    });
                    return;
                }

            }
            await redis.set(`rate-limiting:${socket.id}`, Date.now());
            
            // io.emit('server:checkbox-change', data);
            // state.checkboxes[data.id] = data.checked;
            const existingState = await redis.get(CHECKBOX_STATE_KEY);
            if(existingState){
                const remoteData = JSON.parse(existingState);
                remoteData[data.id] = data.checked;
                await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(remoteData));
            } else{
                await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(new Array(CHECKBOX_COUNT).fill(false)));
            }
            await publisher.publish('internal-server:checkbox-change', JSON.stringify(data));
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

    app.get('/state', async (req, res) => {
        const existingState = await redis.get(CHECKBOX_STATE_KEY);
        if(existingState){
            return res.json({
                checkboxes: JSON.parse(existingState)
            });
        } else {
            return res.json({
                checkboxes: new Array(CHECKBOX_COUNT).fill(false)
            });
        }
    });

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    })
}

main();