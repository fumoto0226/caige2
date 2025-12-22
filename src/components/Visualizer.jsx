const Visualizer = ({ isPlaying }) => {
  return (
    <div className="flex justify-center items-end h-16 space-x-1 my-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`w-2 bg-green-500 rounded-t-sm transition-all duration-150 ease-in-out ${
            isPlaying ? 'animate-pulse' : 'h-1'
          }`}
          style={{
            height: isPlaying ? `${Math.random() * 100}%` : '4px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
};

export default Visualizer;

