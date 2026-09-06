import React, { useState, useEffect } from 'react';
import { Coffee, Play, Info } from 'lucide-react';

interface LenientProctorProps {
  onPauseRequested?: () => void;
  onResumeRequested?: () => void;
}

export const LenientProctor: React.FC<LenientProctorProps> = ({
  onPauseRequested,
  onResumeRequested,
}) => {
  const [showNudge, setShowNudge] = useState<boolean>(false);
  const [attentivenessSec, setAttentivenessSec] = useState<number>(0);

  // Simulation of lenient lecture attentiveness
  useEffect(() => {
    const timer = setInterval(() => {
      // In lecture mode, if user is idle/away for a long duration, show gentle reminder
      setAttentivenessSec((prev) => {
        if (prev === 45) {
          // After 45 seconds of continuous playback, simulate a gentle attentiveness reminder
          setShowNudge(true);
          if (onPauseRequested) onPauseRequested();
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onPauseRequested]);

  const handleDismiss = () => {
    setShowNudge(false);
    setAttentivenessSec(0);
    if (onResumeRequested) onResumeRequested();
  };

  return (
    <>
      {/* Friendly Non-Punitive Lecture Attentiveness Nudge Modal */}
      {showNudge && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Coffee className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              Still with us? Taking a quick pause!
            </h3>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              We noticed sustained inactivity during this lecture. Taking notes is great, but we paused the video to make sure you don't miss core meteorological concepts!
            </p>

            <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400 mb-6 flex items-start gap-2 border border-slate-700/60">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Lenient Lecture Mode Policy:</strong> No integrity points deducted or violations logged. This is purely an assistive nudge.
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/30"
            >
              <Play className="w-4 h-4" />
              <span>Resume Lecture Playback</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
