import { NextRequest, NextResponse } from 'next/server';
import { fetchAndProcessLogs } from '@/lib/iciwi'; // Adjust path if needed

export async function GET(request: NextRequest) {
    const serial = request.nextUrl.searchParams.get('serial');

    try {
        const { valid } = await fetchAndProcessLogs(serial);
        return NextResponse.json({ valid: valid ? "true" : "false" });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}