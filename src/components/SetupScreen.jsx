import { useState } from 'react';
import { Settings, Users, Music, Clock, Play, Zap, LogIn, X } from 'lucide-react';
import { GameMode, PlaybackPosition, ARTISTS } from '../constants';

const SetupScreen = ({ settings, setSettings, onStart, onJoin, maxSongs }) => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [joinName, setJoinName] = useState('');
  const [showHostModal, setShowHostModal] = useState(false);
  const [hostName, setHostName] = useState('');
  
  const toggleArtist = (id) => {
    setSettings(prev => {
      const exists = prev.selectedArtistIds.includes(id);
      let newSelection = exists 
        ? prev.selectedArtistIds.filter(a => a !== id)
        : [...prev.selectedArtistIds, id];
      
      if (newSelection.length === 0) newSelection = [id]; 
      
      return { ...prev, selectedArtistIds: newSelection };
    });
  };

  const handleJoinSubmit = () => {
    if (roomId.length < 4) {
      alert("请输入有效的房间号");
      return;
    }
    const nameToUse = joinName.trim() || '';
    onJoin(roomId, nameToUse);
    setShowJoinModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-800 relative">
      
      {/* Header */}
      <div className="pt-8 pb-4 px-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            听歌<span className="text-green-500">猜名</span>
          </h1>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-full font-bold text-sm transition-transform active:scale-95 flex items-center gap-1"
          >
             <LogIn size={16} className="text-yellow-600"/> 加入房间
          </button>
        </div>
        <p className="text-slate-400 font-medium text-sm">选择你的游戏模式 ✨</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-6 no-scrollbar">
        
        {/* Mode Selection */}
        <section>
          <div className="flex gap-4">
            <button
              onClick={() => setSettings({ ...settings, mode: GameMode.LOCAL })}
              className={`flex-1 p-4 rounded-3xl transition-all duration-300 border-b-4 active:scale-95 ${
                settings.mode === GameMode.LOCAL 
                  ? 'bg-green-500 text-white border-green-700 shadow-green-200 shadow-xl' 
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${settings.mode === GameMode.LOCAL ? 'bg-white/20' : 'bg-white'}`}>
                   <Users size={24} className={settings.mode === GameMode.LOCAL ? 'text-white' : 'text-slate-400'} />
                </div>
                <span className="font-bold text-lg">本地同玩</span>
              </div>
            </button>
            <button
              onClick={() => setSettings({ ...settings, mode: GameMode.ONLINE })}
              className={`flex-1 p-4 rounded-3xl transition-all duration-300 border-b-4 active:scale-95 ${
                settings.mode === GameMode.ONLINE 
                  ? 'bg-blue-500 text-white border-blue-700 shadow-blue-200 shadow-xl' 
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
               <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${settings.mode === GameMode.ONLINE ? 'bg-white/20' : 'bg-white'}`}>
                   <Zap size={24} className={settings.mode === GameMode.ONLINE ? 'text-white' : 'text-slate-400'} />
                </div>
                <span className="font-bold text-lg">线上联机</span>
              </div>
            </button>
          </div>
        </section>

        {/* Artist Selection */}
        <section className="bg-slate-50 p-5 rounded-[2rem]">
          <h2 className="text-slate-700 font-bold mb-4 flex items-center gap-2 text-lg">
            <Music className="text-pink-500" size={20} /> 谁的歌?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {ARTISTS.map(artist => (
              <div 
                key={artist.id}
                onClick={() => toggleArtist(artist.id)}
                className={`relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                  settings.selectedArtistIds.includes(artist.id)
                    ? 'bg-white border-pink-400 shadow-md scale-[1.02]'
                    : 'bg-white border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={artist.avatar} 
                  alt={artist.name} 
                  onError={(e) => { e.currentTarget.src='img/zjl.png'; }}
                  className="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-200" 
                />
                <span className="font-bold text-slate-700">{artist.name}</span>
                {settings.selectedArtistIds.includes(artist.id) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full border-2 border-white"></div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section className="space-y-4">
           <div className="bg-slate-50 p-5 rounded-[2rem]">
              <h2 className="text-slate-700 font-bold mb-4 flex items-center gap-2 text-lg">
                <Settings className="text-purple-500" size={20} /> 难度设置
              </h2>
              
              <div className="space-y-6">
                <div>
                   <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-slate-500">播放时长</span>
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                        <span className="text-xs font-bold text-slate-400">整首?</span>
                        <div 
                          onClick={() => setSettings({...settings, isFullSong: !settings.isFullSong})}
                          className={`w-8 h-5 rounded-full p-1 cursor-pointer transition-colors ${settings.isFullSong ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                           <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${settings.isFullSong ? 'translate-x-3' : ''}`}></div>
                        </div>
                      </div>
                   </div>
                   {!settings.isFullSong && (
                     <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <input
                          type="range"
                          min="2"
                          max="30"
                          value={settings.durationSeconds}
                          onChange={(e) => setSettings({...settings, durationSeconds: parseInt(e.target.value)})}
                          className="w-full h-3 bg-slate-200 rounded-full appearance-none accent-purple-500"
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-xs font-bold text-slate-400">2s</span>
                          <span className="text-sm font-black text-purple-500">{settings.durationSeconds} 秒</span>
                          <span className="text-xs font-bold text-slate-400">30s</span>
                        </div>
                     </div>
                   )}
                </div>

              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">包含 Live 版本</span>
                  <div 
                    onClick={() => setSettings({...settings, includeLive: !settings.includeLive})}
                    className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.includeLive ? 'bg-green-500' : 'bg-slate-300'}`}
                  >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.includeLive ? 'translate-x-4' : ''}`}></div>
                  </div>
                </div>
              </div>

                <div>
                  <span className="text-sm font-bold text-slate-500 block mb-3">从哪里开始听?</span>
                  <div className="flex bg-slate-200 p-1 rounded-2xl">
                    <button
                      onClick={() => setSettings({...settings, playbackPosition: PlaybackPosition.RANDOM})}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                        settings.playbackPosition === PlaybackPosition.RANDOM 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-500'
                      }`}
                    >
                      🎲 随机片段
                    </button>
                    <button
                      onClick={() => setSettings({...settings, playbackPosition: PlaybackPosition.START})}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                        settings.playbackPosition === PlaybackPosition.START 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-500'
                      }`}
                    >
                      ⏮️ 从头开始
                    </button>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-slate-50 p-5 rounded-[2rem]">
              <h2 className="text-slate-700 font-bold mb-4 flex items-center gap-2 text-lg">
                <Clock className="text-orange-500" size={20} /> 规则
              </h2>
              
              <div className="mb-4">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-500">题目数量</span>
                    <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">{settings.questionCount} 首</span>
                 </div>
                 <input
                    type="range"
                    min="1"
                    max={maxSongs}
                    value={settings.questionCount}
                    onChange={(e) => setSettings({...settings, questionCount: parseInt(e.target.value)})}
                    className="w-full h-3 bg-slate-200 rounded-full appearance-none accent-orange-500"
                 />
              </div>

              <div>
                <span className="text-sm font-bold text-slate-500 block mb-3">答题限时</span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   {[5, 10, 15, 30, 0].map(sec => (
                     <button
                       key={sec}
                       onClick={() => setSettings({...settings, timeLimit: sec})}
                       className={`flex-shrink-0 px-4 py-2 rounded-2xl font-bold text-sm border-2 transition-all ${
                         settings.timeLimit === sec 
                         ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200' 
                         : 'bg-white border-slate-200 text-slate-400'
                       }`}
                     >
                       {sec === 0 ? '♾️ 无限' : `${sec}s`}
                     </button>
                   ))}
                </div>
              </div>
           </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent z-10 max-w-md mx-auto right-0">
        <button 
          onClick={() => {
            if (settings.mode === GameMode.ONLINE) {
              setShowHostModal(true);
            } else {
              onStart();
            }
          }}
          className="w-full bg-slate-900 text-white font-bold py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 text-xl active:scale-95 transition-transform hover:bg-slate-800"
        >
          <Play size={24} fill="currentColor" /> 
          {settings.mode === GameMode.LOCAL ? '开始本地游戏' : '创建房间'}
        </button>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl scale-100 animate-popIn relative">
            <button 
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"
            >
              <X size={20} />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="text-yellow-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">加入游戏</h2>
              <p className="text-slate-500 mt-1">请输入好友分享的房间号</p>
            </div>

            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="例如: 8821"
              maxLength={6}
              className="w-full bg-slate-100 text-center text-3xl font-black tracking-widest py-4 rounded-2xl mb-4 focus:outline-none focus:ring-4 focus:ring-yellow-200 text-slate-800 placeholder-slate-300"
              autoFocus
            />

            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="加入后的昵称（可选）"
              maxLength={12}
              className="w-full bg-slate-100 text-center text-xl font-bold py-3 rounded-2xl mb-4 focus:outline-none focus:ring-4 focus:ring-yellow-200 text-slate-800 placeholder-slate-300"
            />

            <button
              onClick={handleJoinSubmit}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              进入房间 🚀
            </button>
          </div>
        </div>
      )}

      {/* Host Name Modal */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] shadow-2xl scale-100 animate-popIn relative">
            <button 
              onClick={() => setShowHostModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200"
            >
              <X size={20} />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-blue-500" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">创建房间</h2>
              <p className="text-slate-500 mt-1">请输入你在房间中的昵称</p>
            </div>

            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="例如：发发"
              maxLength={12}
              className="w-full bg-slate-100 text-center text-xl font-bold py-3 rounded-2xl mb-4 focus:outline-none focus:ring-4 focus:ring-blue-200 text-slate-800 placeholder-slate-300"
              autoFocus
            />

            <button
              onClick={() => {
                const nameToUse = hostName.trim() || '';
                onStart(nameToUse);
                setShowHostModal(false);
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              创建房间 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupScreen;

