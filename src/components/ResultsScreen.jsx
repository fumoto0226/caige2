import { Trophy, RotateCcw, Home } from 'lucide-react';

const ResultsScreen = ({ players, onRestart, onHome }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto no-scrollbar">
      <div className="bg-green-500 pt-16 pb-20 rounded-b-[3rem] shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
           <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="inline-block p-4 bg-white/20 rounded-full backdrop-blur-sm mb-4">
             <Trophy size={64} className="text-yellow-300 animate-bounce" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">游戏结束!</h1>
          <p className="text-green-100 font-bold mt-1">最终排行榜</p>
        </div>
      </div>

      <div className="flex-1 px-6 -mt-12 relative z-20 pb-10">
        <div className="space-y-4">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`flex items-center p-4 rounded-3xl shadow-sm border-2 transition-transform hover:scale-105 ${
                index === 0 
                ? 'bg-white border-yellow-400 shadow-yellow-100' 
                : 'bg-white border-slate-100'
              }`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-lg mr-4 ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                index === 1 ? 'bg-slate-300 text-slate-600' : 
                index === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-400'
              }`}>
                {index + 1}
              </div>
              
              {player.avatar && /^https?:/.test(player.avatar) ? (
                <img 
                  src={player.avatar} 
                  alt={player.name} 
                  className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-slate-100" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full mr-3 border-2 border-slate-100 bg-slate-100 flex items-center justify-center text-2xl">
                  {player.avatar || '👤'}
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-800">{player.name}</h3>
                {index === 0 && <span className="inline-block bg-yellow-100 text-yellow-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">MVP</span>}
              </div>
              
              <div className="text-2xl font-black text-slate-800">
                {player.score} <span className="text-xs font-bold text-slate-400">pts</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-4">
          <button 
            onClick={onRestart}
            className="w-full py-5 bg-green-500 text-white font-black rounded-3xl shadow-xl shadow-green-200 active:scale-95 transition flex justify-center items-center gap-2 text-lg"
          >
             <RotateCcw strokeWidth={3} /> 再玩一次
          </button>
          <button 
            onClick={onHome}
            className="w-full py-5 bg-white text-slate-400 font-bold rounded-3xl border-2 border-slate-100 hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition flex justify-center items-center gap-2"
          >
            <Home strokeWidth={3} /> 返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;

