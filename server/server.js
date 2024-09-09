// server.js
const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let gameState = {
    cards: [],
    flippedCards: [],
    timer: 60,
    score: 0,
    gameEnded: false,
    timeCustom: 60,
};

server.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        switch (data.type) {
            case 'UPDATE_GAME_STATE':
                gameState = data.payload;
                break;
            case 'GET_GAME_STATE':
                ws.send(JSON.stringify({ type: 'GAME_STATE', payload: gameState }));
                break;
            default:
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WebSocket server started on ws://localhost:8080');
