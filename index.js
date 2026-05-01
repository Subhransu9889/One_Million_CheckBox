import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

const app = express();
app.use(express.static(path.resolve("./public")));

const PORT = process.env.PORT || 9000;




async function main(){
    const server = http.createServer(app);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    })
}

main();