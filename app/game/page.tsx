"use client";
import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';

type Card = {
    id: number;
    symbol: string;
    isFlipped: boolean;
    isMatched: boolean;
};

const symbols = ['🍎', '🍌', '🍇', '🍒', '🍉', '🍍', '🍋', '🍑'];
const GRID_SIZE = 8;
const DEFAULT_TIME = 60;

const shuffleArray = (array: Card[]): Card[] => {
    return array.sort(() => Math.random() - 0.5);
};

const FlipGame = () => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [timer, setTimer] = useState(DEFAULT_TIME);
    const [score, setScore] = useState(0);
    const [gameEnded, setGameEnded] = useState(false);
    const [timeCustom, setTimeCustom] = useState(DEFAULT_TIME);
    const [showResultDialog, setShowResultDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            setWs(socket);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'INITIALIZE_GAME':
                    const { cards: initialCards, timer: initialTimer, timeCustom: initialTimeCustom } = data.payload;
                    setCards(initialCards);
                    setTimer(initialTimer);
                    setTimeCustom(initialTimeCustom);
                    setGameEnded(false);
                    break;
                case 'UPDATE_GAME_STATE':
                    const { cards: updatedCards, flippedCards: updatedFlippedCards, timer: updatedTimer, score: updatedScore, gameEnded: updatedGameEnded } = data.payload;
                    setCards(updatedCards);
                    setFlippedCards(updatedFlippedCards);
                    setTimer(updatedTimer);
                    setScore(updatedScore);
                    setGameEnded(updatedGameEnded);
                    setShowResultDialog(updatedGameEnded);
                    break;
                case 'GAME_OVER':
                    setGameEnded(true);
                    setShowResultDialog(true);
                    break;
                default:
                    break;
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
            setWs(null);
        };

        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'UPDATE_GAME_STATE',
                payload: { cards, flippedCards, timer, score, gameEnded, timeCustom }
            }));
        }
    }, [cards, flippedCards, timer, score, gameEnded, timeCustom, ws]);

    useEffect(() => {
        const initializeCards = () => {
            const cardSet: Card[] = symbols
                .flatMap((symbol, index) => [
                    { id: index * 2, symbol, isFlipped: false, isMatched: false },
                    { id: index * 2 + 1, symbol, isFlipped: false, isMatched: false },
                ])
                .slice(0, GRID_SIZE * GRID_SIZE);

            const shuffledCards = shuffleArray(cardSet);
            setCards(shuffledCards);
            setTimer(timeCustom);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'INITIALIZE_GAME',
                    payload: { cards: shuffledCards, timer: timeCustom, timeCustom }
                }));
            }
        };

        initializeCards();
    }, [timeCustom, ws]);

    useEffect(() => {
        if (timer > 0 && !gameEnded) {
            const interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (timer === 0 && !gameEnded) {
            setGameEnded(true);
            setShowResultDialog(true);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'GAME_OVER' }));
            }
        }
    }, [timer, gameEnded, ws]);

    const handleCardClick = useCallback((cardId: number) => {
        if (flippedCards.includes(cardId) || isProcessing) return;

        const newFlippedCards = [...flippedCards, cardId];
        setFlippedCards(newFlippedCards);
        setCards((prevCards) =>
            prevCards.map((card) =>
                card.id === cardId ? { ...card, isFlipped: true } : card
            )
        );

        if (newFlippedCards.length === 2) {
            setIsProcessing(true);
            setTimeout(() => {
                checkForMatch(newFlippedCards);
                setIsProcessing(false);
            }, 1000);
        }
    }, [flippedCards, isProcessing, cards]);

    const checkForMatch = (newFlippedCards: number[]) => {
        const [firstCardId, secondCardId] = newFlippedCards;
        const firstCard = cards.find((card) => card.id === firstCardId)!;
        const secondCard = cards.find((card) => card.id === secondCardId)!;

        if (firstCard.symbol === secondCard.symbol) {
            setScore((prev) => prev + 1);
            setCards((prevCards) =>
                prevCards.map((card) =>
                    card.symbol === firstCard.symbol ? { ...card, isMatched: true } : card
                )
            );
        } else {
            setCards((prevCards) =>
                prevCards.map((card) =>
                    newFlippedCards.includes(card.id)
                        ? { ...card, isFlipped: false }
                        : card
                )
            );
        }

        setFlippedCards([]);
    };

    const resetGame = () => {
        setGameEnded(false);
        setShowResultDialog(false);
        setScore(0);
        setFlippedCards([]);
        setTimer(timeCustom);
        const cardSet: Card[] = symbols
            .flatMap((symbol, index) => [
                { id: index * 2, symbol, isFlipped: false, isMatched: false },
                { id: index * 2 + 1, symbol, isFlipped: false, isMatched: false },
            ])
            .slice(0, GRID_SIZE * GRID_SIZE);
        const shuffledCards = shuffleArray(cardSet);
        setCards(shuffledCards);

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'INITIALIZE_GAME',
                payload: { cards: shuffledCards, timer: timeCustom, timeCustom }
            }));
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-blue-100">
            <div className="mb-4">
                <label className="mr-2">Custom Time (seconds): </label>
                <input
                    type="number"
                    value={timeCustom}
                    onChange={(e) => setTimeCustom(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-gray-300"
                />
            </div>

            <div className="grid grid-cols-8 gap-2">
                {cards.map((card) => (
                    <div
                        key={card.id}
                        className={`w-16 h-16 sm:w-20 sm:h-20 cursor-pointer relative transform transition-transform duration-500 ${card.isFlipped || card.isMatched ? 'flip' : ''}`}
                        onClick={() => handleCardClick(card.id)}
                    >
                        <div className={`card-inner w-full h-full absolute ${card.isFlipped || card.isMatched ? 'flip bg-transparent' : ''}`}>
                            <div className="card-front w-full h-full bg-white flex items-center justify-center text-2xl sm:text-4xl rounded-lg">
                                ❓
                            </div>
                            {!card.isMatched && (
                                <div className="card-back w-full h-full bg-blue-200 flex items-center justify-center text-2xl sm:text-4xl rounded-lg">
                                    {card.symbol}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-300 rounded-lg shadow-md" />
            </div>

            <div className="mt-4">
                <p>Time Left: {timer} seconds</p>
                <p>Score: {score}</p>
            </div>

            <Dialog open={showResultDialog} onClose={() => setShowResultDialog(false)}>
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg" style={{ backgroundColor: 'rgba(13,19,62,255)' }}>
                        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
                        <p className="mb-4">Your score: {score}</p>
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={resetGame}
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default FlipGame;
