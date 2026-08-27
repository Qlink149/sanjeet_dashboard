import { Play, Pause } from "lucide-react";
import { useRef, useState } from "react";

const AudioPlayer = ({ url }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);

      audio.onended = () => setPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlay}
        className="p-2 rounded-full bg-primary text-white hover:bg-primary/80 transition"
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={url} preload="none" />
    </div>
  );
};
