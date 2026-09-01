import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBRTC_URL =
  "https://serverless.roboflow.com/initialise_webrtc_worker";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ROBOFLOW_API_KEY não configurada na Vercel." },
        { status: 500 }
      );
    }

    const payload = await request.json();

    const upstream = await fetch(WEBRTC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseBody = await upstream.text();

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Falha no proxy WebRTC:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha inesperada no proxy WebRTC.",
      },
      { status: 500 }
    );
  }
}
