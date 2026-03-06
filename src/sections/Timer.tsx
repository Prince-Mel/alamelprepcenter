import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface TimerProps {
  duration: number; // in minutes
  onTimeUp: () => void;
}

export function Timer({ duration, onTimeUp }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(Math.floor(duration * 60)); // convert to seconds
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1 && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setIsRunning(false);
            toast.error('Time is up!');
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onTimeUp]);

  // Warning notifications
  useEffect(() => {
    if (timeLeft === 300) { // 5 minutes left
      toast.warning('5 minutes remaining!');
    } else if (timeLeft === 60) { // 1 minute left
      toast.warning('1 minute remaining! Hurry up!');
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress and color
  const totalSeconds = duration * 60;
  const progress = (timeLeft / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  let strokeColor = '#00b050'; // Green
  let textColor = 'text-green-600';
  if (progress <= 25) {
    strokeColor = '#ff0000'; // Red
    textColor = 'text-red-600';
  } else if (progress <= 50) {
    strokeColor = '#ffc000'; // Orange
    textColor = 'text-yellow-600';
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="4"
          />
          {/* Progress Circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={strokeColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="timer-ring"
            style={{
              filter: progress <= 10 ? 'drop-shadow(0 0 4px rgba(255, 0, 0, 0.5))' : 'none',
            }}
          />
        </svg>
        {/* Time Display */}
        <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}>
          {formatTime(timeLeft)}
        </div>
      </div>
      
      {/* Timer Label */}
      <div className="hidden sm:block">
        <p className="text-xs text-alamel-darkGray uppercase tracking-wide">Time Remaining</p>
        <p className={`text-lg font-bold ${textColor}`}>
          {formatTime(timeLeft)}
        </p>
      </div>
    </div>
  );
}
