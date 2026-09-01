import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROBOFLOW_WEBRTC_URL =
  "https://serverless.roboflow.com/initialise_webrtc_worker";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ROBOFLOW_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { offer, wrtcparams } = body;

    if (!offer?.sdp || !offer?.type || !wrtcparams) {
      return NextResponse.json(
        { error: "Oferta WebRTC ou configuração inválida." },
        { status: 400 }
      );
    }

    const upstreamResponse = await fetch(ROBOFLOW_WEBRTC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        webrtc_offer: {
          sdp: offer.sdp,
          type: offer.type,
        },
        workflow_configuration: {
          type: "WorkflowConfiguration",
          workspace_name: wrtcparams.workspaceName,
          workflow_id: wrtcparams.workflowId,
          image_input_name: wrtcparams.imageInputName ?? "image",
          workflows_parameters: wrtcparams.workflowParameters ?? {},
          disable_sinks: false,
          workflows_thread_pool_workers: 4,
          cancel_thread_pool_tasks_on_exit: true,
          video_metadata_input_name: "video_metadata",
        },
        is_preview: false,
        webrtc_realtime_processing: true,
        stream_output: wrtcparams.streamOutputNames ?? ["output_image"],
        data_output: wrtcparams.dataOutputNames ?? [
          "predictions",
          "tracked_predictions",
          "object_count"
        ],
        processing_timeout: wrtcparams.processingTimeout ?? 3600,
        requested_plan: wrtcparams.requestedPlan ?? "webrtc-gpu-medium",
        requested_region: wrtcparams.requestedRegion ?? "us",
      }),
    });

    const responseText = await upstreamResponse.text();

    let responseBody: unknown;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = {
        error: "Resposta inválida recebida do serviço de inferência.",
      };
    }

    if (!upstreamResponse.ok) {
      console.error("Erro WebRTC da Roboflow:", responseBody);

      return NextResponse.json(
        responseBody,
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Erro ao iniciar WebRTC:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o processamento.",
      },
      { status: 500 }
    );
  }
}
