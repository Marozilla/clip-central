import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { callWorker } from "@/lib/clients";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    const result = await callWorker("/update-clip", { clipId: id });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 },
    );
  }
}
