import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = {
  safe: "#1D9E75",
  warn: "#BA7517",
  danger: "#E24B4A",
  blue: "#378ADD",
  purple: "#7F77DD",
  teal: "#1D9E75",
};

function useSensorData(trainActive) {
  const [data, setData] = useState({
    lidar: 80,
    hcsr: 1.8,
    eta: null,
    speed: null,
    gatePct: 0,
    mlTrain: 4,
    mlVeh: 7,
    mlPed: 12,
    mlClear: 77,
    lidarHistory: Array.from({ length: 30 }, () => 78 + Math.random() * 4),
    zoneRail: "clear",
    zoneRoad: "clear",
    uptime: 0,
    rpiCpu: 22,
    status: "safe",
  });

  const tickRef = useRef(0);
  const trainActiveRef = useRef(trainActive);
  trainActiveRef.current = trainActive;

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const t = tickRef.current;
      const active = trainActiveRef.current;

      setData((prev) => {
        const lidar = active
          ? Math.max(2, 80 - t * 0.8)
          : 78 + Math.sin(t * 0.1) * 3 + Math.random() * 2;

        const speed = active ? 40 + Math.random() * 5 : null;
        const eta = active ? Math.max(0, lidar / ((speed || 40) / 3.6)) : null;

        const mlTrain = active
          ? Math.min(97, 4 + (80 - lidar) * 1.2)
          : 4 + Math.random() * 3;
        const mlClear = Math.max(3, 100 - mlTrain - 10 - 7);

        const gatePct = Math.min(
          1,
          Math.max(0, prev.gatePct + (active ? 0.1 : -0.1))
        );

        const status =
          active && lidar < 20 ? "danger" : active ? "warn" : "safe";

        return {
          ...prev,
          lidar,
          hcsr: 1.5 + Math.random() * 0.4,
          eta,
          speed,
          gatePct,
          mlTrain: Math.round(mlTrain),
          mlVeh: 7 + Math.round(Math.random() * 2),
          mlPed: 12 + Math.round(Math.random() * 3),
          mlClear: Math.round(mlClear),
          lidarHistory: [...prev.lidarHistory.slice(-29), lidar],
          zoneRail: active ? "train" : "clear",
          zoneRoad: "clear",
          uptime: prev.uptime + 1,
          rpiCpu: Math.round(18 + Math.random() * 8),
          status,
        };
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return data;
}

function MiniChart({ data, color = COLORS.blue }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const mn = 0,
      mx = 100;
    const pts = data.slice(-28);
    const sx = (i) => i * (w / (pts.length - 1));
    const sy = (v) => h - 6 - ((v - mn) / (mx - mn)) * (h - 12);

    // grid
    ctx.strokeStyle = "rgba(128,128,128,0.1)";
    ctx.lineWidth = 0.5;
    [0, 25, 50, 75, 100].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(0, sy(v));
      ctx.lineTo(w, sy(v));
      ctx.stroke();
    });

    // fill
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(pts[0]));
    pts.forEach((v, i) => ctx.lineTo(sx(i), sy(v)));
    ctx.lineTo(sx(pts.length - 1), h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = color + "20";
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(pts[0]));
    pts.forEach((v, i) => ctx.lineTo(sx(i), sy(v)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "80px", display: "block" }}
    />
  );
}

function GateDiagram({ gatePct, trainActive, lidar }) {
  const openY = 72,
    closedY = 52;
  const armY = openY - (openY - closedY) * gatePct;
  const trainX = trainActive ? Math.max(-60, 20 - (80 - lidar) * 1.5) : -60;
  const gateLabel =
    gatePct < 0.1 ? "Gate: open" : gatePct > 0.9 ? "Gate: closed" : "Gate: moving…";

  return (
    <svg viewBox="0 0 280 130" style={{ width: "100%", display: "block" }}>
      {/* Track */}
      <line
        x1="0" y1="95" x2="280" y2="95"
        stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="8 4"
      />
      {/* Rail ties */}
      {[20, 50, 80, 170, 200, 230, 260].map((x) => (
        <rect key={x} x={x} y="92" width="6" height="6" rx="1" fill="currentColor" opacity="0.15" />
      ))}
      {/* Road */}
      <rect x="105" y="55" width="70" height="75" rx="3"
        fill="rgba(100,100,100,0.08)" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.5"
      />
      <line x1="140" y1="55" x2="140" y2="130" stroke="white" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="6 4" />
      <text x="140" y="74" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4">ROAD</text>

      {/* Gate posts */}
      <rect x="103" y="58" width="5" height="38" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="172" y="58" width="5" height="38" rx="2" fill="currentColor" opacity="0.4" />

      {/* Gate arms */}
      <line x1="105" y1={armY} x2="55" y2={armY}
        stroke={COLORS.danger} strokeWidth="5" strokeLinecap="round"
        style={{ transition: "y1 0.3s, y2 0.3s" }}
      />
      <line x1="177" y1={armY} x2="230" y2={armY}
        stroke={COLORS.danger} strokeWidth="5" strokeLinecap="round"
      />
      {/* Arm stripes */}
      {gatePct > 0.5 &&
        [60, 70, 80, 90].map((x) => (
          <line key={x} x1={x} y1={armY - 2} x2={x + 5} y2={armY + 2}
            stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        ))}

      {/* Train sprite */}
      {trainActive && trainX > -55 && (
        <g style={{ transition: "transform 0.8s" }}>
          <rect x={trainX} y="80" width="52" height="20" rx="3" fill={COLORS.blue} opacity="0.9" />
          <rect x={trainX + 2} y="82" width="10" height="10" rx="1" fill="white" opacity="0.3" />
          <rect x={trainX + 14} y="82" width="10" height="10" rx="1" fill="white" opacity="0.3" />
          <circle cx={trainX + 10} cy="102" r="4" fill="#555" />
          <circle cx={trainX + 40} cy="102" r="4" fill="#555" />
          <text x={trainX + 26} y="93" textAnchor="middle" fontSize="7" fill="white" fontWeight="500">TRAIN</text>
        </g>
      )}

      {/* Gate label */}
      <text x="140" y="120" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">
        {gateLabel}
      </text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    safe: { bg: "#E1F5EE", color: "#0F6E56", label: "Safe" },
    warn: { bg: "#FAEEDA", color: "#854F0B", label: "Warning" },
    danger: { bg: "#FCEBEB", color: "#A32D2D", label: "Danger" },
  };
  const s = map[status];
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 500,
      padding: "4px 12px", borderRadius: 999,
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block",
        animation: status !== "safe" ? "pulse 1s ease-in-out infinite" : "none",
      }} />
      {s.label}
    </span>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--card-bg)", border: "0.5px solid var(--border)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MLBar({ label, pct, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 }}>
      <span style={{ width: 120, color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, background: color,
          width: pct + "%", transition: "width 0.5s",
        }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function ZoneBox({ label, value, status }) {
  const statusStyles = {
    clear: { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
    train: { bg: "#FCEBEB", color: "#A32D2D" },
    vehicle: { bg: "#FAEEDA", color: "#854F0B" },
  };
  const s = statusStyles[status] || statusStyles.clear;
  return (
    <div style={{
      flex: 1, borderRadius: 8, padding: "10px 12px",
      border: "0.5px solid var(--border)", background: s.bg,
      transition: "background 0.5s",
    }}>
      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: s.color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function HealthRow({ icon, label, ok }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ width: 60, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: "var(--bg-secondary)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: ok ? "100%" : "30%", background: ok ? COLORS.safe : COLORS.danger, borderRadius: 2 }} />
      </div>
      <span style={{ color: ok ? COLORS.safe : COLORS.danger }}>{ok ? "OK" : "ERR"}</span>
    </div>
  );
}

function EventLog({ entries }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 130, overflowY: "auto" }}>
      {entries.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "flex-start" }}>
          <span style={{ color: "var(--text-tertiary)", whiteSpace: "nowrap", minWidth: 64 }}>{e.t}</span>
          <span style={{ fontSize: 14 }}>{e.icon}</span>
          <span style={{ color: "var(--text-secondary)" }}>{e.txt}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [trainActive, setTrainActive] = useState(false);
  const [log, setLog] = useState([
    { t: "00:00:00", icon: "✅", txt: "System initialised — all sensors nominal" },
    { t: "00:00:01", icon: "📡", txt: "ESP32 connected to Raspberry Pi via UART" },
  ]);
  const tickRef = useRef(0);
  const data = useSensorData(trainActive);

  const addLog = useCallback((icon, txt) => {
    const d = new Date();
    const t = [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
    setLog((prev) => [{ t, icon, txt }, ...prev].slice(0, 20));
  }, []);

  const prevTrainRef = useRef(trainActive);
  useEffect(() => {
    if (trainActive !== prevTrainRef.current) {
      if (trainActive) addLog("🚆", "Train detected on approach — closing gates");
      else addLog("✅", "Train cleared — opening gates, road unblocked");
      prevTrainRef.current = trainActive;
    }
  }, [trainActive, addLog]);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      if (!trainActive && tickRef.current % 30 === 0)
        addLog("📊", "Sensor heartbeat — all nominal");
      if (trainActive && tickRef.current % 18 === 0)
        addLog("⚠️", "Gate barrier closed — road blocked");
      if (data.lidar < 20 && trainActive && tickRef.current % 10 === 0)
        addLog("🔴", "CRITICAL: Train within 20m of crossing");
    }, 800);
    return () => clearInterval(interval);
  }, [trainActive, data.lidar, addLog]);

  const etaDisplay = data.eta !== null
    ? data.eta < 5 ? "<5s" : `${Math.round(data.eta)}s`
    : "—";
  const speedDisplay = data.speed ? `Train speed ${data.speed.toFixed(0)} km/h` : "No train detected";

  return (
    <>
      <style>{`
        :root {
          --card-bg: #ffffff;
          --bg-secondary: rgba(0,0,0,0.05);
          --border: rgba(0,0,0,0.12);
          --text-primary: #1a1a1a;
          --text-secondary: #666;
          --text-tertiary: #999;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --card-bg: rgba(255,255,255,0.05);
            --bg-secondary: rgba(255,255,255,0.08);
            --border: rgba(255,255,255,0.12);
            --text-primary: #f0f0f0;
            --text-secondary: #aaa;
            --text-tertiary: #666;
          }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg-secondary); }
      `}</style>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, minHeight: "100vh" }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: 12, borderBottom: "0.5px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🚦</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                Smart railway crossing
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                ESP32 + TF-Luna + HC-SR04 + Raspberry Pi
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={data.status} />
            <button
              onClick={() => setTrainActive((v) => !v)}
              style={{
                fontSize: 12, border: `0.5px solid ${trainActive ? COLORS.danger : "var(--border)"}`,
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                background: trainActive ? "#FCEBEB" : "transparent",
                color: trainActive ? COLORS.danger : "var(--text-secondary)",
                fontWeight: 500, transition: "all 0.2s",
              }}
            >
              {trainActive ? "Stop simulation" : "Simulate train ↗"}
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <MetricCard
            label="TF-Luna distance"
            value={`${data.lidar.toFixed(1)}m`}
            sub="Rail approach zone"
            color={data.lidar < 20 ? COLORS.danger : data.lidar < 40 ? COLORS.warn : COLORS.safe}
          />
          <MetricCard
            label="HC-SR04 detection"
            value={`${data.hcsr.toFixed(2)}m`}
            sub="Road crossing zone"
          />
          <MetricCard
            label="ETA to crossing"
            value={etaDisplay}
            sub={speedDisplay}
            color={data.eta !== null && data.eta < 10 ? COLORS.danger : undefined}
          />
        </div>

        {/* Chart + Gate */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            background: "var(--card-bg)", border: "0.5px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
              TF-Luna distance trend (m)
            </div>
            <MiniChart
              data={data.lidarHistory}
              color={data.status === "danger" ? COLORS.danger : data.status === "warn" ? COLORS.warn : COLORS.blue}
            />
          </div>
          <div style={{
            background: "var(--card-bg)", border: "0.5px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
              Gate & crossing diagram
            </div>
            <GateDiagram gatePct={data.gatePct} trainActive={trainActive} lidar={data.lidar} />
          </div>
        </div>

        {/* ML + Zones/Health */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            background: "var(--card-bg)", border: "0.5px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 12 }}>
              ML inference — TFLite on RPi
            </div>
            <MLBar label="Train approaching" pct={data.mlTrain} color={COLORS.danger} />
            <MLBar label="Vehicle on track" pct={data.mlVeh} color={COLORS.warn} />
            <MLBar label="Pedestrian" pct={data.mlPed} color={COLORS.teal} />
            <MLBar label="Clear" pct={data.mlClear} color={COLORS.blue} />
          </div>
          <div style={{
            background: "var(--card-bg)", border: "0.5px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 10 }}>
              Zone occupancy & system health
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <ZoneBox label="Rail approach" value={data.zoneRail === "train" ? "Train detected" : "Clear"} status={data.zoneRail} />
              <ZoneBox label="Road crossing" value="Clear" status="clear" />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <ZoneBox label="ESP32 uptime" value={`${data.uptime}s`} status="clear" />
              <ZoneBox label="RPi CPU" value={`${data.rpiCpu}%`} status="clear" />
            </div>
            <HealthRow icon="⚡" label="ESP32" ok={true} />
            <HealthRow icon="📡" label="TF-Luna" ok={true} />
            <HealthRow icon="🔊" label="HC-SR04" ok={true} />
          </div>
        </div>

        {/* Event log */}
        <div style={{
          background: "var(--card-bg)", border: "0.5px solid var(--border)",
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 10 }}>
            Event log
          </div>
          <EventLog entries={log} />
        </div>

      </div>
    </>
  );
}
