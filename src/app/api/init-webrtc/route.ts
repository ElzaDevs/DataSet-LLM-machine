import { InferenceHTTPClient } from "@roboflow/inference-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ROBOFLOW_API_KEY não configurada na Vercel." },
        { status: 500 }
      );
    }

    const { offer, wrtcParams } = await request.json();

    if (!offer?.sdp || !offer?.type) {
      return NextResponse.json(
        { error: "Oferta WebRTC inválida ou ausente." },
        { status: 400 }
      );
    }

    if (!wrtcParams?.workspaceName || !wrtcParams?.workflowId) {
      return NextResponse.json(
        { error: "Configuração do Workflow inválida ou ausente." },
        { status: 400 }
      );
    }

    const client = InferenceHTTPClient.init({
      apiKey,
      serverUrl: "https://serverless.roboflow.com",
    });

    const answer = await client.initializeWebrtcWorker({
      offer,
      workspaceName: wrtcParams.workspaceName,
      workflowId: wrtcParams.workflowId,
      config: {
        imageInputName: wrtcParams.imageInputName ?? "image",
        streamOutputNames:
          wrtcParams.streamOutputNames ?? ["output_image"],
        dataOutputNames:
          wrtcParams.dataOutputNames ?? [
            "predictions",
            "tracked_predictions",
            "object_count",
          ],
        threadPoolWorkers: wrtcParams.threadPoolWorkers ?? 4,
        workflowsParameters: wrtcParams.workflowsParameters ?? {},
        iceServers: wrtcParams.iceServers,
        processingTimeout: wrtcParams.processingTimeout ?? 3600,
        requestedPlan:
          wrtcParams.requestedPlan ?? "webrtc-gpu-medium",
        requestedRegion: wrtcParams.requestedRegion ?? "us",
        realtimeProcessing: wrtcParams.realtimeProcessing ?? true,
      },
    });

    return NextResponse.json(answer, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Falha ao inicializar WebRTC:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Falha inesperada ao iniciar WebRTC.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
