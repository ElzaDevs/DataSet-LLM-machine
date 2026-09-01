"use client";

import { useEffect, useRef, useState } from "react";
import { connectors, streams, webrtc } from "@roboflow/inference-sdk";

const WORKSPACE = "elza-vitoria-aquino";
const WORKFLOW =
  "my-first-project-vmy-first-project-bqnk2-1-yolo11n-t2-logic";

type Status = "idle" | "connecting" | "live" | "error";

type Detection = {
  class?: string;
  class_name?: string;
  confidence?: number;
  tracker_id?: number;
};

function extractDetections(payload: unknown): Detection[] {
  if (!payload || typeof payload !== "object") return [];

  const value = payload as Record<string, unknown>;

  if (Array.isArray(value.predictions)) {
    return value.predictions as Detection[];
  }

  if (
    value.predictions &&
    typeof value.predictions === "object" &&
    Array.isArray((value.predictions as Record<string, unknown>).predictions)
  ) {
    return (value.predictions as { predictions: Detection[] }).predictions;
  }

  return [];
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<any>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [count, setCount] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [message, setMessage] = useState(
    "Pronto para identificar pessoas, animais e objetos."
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    return () => {
      connectionRef.current?.cleanup?.();
    };
  }, []);

  async function startCamera() {
    setStatus("connecting");
    setMessage("Solicitando a câmera e conectando à nuvem…");

    try {
      const connector = connectors.withProxyUrl("/api/init-webrtc");

      const source = await streams.useCamera({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const connection = await webrtc.useStream({
        source,
        connector,
        wrtcParams: {
          workspaceName: WORKSPACE,
          workflowId: WORKFLOW,
          imageInputName: "image",
          streamOutputNames: ["output_image"],
          dataOutputNames: [
            "predictions",
            "tracked_predictions",
            "object_count",
          ],
          processingTimeout: 3600,
          requestedPlan: "webrtc-gpu-medium",
          requestedRegion: "us",
        },
        onData: (data) => {
          const payload = data as unknown as Record<string, unknown>;
          const rawCount = payload.object_count;
          const predictions = extractDetections(payload.predictions);
          const tracked = extractDetections(payload.tracked_predictions);
          const visible = tracked.length > 0 ? tracked : predictions;

          setDetections(visible);

          if (typeof rawCount === "number") {
            setCount(rawCount);
          } else {
            setCount(visible.length);
          }
        },
      });

      connectionRef.current = connection;

      if (videoRef.current) {
        videoRef.current.srcObject = await connection.remoteStream();
        await videoRef.current.play();
      }

      setStatus("live");
      setMessage("Identificação em tempo real ativa.");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a câmera."
      );
    }
  }

  async function stopCamera() {
    await connectionRef.current?.cleanup?.();
    connectionRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
    setCount(0);
    setDetections([]);
    setMessage("Câmera encerrada.");
  }

  const grouped = detections.reduce<Record<string, number>>(
    (result, detection) => {
      const name =
        detection.class ?? detection.class_name ?? "objeto";
      result[name] = (result[name] ?? 0) + 1;
      return result;
    },
    {}
  );

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <span className="eyebrow">VISÃO UNIVERSAL</span>
          <h1>Identificação inteligente em qualquer dispositivo</h1>
          <p>
            Reconheça pessoas, animais, veículos e objetos usando a câmera do
            celular, tablet ou computador.
          </p>
        </div>

        <div className={`status status-${status}`}>
          <span className="status-dot" />
          {status === "live"
            ? "Ao vivo"
            : status === "connecting"
              ? "Conectando"
              : status === "error"
                ? "Erro"
                : "Desconectado"}
        </div>
      </header>

      <section className="dashboard">
        <div className="camera-card">
          <div className="video-frame">
            <video ref={videoRef} autoPlay playsInline muted />

            {status !== "live" && (
              <div className="video-placeholder">
                <div className="camera-icon">◉</div>
                <strong>Câmera pronta</strong>
                <span>Toque em iniciar para permitir o acesso</span>
              </div>
            )}

            {status === "live" && (
              <div className="live-badge">
                <span />
                LIVE
              </div>
            )}
          </div>

          <div className="controls">
            {status === "live" ? (
              <button className="button button-stop" onClick={stopCamera}>
                Encerrar câmera
              </button>
            ) : (
              <button
                className="button button-start"
                onClick={startCamera}
                disabled={status === "connecting"}
              >
                {status === "connecting"
                  ? "Conectando…"
                  : "Iniciar identificação"}
              </button>
            )}

            <p>{message}</p>
          </div>
        </div>

        <aside className="results">
          <div className="metric-card">
            <span>Objetos visíveis</span>
            <strong>{count}</strong>
            <small>Atualização em tempo real</small>
          </div>

          <div className="objects-card">
            <div className="section-title">
              <h2>Identificados</h2>
              <span>{detections.length}</span>
            </div>

            <div className="object-list">
              {Object.entries(grouped).length === 0 ? (
                <div className="empty">
                  Os objetos identificados aparecerão aqui.
                </div>
              ) : (
                Object.entries(grouped).map(([name, total]) => (
                  <div className="object-row" key={name}>
                    <div>
                      <span className="object-indicator" />
                      <strong>{name}</strong>
                    </div>
                    <span className="object-total">{total}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="privacy-card">
            <strong>Processamento seguro</strong>
            <p>
              A chave de acesso permanece protegida no servidor. Nenhuma
              credencial é incluída no navegador.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
