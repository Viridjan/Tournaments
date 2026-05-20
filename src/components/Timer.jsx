// Timer — countdown with start/pause/reset, plays 6-tone audio alarm at zero
function Timer({ minutes }) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null),
    audioRef = useRef(null),
    endTimeRef = useRef(null),
    wakeLockRef = useRef(null);
  const alarm = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioRef.current;
      [880, 660, 880, 660, 880, 1100].forEach((f, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = f;
        const t = ctx.currentTime + i * 0.38;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.45, t + 0.05);
        g.gain.linearRampToValueAtTime(0, t + 0.33);
        o.start(t);
        o.stop(t + 0.38);
      });
    } catch {}
  }, []);
  const acquireWakeLock = useCallback(async () => {
    try {
      if (navigator.wakeLock) wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {}
  }, []);
  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);
  useEffect(() => {
    if (running && left > 0) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + left * 1000;
        acquireWakeLock();
      }
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          endTimeRef.current = null;
          releaseWakeLock();
          setRunning(false);
          setLeft(0);
          alarm();
        } else {
          setLeft(remaining);
        }
      }, 500);
    } else {
      endTimeRef.current = null;
      releaseWakeLock();
    }
    return () => clearInterval(intervalRef.current);
  }, [running, alarm, acquireWakeLock, releaseWakeLock]);
  useEffect(() => {
    const onVisible = () => {
      if (!running || !endTimeRef.current) return;
      if (!wakeLockRef.current) acquireWakeLock();
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        endTimeRef.current = null;
        releaseWakeLock();
        setRunning(false);
        alarm();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, alarm, acquireWakeLock, releaseWakeLock]);
  const urgent = left <= 60,
    m = Math.floor(left / 60),
    sec = left % 60;
  return (
    <div
      style={{
        background: C.subtle,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 3,
          minWidth: 100,
          color: urgent ? C.heart : C.text,
        }}
      >
        {String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 80,
          height: 6,
          background: "#ddd",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            background: urgent ? C.heart : C.accent,
            width: `${(left / total) * 100}%`,
            transition: "width 0.9s linear",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn
          onClick={() => {
            try {
              audioRef.current?.resume();
            } catch {}
            setRunning(!running);
          }}
          style={{ minWidth: 64 }}
        >
          {running ? "Pause" : "Start"}
        </Btn>
        <Btn
          onClick={() => {
            setRunning(false);
            setLeft(total);
          }}
        >
          ↺
        </Btn>
      </div>
    </div>
  );
}
