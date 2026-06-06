import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return NextResponse.json(
    {
      url: origin,
      name: "TON AI Swap Advisor",
      iconUrl: "https://ton.org/download/ton_symbol.png",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
