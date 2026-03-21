import { NextResponse } from 'next/server';

export async function GET() {
    const targetUrl = 'https://bluemap.limaru.net/iciwi.log';

    try {
        const response = await fetch(targetUrl, {
            cache: 'no-store' // Always get fresh logs
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: response.status });
        }

        const data = await response.text();

        // Add commas between objects
        const commaSeparated = data.replace(/\}\s*\{/g, '},\n{');

        // Wrap in brackets to create a valid JSON array
        const validJsonString = `[\n${commaSeparated}\n]`;

        // Parse it so Next.js sends it as proper JSON
        const jsonData = JSON.parse(validJsonString);

        return NextResponse.json(jsonData, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}