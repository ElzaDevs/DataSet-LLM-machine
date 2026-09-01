# Visão Universal

Aplicação Web/PWA para identificar pessoas, animais, veículos e objetos em
tempo real usando Roboflow Workflows e WebRTC.

## Tecnologias

- Next.js
- TypeScript
- Roboflow Inference SDK
- Roboflow Serverless Cloud
- WebRTC
- PWA
- Vercel

## Desenvolvimento

Crie o arquivo `.env.local`:

```env
ROBOFLOW_API_KEY=YOUR_ROBOFLOW_API_KEY
mkdir -p src/app/api/init-webrtc public

cat > src/app/api/init-webrtc/route.ts <<'EOF'
import { InferenceHTTPClient } from "@roboflow/inference-sdk/api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ROBOFLOW_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const { offer, wrtcparams } = await request.json();

    if (!offer || !wrtcparams) {
      return NextResponse.json(
        { error: "Oferta WebRTC ou configuração ausente." },
        { status: 400 }
      );
    }

    const client = InferenceHTTPClient.init({ apiKey });

    const answer = await client.initializeWebrtcWorker({
      offer,
      workspaceName: wrtcparams.workspaceName,
      workflowId: wrtcparams.workflowId,
      config: {
        imageInputName: wrtcparams.imageInputName,
        streamOutputNames: wrtcparams.streamOutputNames,
        dataOutputNames: wrtcparams.dataOutputNames,
        requestedPlan: wrtcparams.requestedPlan,
        requestedRegion: wrtcparams.requestedRegion,
        processingTimeout: wrtcparams.processingTimeout,
      },
    });

    return NextResponse.json(answer);
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
