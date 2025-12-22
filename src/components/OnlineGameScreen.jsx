import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Clock, Send, Share2, PlayCircle, Mic, Crown, LogOut, X, Lock } from 'lucide-react';
import Visualizer from './Visualizer';
import { GameMode, PlaybackPosition, randomEmojiAvatar } from '../constants';
import { db, fs, updateRoomState, removePlayerFromRoom } from '../firebase';

const OnlineGameScreen = ({
  settings,
  setSettings,
  players,
  setPlayers,
  currentSong,
  songIndex,
  totalSongs,
  onNextSong,
  onEndGame,
  roomId
}) => {
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [progress, setProgress] = useState(0);
  
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [startOffset, setStartOffset] = useState(0);
  const [guessedPlayers, setGuessedPlayers] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copyHint, setCopyHint] = useState('');

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const startOffsetRef = useRef(0);
  const countdownRef = useRef(null);
  const advanceRef = useRef(false);
  const currentPlayerIdRef = useRef(null);

  const isHost = players.find(p => p.isCurrentUser)?.isHost;
  const maxDuration = settings.isFullSong ? 180 : settings.durationSeconds;

  // 获取当前玩家ID
  useEffect(() => {
    currentPlayerIdRef.current = window.__currentPlayerId;
  }, []);

  // 订阅当前房间的聊天消息（Firestore）
  useEffect(() => {
    if (!roomId) return;
    const { collection, query, orderBy, onSnapshot, limit } = fs;
    try {
      const q = query(
        collection(db, 'rooms', roomId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(200)
      );

      const unsub = onSnapshot(q, (snap) => {
        const remoteMessages = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setMessages(remoteMessages);
      });

      return () => unsub();
    } catch (err) {
      console.error('订阅房间消息失败:', err);
    }
  }, [roomId]);

  // 订阅房间的在线玩家列表（Firestore）
  useEffect(() => {
    if (!roomId) return;
    const { collection, query, orderBy, onSnapshot } = fs;
    try {
      const q = query(
        collection(db, 'rooms', roomId, 'players'),
        orderBy('createdAt', 'asc')
      );
      const unsub = onSnapshot(q, (snap) => {
        const currentId = currentPlayerIdRef.current;
        const remotePlayers = snap.docs.map(d => {
          const data = d.data() || {};
          const baseName = data.name || '玩家';
          const isHostRemote = !!data.isHost;
          const isMe = d.id === currentId;
          const displayName = isHostRemote ? `${baseName}（房主）` : baseName;
          return {
            id: d.id,
            name: displayName,
            rawName: baseName,
            avatar: data.avatar || randomEmojiAvatar(),
            score: data.score || 0,
            isCurrentUser: isMe,
            isHost: isHostRemote
          };
        });
        setPlayers(remotePlayers);
      });
      return () => unsub();
    } catch (err) {
      console.error('订阅房间玩家列表失败:', err);
    }
  }, [roomId, setPlayers]);

  // 订阅房间规则和播放状态（非房主同步规则和播放进度）
  useEffect(() => {
    if (!roomId || isHost) return; // 房主不需要订阅，自己控制

    const { doc, onSnapshot } = fs;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const unsub = onSnapshot(roomRef, (snap) => {
        const data = snap.data();
        if (!data) return;

        // 同步房间规则
        if (typeof data.timeLimit === 'number') {
          setSettings(prev => ({ ...prev, timeLimit: data.timeLimit }));
        }
        if (typeof data.durationSeconds === 'number') {
          setSettings(prev => ({ ...prev, durationSeconds: data.durationSeconds }));
        }
        if (typeof data.isFullSong === 'boolean') {
          setSettings(prev => ({ ...prev, isFullSong: data.isFullSong }));
        }
        if (data.playbackPosition === PlaybackPosition.RANDOM || data.playbackPosition === PlaybackPosition.START) {
          setSettings(prev => ({ ...prev, playbackPosition: data.playbackPosition }));
        }

        // 同步播放状态和进度
        if (typeof data.isPlaying === 'boolean') {
          const audio = audioRef.current;
          if (!audio) return;

          const segStart = typeof data.segmentStart === 'number' ? data.segmentStart : 0;
          const startedAt = data.startedAt || Date.now();
          const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
          const currentTime = segStart + elapsed;

          if (data.isPlaying) {
            // 同步播放进度
            audio.currentTime = currentTime;
            setStartOffset(segStart);
            startOffsetRef.current = segStart;
            setProgress(elapsed);
            audio.play()
              .then(() => {
                setHasGameStarted(true);
                setIsPlaying(true);
              })
              .catch(() => setIsPlaying(false));
          } else {
            audio.pause();
            setIsPlaying(false);
          }
        }
      });
      return () => unsub();
    } catch (err) {
      console.error('订阅播放状态失败:', err);
    }
  }, [roomId, isHost, setSettings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setHasGameStarted(false);
    setIsPlaying(false);
    setProgress(0);
    setHasFinishedFirstPlay(false);
    setIsCountingDown(false);
    setCountdown(settings.timeLimit > 0 ? settings.timeLimit : 0);
    setStartOffset(0);
    startOffsetRef.current = 0;
    setGuessedPlayers({});
    advanceRef.current = false;
    
    setPlayers(prev => prev.map(p => ({ ...p, status: 'answering' })));
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      playerId: 'system',
      playerName: 'System',
      text: `🎵 准备播放第 ${songIndex + 1} 首`,
      type: 'system'
    }]);

    stopCountdown();

    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.pause();
    audio.src = currentSong.url;
    audio.load();

    const handleLoaded = () => {
      let randomOffset = 0;
      const duration = audio.duration || maxDuration;
      // 非房主等待房主广播起点，房主自己计算
      if (isHost && settings.playbackPosition === PlaybackPosition.RANDOM && !settings.isFullSong) {
        randomOffset = Math.random() * Math.max(0, duration - settings.durationSeconds);
      }
      setStartOffset(randomOffset);
      startOffsetRef.current = randomOffset;
      setProgress(0);
      audio.currentTime = randomOffset;
    };

    const handleTimeUpdate = () => {
      const elapsed = Math.max(0, audio.currentTime - startOffsetRef.current);
      setProgress(elapsed);
      if (elapsed >= maxDuration) {
        handlePlaybackFinish();
      }
    };

    const handleEnded = () => handlePlaybackFinish();

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong, maxDuration, settings.playbackPosition, settings.durationSeconds, settings.timeLimit, songIndex, isHost, setPlayers]);

  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      countdownRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopCountdown();
            setIsCountingDown(false);

            const isLast = songIndex + 1 >= totalSongs;

            setMessages(m => [...m, {
                id: `timeup-${Date.now()}`,
                playerId: 'system',
                playerName: 'System',
                text: `⏰ 时间到！正确答案：${currentSong.title}`,
                type: 'system'
            }]);

            setTimeout(() => {
              if (isLast) {
                onEndGame();
              } else {
                onNextSong();
              }
            }, 1000);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopCountdown();
    }
    return () => stopCountdown();
  }, [isCountingDown, countdown, songIndex, totalSongs, currentSong.title, onNextSong, onEndGame]);

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handlePlaybackFinish = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setHasFinishedFirstPlay(prev => {
      if (!prev && settings.timeLimit > 0) {
        setIsCountingDown(true);
      }
      return true;
    });
  };

  const handleHostStart = () => {
    const audio = audioRef.current;
    let segmentStart = 0;
    if (audio) {
      const duration = audio.duration || maxDuration;
      if (settings.playbackPosition === PlaybackPosition.RANDOM && !settings.isFullSong) {
        segmentStart = Math.random() * Math.max(0, duration - settings.durationSeconds);
      }
      setStartOffset(segmentStart);
      startOffsetRef.current = segmentStart;
      setProgress(0);
      audio.currentTime = segmentStart;
    }

    setHasGameStarted(true);
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));

    // 房主开始播放时，同步播放状态、起点和时间戳
    if (roomId && isHost) {
      updateRoomState(roomId, { 
        isPlaying: true, 
        segmentStart,
        startedAt: Date.now()
      });
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      playerId: 'system',
      playerName: 'System',
      text: '🎮 游戏开始！请听歌猜名！',
      type: 'system'
    }]);
  };

  const togglePlay = () => {
    // 第一遍播放时禁用暂停
    if (!hasGameStarted || !hasFinishedFirstPlay) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (roomId && isHost) {
        updateRoomState(roomId, { isPlaying: false });
      }
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        if (roomId && isHost) {
          updateRoomState(roomId, { isPlaying: true, startedAt: Date.now() });
        }
      }).catch(() => setIsPlaying(false));
    }
  };

  async function publishAnswerAndAdvance() {
    if (advanceRef.current) return;
    advanceRef.current = true;

    if (roomId && isHost) {
      try {
        const { collection, addDoc, serverTimestamp } = fs;
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
          playerId: 'system',
          playerName: 'System',
          text: `✅ 正确答案：${currentSong.title}`,
          type: 'system',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('发布答案消息失败:', err);
      }
    }

    setTimeout(() => {
      const isLast = songIndex + 1 >= totalSongs;
      if (isLast) {
        onEndGame();
      } else {
        onNextSong();
      }
    }, 800);
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const isCorrect = inputVal.toLowerCase().includes(currentSong.title.toLowerCase());
    const currentUser = players.find(p => p.isCurrentUser);

    try {
      if (roomId) {
        const { collection, addDoc, serverTimestamp } = fs;
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
          playerId: currentUser?.id || 'unknown',
          playerName: currentUser?.rawName || currentUser?.name || '我',
          text: inputVal,
          type: 'user',
          createdAt: serverTimestamp()
        });
        setInputVal('');
      }
    } catch (err) {
      console.error('发送消息失败:', err);
    }

    if (isCorrect && hasGameStarted) {
      const newGuessed = { ...guessedPlayers, [currentUser?.id || 'unknown']: true };
      setGuessedPlayers(newGuessed);

      const allGuessed = Object.keys(newGuessed).length >= players.length;

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          playerId: 'system',
          playerName: 'System',
          text: `🎉 ${currentUser?.name} 猜对了！${currentUser?.isCurrentUser ? `歌名是 ${currentSong.title}` : '答案已被猜出'}`,
          type: 'correct'
        }]);
        
        setPlayers(prev => prev.map(p => p.isCurrentUser ? { ...p, score: p.score + 20 } : p));

        if (allGuessed) {
          publishAnswerAndAdvance();
        }
      }, 500);
    }
  };

  const handleInvite = () => {
    setShowInviteModal(true);
  };

  const copyInviteLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId || '');
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
      setCopyHint('链接已复制');
      setTimeout(() => setCopyHint(''), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      window.prompt('复制下面的链接发送给好友：', link);
    }
  };

  const handleExitRoom = () => {
    if (window.confirm("确定要退出房间吗？")) {
      const currentId = currentPlayerIdRef.current;
      if (roomId && currentId) {
        removePlayerFromRoom(roomId, currentId);
      }
      onEndGame();
    }
  };

  const handleSliderChange = (e) => {
    if (!hasGameStarted || !hasFinishedFirstPlay) return;
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current) {
      audioRef.current.currentTime = startOffsetRef.current + val;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      
      <div className="bg-white p-3 shadow-sm flex justify-between items-center rounded-b-3xl z-20 shrink-0">
        <div className="flex items-center gap-2">
            <button 
                onClick={handleExitRoom}
                className="bg-red-50 text-red-500 p-2 rounded-full active:scale-95 hover:bg-red-100"
            >
                <LogOut size={16} />
            </button>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ROOM #{roomId || '----'}</span>
                <span className="font-black text-slate-800 text-sm">第 {songIndex + 1}/{totalSongs} 首</span>
            </div>
        </div>
        <button onClick={handleInvite} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors">
          <Share2 size={14} /> 邀请
        </button>
      </div>

      <div className="bg-slate-50 border-b border-slate-100 overflow-x-auto p-3 flex gap-3 shrink-0 min-h-[90px] items-center no-scrollbar">
        {players.map(p => (
          <div key={p.id} className="flex flex-col items-center min-w-[56px] relative group">
            <div className={`relative transform transition-transform group-hover:scale-110 ${p.isCurrentUser ? 'ring-2 ring-green-400 rounded-full p-[2px]' : ''}`}>
              {p.avatar && /^https?:/.test(p.avatar) ? (
                <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-slate-100 flex items-center justify-center text-lg">
                  {p.avatar || '👤'}
                </div>
              )}
              <div className="absolute -top-2 -right-1 bg-yellow-400 text-white p-0.5 rounded-full shadow-sm border border-white">
                {p.isHost ? <Crown size={8} /> : null}
              </div>
              <div className="absolute -bottom-2 -right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 rounded-full border border-white shadow-sm">
                {p.score}
              </div>
            </div>
            <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-2 bg-white rounded-2xl p-3 shadow-lg shadow-slate-200/50 z-10 shrink-0 border border-slate-100 relative">
        <div className="flex items-center gap-3">
          <button 
             onClick={togglePlay} 
             disabled={!hasGameStarted || !hasFinishedFirstPlay}
             className={`p-2.5 rounded-full shadow-md active:scale-95 transition flex-shrink-0 ${hasGameStarted && hasFinishedFirstPlay ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-slate-100 text-slate-300'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
          </button>
          
          <div className="flex-1 overflow-hidden relative h-8 flex items-end opacity-50 justify-center">
             {isCountingDown ? (
                 <div className="flex items-center gap-2 text-orange-500 font-black animate-pulse">
                    <Clock size={16} /> 倒计时: {countdown}s
                 </div>
             ) : (
                <Visualizer isPlaying={isPlaying} />
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 relative">
           <span className="text-[9px] font-bold text-slate-400 w-6 text-right">{Math.floor(progress)}s</span>
           <div className="flex-1 relative">
                <input
                    type="range"
                    min="0"
                    max={maxDuration}
                    step="0.1"
                    value={progress}
                    onChange={handleSliderChange}
                    disabled={!hasGameStarted || !hasFinishedFirstPlay}
                    className={`w-full h-1.5 rounded-lg appearance-none ${(!hasGameStarted || !hasFinishedFirstPlay) ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-100 accent-purple-500 cursor-pointer'}`}
                />
                {!hasFinishedFirstPlay && hasGameStarted && (
                     <div className="absolute top-[-15px] left-1/2 -translate-x-1/2">
                        <span className="text-[8px] flex items-center gap-1 text-slate-400 bg-white/80 px-1.5 rounded-full border border-slate-100"><Lock size={6}/> 播放完解锁</span>
                     </div>
                )}
           </div>
           <span className="text-[9px] font-bold text-slate-400 w-6">{maxDuration}s</span>
        </div>

        {isHost && !hasGameStarted && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
             <button 
              onClick={handleHostStart}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-yellow-200 animate-pulse flex items-center gap-2 transform transition hover:scale-105"
            >
              <PlayCircle size={16} /> 房主开始游戏
            </button>
          </div>
        )}
      </div>
      
      {isHost && hasGameStarted && (
         <div className="flex justify-center mt-2 shrink-0">
             <button 
               onClick={publishAnswerAndAdvance}
               className="text-[10px] bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full font-bold transition-colors border border-green-200"
             >
               公布答案
             </button>
         </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 no-scrollbar">
        {messages.map(msg => {
          if (msg.type === 'system') {
            const isAnswerMsg = msg.text && msg.text.includes('正确答案');
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span
                  className={`text-[11px] font-bold px-4 py-1.5 rounded-full tracking-wide ${
                    isAnswerMsg
                      ? 'bg-green-100 text-green-700 border border-green-400 shadow-sm'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            );
          }
          if (msg.type === 'correct') {
            return (
              <div key={msg.id} className="flex justify-center my-2 w-full">
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 text-yellow-800 font-bold text-xs px-4 py-2 rounded-xl shadow-sm animate-bounce text-center">
                  {msg.text}
                </div>
              </div>
            );
          }
          const isMe = msg.playerId === players.find(p => p.isCurrentUser)?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-popIn`}>
              <div className={`max-w-[85%] px-3 py-2 text-sm font-medium shadow-sm break-words relative ${
                isMe 
                ? 'bg-green-500 text-white rounded-2xl rounded-tr-sm' 
                : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'
              }`}>
                {!isMe && <p className="text-[9px] font-bold text-slate-400 mb-0.5">{msg.playerName}</p>}
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-white p-2 shadow-up border-t border-slate-50 flex gap-2 shrink-0 pb-safe z-20">
        <div className="flex-1 relative">
           <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={hasGameStarted ? "猜猜是哪首歌..." : "聊天 / 等待中..."}
            className="w-full bg-slate-100 text-slate-800 rounded-full pl-4 pr-9 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-all placeholder-slate-400 text-sm"
          />
          <Mic className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        </div>
        <button 
          type="submit" 
          className="bg-green-500 text-white w-10 h-10 rounded-full shadow-lg shadow-green-200 hover:bg-green-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center active:scale-95" 
          disabled={!inputVal.trim()}
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </form>

      {/* 邀请弹窗 */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm mx-4 p-6 rounded-3xl shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"
            >
              <X size={18} />
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-black text-slate-800 mb-1">邀请好友加入</h2>
              <p className="text-xs text-slate-400">
                房间号和邀请链接二选一发给好友，对方打开链接即可自动加入该房间。
              </p>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 block mb-1">房间号</label>
              <div className="flex items-center justify-between bg-slate-100 rounded-2xl px-4 py-3 gap-2">
                <span className="font-black tracking-[0.25em] text-slate-800">{roomId || "----"}</span>
                {roomId && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(roomId);
                        setCopyHint('房间号已复制');
                        setTimeout(() => setCopyHint(''), 2000);
                      } catch (err) {
                        console.error('复制失败:', err);
                        window.prompt('复制房间号：', roomId);
                      }
                    }}
                    className="text-[10px] px-2 py-1 rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 active:scale-95 whitespace-nowrap"
                  >
                    复制
                  </button>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 block mb-1">邀请链接</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}?room=${roomId || ""}`}
                  className="flex-1 bg-slate-100 rounded-2xl px-3 py-2 text-xs text-slate-600 font-mono overflow-hidden text-ellipsis"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="flex-shrink-0 px-3 py-2 bg-green-500 text-white rounded-2xl text-xs font-bold hover:bg-green-600 active:scale-95 transition-transform"
                >
                  复制
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-slate-400">
                提示：GitHub Pages 首次打开可能稍有延迟，好友看到页面加载完毕后即可开始游戏。
              </p>
              {copyHint && (
                <span className="text-[10px] text-green-500 font-bold">
                  {copyHint}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineGameScreen;

