import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, GameMode, Player, ChatMessage, BingoNumber, BingoCardState, BingoCell, GameConfig } from './types';
import { BINGO_LETTERS, UI_TEXT, TOTAL_NUMBERS, DEFAULT_CONFIG, AVATARS } from './constants';
import { generateBingoPhrase } from './services/geminiService';
import { db } from './services/firebase';
import { ref, set, onValue, update, push, child, get, remove } from 'firebase/database';
import BingoCard from './components/BingoCard';
import NumberDisplay from './components/NumberDisplay';
import { Play, RotateCcw, Send, Settings, Trophy, Users, User, Mic, Copy, LogOut, AlertCircle } from 'lucide-react';

// --- Helper Functions ---

const createBingoCard = (): BingoCardState => {
  const card: BingoCardState = [];
  const cols = [
    [1, 15], [16, 30], [31, 45], [46, 60], [61, 75]
  ];

  // Helper to get random unique numbers
  const getNumbers = (min: number, max: number, count: number) => {
    const nums = new Set<number>();
    while (nums.size < count) {
      nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return Array.from(nums);
  };

  // Generate columns first
  const columnData = cols.map(range => getNumbers(range[0], range[1], 5));

  // Transpose to rows
  for (let r = 0; r < 5; r++) {
    const row: BingoCell[] = [];
    for (let c = 0; c < 5; c++) {
      let val: number | 'FREE' = columnData[c][r];
      if (r === 2 && c === 2) val = 'FREE';
      row.push({
        value: val,
        daubed: val === 'FREE',
        rowIndex: r,
        colIndex: c
      });
    }
    card.push(row);
  }
  return card;
};

const checkWin = (card: BingoCardState): boolean => {
  // Check Rows
  for (let r = 0; r < 5; r++) {
    if (card[r].every(c => c.daubed)) return true;
  }
  // Check Cols
  for (let c = 0; c < 5; c++) {
    if (card.every(row => row[c].daubed)) return true;
  }
  // Diagonals
  if ([0,1,2,3,4].every(i => card[i][i].daubed)) return true;
  if ([0,1,2,3,4].every(i => card[i][4-i].daubed)) return true;

  return false;
};

const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// --- Main Component ---

export default function App() {
  // -- Local State --
  const [status, setStatus] = useState<GameStatus>(GameStatus.LOBBY);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [inputRoomId, setInputRoomId] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  
  // -- Synced Game State --
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [ticket, setTicket] = useState<BingoCardState>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [winner, setWinner] = useState<Player | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  
  const autoCallInterval = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = UI_TEXT[config.language || 'vi'];

  // -- Firebase Effects --

  // Check DB Connection on Mount
  useEffect(() => {
    if (!db) {
      setDbError("Lỗi hệ thống: Không thể kết nối tới Firebase Database. Vui lòng kiểm tra console.");
      return;
    }
    
    // Test simple connection
    const connectedRef = ref(db, ".info/connected");
    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === false) {
        // Optional: Show offline status
      } else {
        setDbError(null);
      }
    }, (error) => {
      console.error("DB Permission Error:", error);
      // If we get permission denied on .info/connected, it's rare, but handles general read errors
    });

    return () => unsubscribe();
  }, []);

  // Listen to Room Data
  useEffect(() => {
    if (!roomId || !db) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStatus(data.status);
        setConfig(data.config || DEFAULT_CONFIG);
        setCalledNumbers(data.calledNumbers || []);
        setCurrentNumber(data.currentNumber || null);
        setCurrentPhrase(data.currentPhrase || null);
        setWinner(data.winner || null);
        
        if (data.players) {
          setPlayers(Object.values(data.players));
        }

        if (data.chat) {
          const chats = Object.values(data.chat) as ChatMessage[];
          setChatHistory(chats.sort((a, b) => a.timestamp - b.timestamp));
        }
      } else {
        // Room might have been deleted
        setStatus(GameStatus.LOBBY);
        setRoomId('');
        alert("Phòng không tồn tại hoặc đã bị đóng.");
      }
    }, (error) => {
       console.error("Firebase Read Error:", error);
       if (error.message.includes('permission_denied')) {
          setDbError("Lỗi quyền truy cập (Permission Denied). Vui lòng kiểm tra Rules trên Firebase Console.");
       }
    });

    return () => {
      unsubscribe();
      if (autoCallInterval.current) clearInterval(autoCallInterval.current);
    };
  }, [roomId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Host Logic: Auto Call
  useEffect(() => {
    if (isHost && status === GameStatus.PLAYING && config.autoCall) {
      if (!autoCallInterval.current) {
        autoCallInterval.current = window.setInterval(() => {
          handleCallNextNumber();
        }, config.callSpeed * 1000);
      }
    } else {
      if (autoCallInterval.current) {
        clearInterval(autoCallInterval.current);
        autoCallInterval.current = null;
      }
    }
    return () => {
      if (autoCallInterval.current) clearInterval(autoCallInterval.current);
    };
  }, [isHost, status, config.autoCall, config.callSpeed, calledNumbers]);


  // -- Actions --

  const createRoom = async () => {
    if (!db) return;
    if (!playerName.trim()) return;
    
    try {
      const newRoomId = generateRoomId();
      const newPlayerId = Date.now().toString();
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      
      const playerData: Player = {
        id: newPlayerId,
        name: playerName,
        avatar,
        score: 0,
        isBot: false
      };

      const initialRoomData = {
        status: GameStatus.LOBBY,
        config: DEFAULT_CONFIG,
        players: {
          [newPlayerId]: playerData
        },
        hostId: newPlayerId,
        createdAt: Date.now()
      };

      await set(ref(db, `rooms/${newRoomId}`), initialRoomData);

      // Set Local State
      setRoomId(newRoomId);
      setPlayerId(newPlayerId);
      setIsHost(true);
      setTicket(createBingoCard()); // Host also gets a card
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tạo phòng. Vui lòng thử lại.");
    }
  };

  const joinRoom = async () => {
    if (!db) return;
    if (!playerName.trim() || !inputRoomId.trim()) return;
    
    try {
      const cleanRoomId = inputRoomId.trim().toUpperCase();
      const roomRef = ref(db, `rooms/${cleanRoomId}`);
      const snapshot = await get(roomRef);

      if (snapshot.exists()) {
        const newPlayerId = Date.now().toString();
        const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        
        const playerData: Player = {
          id: newPlayerId,
          name: playerName,
          avatar,
          score: 0,
          isBot: false
        };

        await update(ref(db, `rooms/${cleanRoomId}/players`), {
          [newPlayerId]: playerData
        });
        
        // Send join message
        const msgRef = push(child(ref(db), `rooms/${cleanRoomId}/chat`));
        await set(msgRef, {
          id: msgRef.key,
          playerId: 'system',
          playerName: 'System',
          content: `${playerName} đã tham gia phòng!`,
          timestamp: Date.now(),
          type: 'system'
        });

        setRoomId(cleanRoomId);
        setPlayerId(newPlayerId);
        setIsHost(false);
        setTicket(createBingoCard());
      } else {
        alert("Mã phòng không hợp lệ!");
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'PERMISSION_DENIED') {
        alert("Lỗi quyền truy cập. Vui lòng kiểm tra Rules trên Firebase Console.");
      } else {
        alert("Lỗi khi tham gia. Vui lòng thử lại.");
      }
    }
  };

  const startGame = () => {
    if (!isHost || !db) return;
    update(ref(db, `rooms/${roomId}`), {
      status: GameStatus.PLAYING,
      calledNumbers: [],
      currentNumber: null,
      winner: null
    });
    // System message
    sendChatMessage("system", "Trò chơi bắt đầu! Chúc may mắn!");
  };

  const handleCallNextNumber = async () => {
    if (!db) return;
    // Only host calls numbers
    const allNumbers = Array.from({length: 75}, (_, i) => i + 1);
    const available = allNumbers.filter(n => !calledNumbers.includes(n));

    if (available.length === 0) {
      update(ref(db, `rooms/${roomId}`), { status: GameStatus.ENDED });
      return;
    }

    const idx = Math.floor(Math.random() * available.length);
    const nextNum = available[idx];

    // Generate Phrase AI
    const phrase = await generateBingoPhrase(nextNum, config.language);

    // Atomic update
    const updates: any = {};
    updates[`rooms/${roomId}/currentNumber`] = nextNum;
    updates[`rooms/${roomId}/currentPhrase`] = phrase;
    updates[`rooms/${roomId}/calledNumbers`] = [...calledNumbers, nextNum];

    await update(ref(db), updates);
  };

  const onCellClick = (clickedCell: BingoCell) => {
    if (status !== GameStatus.PLAYING) return;
    
    // Check if number was called
    const isValid = clickedCell.value === 'FREE' || (typeof clickedCell.value === 'number' && calledNumbers.includes(clickedCell.value));
    
    if (!isValid) return;

    const newTicket = ticket.map(row => 
      row.map(cell => {
        if (cell.rowIndex === clickedCell.rowIndex && cell.colIndex === clickedCell.colIndex) {
          return { ...cell, daubed: true };
        }
        return cell;
      })
    );
    
    setTicket(newTicket);

    if (checkWin(newTicket) && !winner) {
      handleWin();
    }
  };

  const handleWin = () => {
    if (!db) return;
    const myPlayer = players.find(p => p.id === playerId);
    if (!myPlayer) return;

    // Update Winner in DB
    update(ref(db, `rooms/${roomId}`), {
      winner: myPlayer,
      status: GameStatus.ENDED
    });
    
    sendChatMessage('system', `${myPlayer.name} ĐÃ CHIẾN THẮNG BINGO!!!`, 'win');
  };

  const sendChatMessage = (pid: string, content: string, type: 'chat' | 'system' | 'win' = 'chat') => {
    if (!roomId || !db) return;
    const msgRef = push(child(ref(db), `rooms/${roomId}/chat`));
    const playerNameToSend = pid === 'system' ? 'BingoHub' : players.find(p => p.id === pid)?.name || 'Unknown';
    
    set(msgRef, {
      id: msgRef.key,
      playerId: pid,
      playerName: playerNameToSend,
      content,
      timestamp: Date.now(),
      type
    });
  };

  const handleUserChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(playerId, chatInput);
    setChatInput('');
  };

  const updateConfig = (newConfig: Partial<GameConfig>) => {
    if (!isHost || !db) return;
    update(ref(db, `rooms/${roomId}/config`), newConfig);
  };

  const leaveRoom = () => {
    setRoomId('');
    setStatus(GameStatus.LOBBY);
    setTicket([]);
    setCalledNumbers([]);
    setIsHost(false);
    // Ideally remove player from DB, but keeping it simple for now
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert(`Đã sao chép mã phòng: ${roomId}`);
  };

  // --- Renders ---

  // Global Error UI
  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] p-4">
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-3xl shadow-2xl max-w-md text-center">
           <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h2 className="text-2xl font-bold text-red-400 mb-2">Lỗi Kết Nối</h2>
           <p className="text-gray-300">{dbError}</p>
           <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition">
             Tải lại trang
           </button>
        </div>
      </div>
    );
  }

  if (!roomId || status === GameStatus.LOBBY) {
    if (roomId) {
      // In Lobby (Room Created/Joined)
      return (
         <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a2e] p-4">
            <div className="bg-[#16213e] p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-[#0f3460] text-center">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500 mb-2">
                 Phòng: {roomId}
              </h1>
              <p className="text-gray-400 mb-6">Đợi người chơi khác tham gia...</p>

              <div className="flex justify-center gap-4 mb-8">
                <div className="bg-black/30 p-4 rounded-xl flex items-center gap-4 border border-white/10">
                   <Users className="text-blue-400" />
                   <span className="text-2xl font-bold text-white">{players.length}</span>
                </div>
                <button onClick={copyRoomId} className="bg-blue-600/20 hover:bg-blue-600/40 p-4 rounded-xl border border-blue-500/30 transition">
                  <Copy className="text-blue-400" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto mb-8 bg-black/20 rounded-xl p-2">
                 {players.map(p => (
                   <div key={p.id} className="flex items-center gap-3 p-2 border-b border-white/5 last:border-0">
                      <span className="text-xl">{p.avatar}</span>
                      <span className="text-white font-medium">{p.name} {p.id === playerId && '(Bạn)'} {p.id === players[0]?.id && '👑'}</span>
                   </div>
                 ))}
              </div>

              <div className="flex flex-col gap-3">
                {isHost ? (
                   <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-xl shadow-lg hover:scale-105 transition">
                     Bắt đầu Game
                   </button>
                ) : (
                   <div className="text-yellow-400 animate-pulse font-medium">Đang chờ chủ phòng bắt đầu...</div>
                )}
                <button onClick={leaveRoom} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold border border-red-500/30">
                  Rời phòng
                </button>
              </div>
            </div>
         </div>
      );
    }

    // Default Login / Join Screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
          <h1 className="text-5xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
            BingoHub
          </h1>
          <p className="text-center text-indigo-200 mb-8">{t.title}</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-indigo-200 mb-2">{t.enterName}</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/20 border border-indigo-500/30 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Tên của bạn..."
              />
            </div>

            <div className="border-t border-white/10 my-4"></div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <button 
                onClick={createRoom}
                disabled={!playerName}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-bold text-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" /> {t.createRoom}
              </button>
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                  placeholder="Mã Phòng (6 ký tự)"
                  className="flex-1 px-4 py-3 rounded-xl bg-black/20 border border-indigo-500/30 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-center uppercase font-mono tracking-widest"
                />
                <button 
                  onClick={joinRoom}
                  disabled={!playerName || !inputRoomId}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-lg shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vào
                </button>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="flex justify-center space-x-4 mt-4">
               <button onClick={() => setConfig({...config, language: 'vi'})} className={`text-sm ${config.language === 'vi' ? 'text-white font-bold underline' : 'text-gray-400'}`}>Tiếng Việt</button>
               <button onClick={() => setConfig({...config, language: 'en'})} className={`text-sm ${config.language === 'en' ? 'text-white font-bold underline' : 'text-gray-400'}`}>English</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING UI ---
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col md:flex-row overflow-hidden">
      
      {/* --- Left Sidebar: Game Info & Players (Desktop) --- */}
      <div className="hidden md:flex flex-col w-64 bg-[#16213e] border-r border-[#0f3460] p-4">
        <h2 className="text-2xl font-bold text-pink-500 mb-6 flex items-center gap-2 cursor-pointer" onClick={() => copyRoomId()}>
          <Trophy className="w-6 h-6" /> BingoHub <span className="text-xs bg-gray-700 px-2 py-1 rounded text-white font-mono">{roomId}</span>
        </h2>
        
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-gray-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> {t.players} ({players.length})
          </h3>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.id === playerId ? 'bg-pink-900/30 border border-pink-500/30' : 'bg-[#0f3460]/50'}`}>
                <span className="text-xl">{p.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-200">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {p.id === players[0]?.id ? 'Host' : 'Player'} {winner?.id === p.id && '🏆'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Main Game Area --- */}
      <div className="flex-1 flex flex-col h-screen relative">
        
        {/* Header/Controls */}
        <div className="p-4 flex items-center justify-between bg-[#16213e] md:bg-transparent">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-bold text-pink-500">ID: {roomId}</span>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
             <button onClick={leaveRoom} className="text-red-400 hover:text-red-300 mr-2" title="Rời phòng">
                <LogOut className="w-6 h-6" />
             </button>

            {isHost && (
               <button 
               onClick={() => updateConfig({ autoCall: !config.autoCall })}
               className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${config.autoCall ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}
             >
               {t.autoPlay} {config.autoCall ? 'ON' : 'OFF'}
             </button>
            )}
             <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Settings Modal Popover */}
        {showSettings && (
          <div className="absolute top-16 right-4 w-64 bg-gray-800 p-4 rounded-xl shadow-2xl z-50 border border-gray-700">
             <h4 className="text-white font-bold mb-4 border-b border-gray-700 pb-2">{t.settings}</h4>
             {isHost ? (
               <div className="mb-4">
                  <label className="text-xs text-gray-400 block mb-1">{t.speed}</label>
                  <input 
                    type="range" min="2" max="10" step="1" 
                    value={config.callSpeed}
                    onChange={(e) => updateConfig({ callSpeed: parseInt(e.target.value) })}
                    className="w-full accent-pink-500"
                  />
                  <div className="text-right text-xs text-gray-300">{config.callSpeed}s</div>
               </div>
             ) : (
                <p className="text-xs text-gray-500 italic mb-4">Chỉ Host mới có thể chỉnh tốc độ.</p>
             )}
             
             <div className="mb-2">
               <label className="text-xs text-gray-400 block mb-1">{t.language}</label>
               <div className="flex gap-2">
                 <button onClick={() => isHost && updateConfig({ language: 'vi' })} className={`flex-1 py-1 rounded text-xs ${config.language === 'vi' ? 'bg-pink-600' : 'bg-gray-700'} ${!isHost && 'opacity-50 cursor-not-allowed'}`}>Tiếng Việt</button>
                 <button onClick={() => isHost && updateConfig({ language: 'en' })} className={`flex-1 py-1 rounded text-xs ${config.language === 'en' ? 'bg-pink-600' : 'bg-gray-700'} ${!isHost && 'opacity-50 cursor-not-allowed'}`}>English</button>
               </div>
             </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
           <NumberDisplay 
              currentNumber={currentNumber} 
              phrase={currentPhrase} 
              previousNumbers={calledNumbers}
              language={config.language || 'vi'}
           />
           
           <div className="flex justify-center mt-4 pb-8">
              {/* Everyone sees their own card */}
              <BingoCard 
                card={ticket} 
                onCellClick={onCellClick} 
                lastCalledNumber={currentNumber}
                disabled={status === GameStatus.ENDED}
              />
           </div>

           {/* Host Manual Control (Optional) */}
           {isHost && !config.autoCall && status === GameStatus.PLAYING && (
              <div className="flex justify-center mb-8">
                <button onClick={handleCallNextNumber} className="py-3 px-8 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full shadow-lg flex items-center gap-2 transform hover:scale-105 transition">
                  <Play className="w-5 h-5" /> {t.manualCall}
                </button>
              </div>
           )}
        </div>

        {/* Winner Overlay */}
        {winner && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-1 rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-pop">
                <div className="bg-[#1a1a2e] p-8 rounded-xl text-center">
                   <div className="text-6xl mb-4">🏆</div>
                   <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">BINGO!</h2>
                   <p className="text-gray-300 mb-6">{t.winner} <span className="font-bold text-white text-xl block mt-2">{winner.name}</span></p>
                   {isHost ? (
                     <button onClick={startGame} className="w-full py-3 bg-pink-600 hover:bg-pink-700 rounded-lg font-bold text-white transition">
                        {t.restart}
                     </button>
                   ) : (
                     <p className="text-sm text-gray-400">Đợi Host bắt đầu ván mới...</p>
                   )}
                </div>
             </div>
          </div>
        )}

      </div>

      {/* --- Right Sidebar: Chat (or Bottom on Mobile) --- */}
      <div className="w-full md:w-80 bg-[#16213e] border-t md:border-t-0 md:border-l border-[#0f3460] flex flex-col h-64 md:h-auto">
        <div className="p-3 border-b border-[#0f3460] font-bold text-gray-300 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {t.chat}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatHistory.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : (msg.playerId === playerId ? 'items-end' : 'items-start')}`}>
               {msg.type === 'system' ? (
                 <span className="text-xs text-gray-500 italic bg-gray-800/50 px-2 py-1 rounded-full text-center">{msg.content}</span>
               ) : msg.type === 'win' ? (
                  <div className="w-full bg-yellow-500/10 border border-yellow-500/30 p-2 rounded text-center">
                    <span className="text-yellow-400 font-bold">🎉 {msg.content}</span>
                  </div>
               ) : (
                 <div className={`max-w-[85%] ${msg.playerId === playerId ? 'items-end' : 'items-start'}`}>
                    <span className={`text-xs font-bold block mb-0.5 ${msg.playerId === playerId ? 'text-pink-400 text-right' : 'text-blue-400'}`}>{msg.playerName}</span>
                    <div className={`${msg.playerId === playerId ? 'bg-pink-600/20 text-pink-100 rounded-tl-xl' : 'bg-[#0f3460] text-gray-200 rounded-tr-xl'} py-2 px-3 rounded-bl-xl rounded-br-xl text-sm break-words`}>
                      {msg.content}
                    </div>
                 </div>
               )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 bg-[#0f3460]/30 border-t border-[#0f3460] flex gap-2">
           <input 
             type="text"
             value={chatInput}
             onChange={(e) => setChatInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleUserChat()}
             className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
             placeholder="..."
           />
           <button onClick={handleUserChat} className="p-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white">
             <Send className="w-4 h-4" />
           </button>
        </div>
      </div>
      
    </div>
  );
}