// RAG App — https://github.com/ramoncalvo

import { useEffect, useRef, useState } from "react";

const API = "http://127.0.0.1:5555/api";

interface Segment {
  text: string;
  start_ts: string;
  end_ts: string;
}

interface Props {
  fileId: string;
  title: string;
  segments: Segment[];
  startTime?: number; // seconds to seek to on mount
}

function tsToSeconds(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  return parseInt(ts) || 0;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ fileId, title, segments, startTime }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegment, setActiveSegment] = useState(-1);

  const videoUrl = `${API}/files/${fileId}/raw`;

  useEffect(() => {
    if (startTime && videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
  }, [startTime, fileId]);

  useEffect(() => {
    // Find active segment based on current time
    const idx = segments.findIndex((seg, i) => {
      const start = tsToSeconds(seg.start_ts);
      const nextStart = i < segments.length - 1 ? tsToSeconds(segments[i + 1].start_ts) : Infinity;
      return currentTime >= start && currentTime < nextStart;
    });
    if (idx !== activeSegment) {
      setActiveSegment(idx);
      // Auto-scroll transcript
      if (idx >= 0 && transcriptRef.current) {
        const el = transcriptRef.current.children[idx] as HTMLElement;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, segments]);

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Video player */}
      <div className="shrink-0 p-4" style={{ background: "var(--bg-secondary)" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full max-h-[400px] rounded-lg"
          style={{ background: "#000" }}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        />
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{title}</span>
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Transcript with synced highlighting */}
      <div className="flex-1 overflow-y-auto p-4" ref={transcriptRef}>
        <div className="max-w-3xl mx-auto space-y-1">
          {segments.map((seg, i) => {
            const isActive = i === activeSegment;
            const startSec = tsToSeconds(seg.start_ts);

            return (
              <div
                key={i}
                onClick={() => seekTo(startSec)}
                className="flex gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition"
                style={{
                  background: isActive ? "var(--accent-subtle)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                }}
              >
                <button
                  className="text-[11px] font-mono px-2 py-0.5 rounded shrink-0 mt-0.5 transition"
                  style={{
                    background: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                    color: isActive ? "var(--accent-text)" : "var(--accent)",
                  }}
                >
                  {seg.start_ts}
                </button>
                <p
                  className="text-sm leading-relaxed transition"
                  style={{ color: isActive ? "var(--text)" : "var(--text-secondary)" }}
                >
                  {seg.text}
                </p>
              </div>
            );
          })}

          {segments.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              Sin transcript disponible
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
