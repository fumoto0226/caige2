import { useState, useEffect } from 'react';
import SetupScreen from './components/SetupScreen';
import LocalGameScreen from './components/LocalGameScreen';
import OnlineGameScreen from './components/OnlineGameScreen';
import ResultsScreen from './components/ResultsScreen';
import { GameMode, PlaybackPosition, SONGS, randomEmojiAvatar, generateDefaultUserName } from './constants';
import { createRoom, checkRoomExists, getRoomState, updateRoomState, addPlayerToRoom, removePlayerFromRoom, cleanupEmptyRooms, db, fs } from './firebase';

const App = () => {
  const [screen, setScreen] = useState('setup');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  
  const [settings, setSettings] = useState({
    mode: GameMode.LOCAL,
    selectedArtistIds: ['1'],
    durationSeconds: 15,
    isFullSong: false,
    playbackPosition: PlaybackPosition.RANDOM,
    questionCount: 5,
    timeLimit: 30,
    playerCount: 1,
    includeLive: true,
  });

  const [gameSongs, setGameSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [players, setPlayers] = useState([]);
  const [roomId, setRoomId] = useState('');

  // 计算当前可用题库（受歌手选择和是否包含 Live 影响）
  const availableSongs = SONGS.filter(s => 
    settings.selectedArtistIds.includes(s.artistId) &&
    (settings.includeLive || !s.isLive)
  );
  const availableCount = Math.max(1, availableSongs.length);

  // 当可用歌曲减少时，自动收缩题目数量上限
  useEffect(() => {
    if (settings.questionCount > availableCount) {
      setSettings(prev => ({ ...prev, questionCount: availableCount }));
    }
  }, [availableCount]);

  const prepareSongs = () => {
    const filteredSongs = SONGS.filter(s => 
      settings.selectedArtistIds.includes(s.artistId) &&
      (settings.includeLive || !s.isLive)
    );
    const limit = Math.min(settings.questionCount, filteredSongs.length);
    const shuffled = [...filteredSongs].sort(() => 0.5 - Math.random()).slice(0, limit);
    
    if (shuffled.length === 0) {
      alert("所选歌手没有找到歌曲！");
      return null;
    }
    return shuffled;
  };

  const generateRoomId = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const handleStartGame = (hostName) => {
    const shuffled = prepareSongs();
    if (!shuffled) return;

    setGameSongs(shuffled);
    setCurrentSongIndex(0);

    if (settings.mode === GameMode.LOCAL) {
      setPlayers([{
        id: 'p1',
        name: '玩家 1',
        avatar: randomEmojiAvatar(),
        score: 0,
        isCurrentUser: true
      }]);
    } else {
      const newRoomId = generateRoomId();
      setRoomId(newRoomId);

      // 生成当前玩家（房主）的 id 和昵称
      const baseName = hostName || generateDefaultUserName();
      const myId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const myAvatar = randomEmojiAvatar();
      window.__currentPlayerId = myId;

      const me = {
        id: myId,
        name: `${baseName}（房主）`,
        rawName: baseName,
        avatar: myAvatar,
        score: 0,
        isCurrentUser: true,
        isHost: true
      };
      setPlayers([me]);

      // 在 Firebase 中创建房间文档
      createRoom(newRoomId, baseName + '（房主）');

      // 同步房间的歌单、当前题目索引和规则
      updateRoomState(newRoomId, {
        songIds: shuffled.map(s => s.id),
        currentIndex: 0,
        timeLimit: settings.timeLimit,
        durationSeconds: settings.durationSeconds,
        isFullSong: settings.isFullSong,
        playbackPosition: settings.playbackPosition
      });

      // 将房主写入房间的 players 子集合
      addPlayerToRoom(newRoomId, myId, {
        name: baseName,
        isHost: true,
        avatar: myAvatar,
        score: 0
      });
    }

    setScreen('game');
  };

  const handleJoinGame = async (inputRoomId, joinName) => {
    // 先校验房间是否存在
    const exists = await checkRoomExists(inputRoomId);
    if (exists === false) {
      alert('房间不存在或已关闭');
      return;
    }

    // 再读取房间状态，优先使用房间里已经记录好的歌单/当前索引/规则
    const roomState = await getRoomState(inputRoomId);

    let songsForGame = null;
    if (roomState && Array.isArray(roomState.songIds) && roomState.songIds.length > 0) {
      const songMap = SONGS.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {});
      songsForGame = roomState.songIds
        .map(id => songMap[id])
        .filter(Boolean);
    }

    if (!songsForGame || songsForGame.length === 0) {
      const shuffled = prepareSongs();
      if (!shuffled) return;
      songsForGame = shuffled;
    }

    setGameSongs(songsForGame);
    setCurrentSongIndex(
      typeof roomState?.currentIndex === 'number' ? roomState.currentIndex : 0
    );
    setSettings(prev => ({ ...prev, mode: GameMode.ONLINE }));
    setRoomId(inputRoomId);

    // 同步房间规则
    if (typeof roomState?.timeLimit === 'number') {
      setSettings(prev => ({ ...prev, timeLimit: roomState.timeLimit }));
    }
    if (typeof roomState?.durationSeconds === 'number') {
      setSettings(prev => ({ ...prev, durationSeconds: roomState.durationSeconds }));
    }
    if (typeof roomState?.isFullSong === 'boolean') {
      setSettings(prev => ({ ...prev, isFullSong: roomState.isFullSong }));
    }
    if (roomState?.playbackPosition === PlaybackPosition.RANDOM || roomState?.playbackPosition === PlaybackPosition.START) {
      setSettings(prev => ({ ...prev, playbackPosition: roomState.playbackPosition }));
    }

    // 生成当前玩家（普通加入者）
    let baseName = (joinName || '').trim();
    if (!baseName) {
      baseName = generateDefaultUserName();
    }
    const myId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const myAvatar = randomEmojiAvatar();
    window.__currentPlayerId = myId;

    const me = {
      id: myId,
      name: baseName,
      rawName: baseName,
      avatar: myAvatar,
      score: 0,
      isCurrentUser: true,
      isHost: false
    };
    setPlayers([me]);

    addPlayerToRoom(inputRoomId, myId, {
      name: baseName,
      isHost: false,
      avatar: myAvatar,
      score: 0
    });

    setScreen('game');
  };

  const handleJoinWithName = (name) => {
    setShowNameModal(false);
    handleJoinGame(pendingRoomId, name || '');
  };

  const handleNextSong = () => {
    if (currentSongIndex < gameSongs.length - 1) {
      setCurrentSongIndex(prev => {
        const next = prev + 1;
        if (settings.mode === GameMode.ONLINE && roomId) {
          updateRoomState(roomId, { currentIndex: next, isPlaying: false });
        }
        return next;
      });
    } else {
      setScreen('results');
    }
  };

  const handleEndGame = () => {
    setScreen('results');
  };

  const handleRestart = () => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    const shuffled = prepareSongs();
    if (shuffled) {
      setGameSongs(shuffled);
      setCurrentSongIndex(0);
      if (settings.mode === GameMode.ONLINE && roomId) {
        updateRoomState(roomId, {
          songIds: shuffled.map(s => s.id),
          currentIndex: 0
        });
      }
      setScreen('game');
    }
  };

  const handleHome = () => {
    setScreen('setup');
  };

  // 应用启动时，尝试清理一下没有玩家的旧房间（兜底）
  useEffect(() => {
    cleanupEmptyRooms();
  }, []);

  // 如果 URL 中带有 ?room=XXXX，则显示昵称输入弹窗
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setPendingRoomId(roomFromUrl);
      setShowNameModal(true);
    }
  }, []);

  // 在线模式下，订阅房间文档，自动同步当前题目索引（用于统一切歌）
  useEffect(() => {
    if (settings.mode !== GameMode.ONLINE || !roomId) return;

    const { doc, onSnapshot } = fs;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const unsub = onSnapshot(roomRef, (snap) => {
        const data = snap.data();
        if (!data) return;
        if (typeof data.currentIndex === 'number' && data.currentIndex !== currentSongIndex) {
          setCurrentSongIndex(data.currentIndex);
        }
      });
      return () => unsub();
    } catch (err) {
      console.error('订阅房间播放状态失败:', err);
    }
  }, [settings.mode, roomId, currentSongIndex]);

  // 浏览器关闭 / 刷新时，从房间中移除当前玩家
  useEffect(() => {
    if (settings.mode !== GameMode.ONLINE || !roomId) return;
    const handleBeforeUnload = () => {
      const currentId = window.__currentPlayerId;
      if (currentId) {
        removePlayerFromRoom(roomId, currentId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [settings.mode, roomId]);

  return (
    <div className="w-full h-screen flex justify-center items-center font-sans">
      {/* Mobile Container Simulator */}
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-hidden relative sm:rounded-[2.5rem] sm:h-[92vh] sm:border-8 sm:border-slate-200 ring-1 ring-slate-900/5">
        
        {screen === 'setup' && (
          <SetupScreen 
            settings={settings} 
            setSettings={setSettings} 
            onStart={handleStartGame}
            onJoin={handleJoinGame}
            maxSongs={availableCount}
          />
        )}

        {screen === 'game' && settings.mode === GameMode.LOCAL && (
          <LocalGameScreen
            settings={settings}
            players={players}
            setPlayers={setPlayers}
            currentSong={gameSongs[currentSongIndex]}
            songIndex={currentSongIndex}
            totalSongs={gameSongs.length}
            onNextSong={handleNextSong}
            onEndGame={handleEndGame}
          />
        )}

        {screen === 'game' && settings.mode === GameMode.ONLINE && (
          <OnlineGameScreen
            settings={settings}
            setSettings={setSettings}
            players={players}
            setPlayers={setPlayers}
            currentSong={gameSongs[currentSongIndex]}
            songIndex={currentSongIndex}
            totalSongs={gameSongs.length}
            onNextSong={handleNextSong}
            onEndGame={handleEndGame}
            roomId={roomId}
          />
        )}

        {screen === 'results' && (
          <ResultsScreen 
            players={players}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        )}

      </div>

      {/* 昵称输入弹窗（通过链接进入时） */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl relative">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">加入房间</h2>
              <p className="text-slate-500 mt-1">请输入你的昵称</p>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="例如：玩家1"
              maxLength={12}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJoinWithName(e.target.value);
                }
              }}
              className="w-full bg-slate-100 text-center text-xl font-bold py-3 rounded-2xl mb-4 focus:outline-none focus:ring-4 focus:ring-blue-200 text-slate-800 placeholder-slate-300"
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="例如：玩家1"]');
                handleJoinWithName(input?.value || '');
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              进入房间 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

