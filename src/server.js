import app from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

const server  = app.listen(PORT, ()=> {
    console.log(`Server listening on ${PORT}`);
});

function shutdown(signal) {
    console.log(`${signal} recieved. shutting down gracefully`);
    server.close((error) => {
        if(error){
            console.error('Error during server shutdown:',error);
            process.exitCode = 1;
        }
    });
}

process.once('SIGINT',() => shutdown('SIGINT'));
process.once('SIGTERM',() => shutdown('SIGTERM'));
