import { NextRequest, NextResponse } from 'next/server';
import { fetchAndProcessLogs, formatUTC8, getStationType } from '@/lib/iciwi';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    try {
        const { valid, logs, details } = await fetchAndProcessLogs(serial);

        const transitLogs = logs.filter((log: any) =>
            ['card-entry', 'card-exit', 'payment'].includes(log.message)
        );

        let history: any[][] = [];
        let currentJourney: any[] = [];
        let pendingEntry: any = null;

        for (const log of transitLogs) {
            const msg = log.message;
            const stationName = log.data?.nStation || log.data?.xStation || log.data?.station || "";
            const type = getStationType(stationName);

            if (type === "error" || type === "store/education") continue;

            let eventObj: any = {
                status: msg === 'payment' ? 'entry-pay' : (msg === 'card-entry' ? 'entry' : 'exit'),
                station: stationName,
                datetime: formatUTC8(log.timestamp),
                type: type,
                balance: parseFloat(log.data?.value || log.data?.old || 0).toFixed(2),
            };

            // Fix for empty passes: only add if there is actual data
            if (log.data?.railPass) {
                const activePasses = log.data.railPass.split(',').filter((p: string) => p.trim() !== "");
                if (activePasses.length > 0) {
                    eventObj.passes = activePasses;
                }
            }

            if (msg === 'card-exit') {
                eventObj.paid = parseFloat(log.data?.fare || 0).toFixed(2);
                eventObj.osi = (log.data?.osi === true || log.data?.osi === "true") ? "true" : "false";
            } else if (msg === 'payment') {
                eventObj.paid = parseFloat(log.data?.cost || 0).toFixed(2);
            }

            // --- THE STATE MACHINE ---
            if (eventObj.status === 'entry-pay') {
                if (pendingEntry) {
                    pendingEntry.error = "invalid-trip";
                    currentJourney.push({ entry: pendingEntry });
                    history.push([...currentJourney]);
                    currentJourney = [];
                    pendingEntry = null;
                }
                history.push([{ payment: eventObj }]);
            }
            else if (eventObj.status === 'entry') {
                if (pendingEntry) {
                    pendingEntry.error = "invalid-trip";
                    currentJourney.push({ entry: pendingEntry });
                    history.push([...currentJourney]);
                    currentJourney = [];
                }
                pendingEntry = eventObj;
            }
            else if (eventObj.status === 'exit') {
                if (pendingEntry) {
                    // Match found!
                    currentJourney.push({ entry: pendingEntry, exit: eventObj });
                    pendingEntry = null;

                    // Close group if OSI is false
                    if (eventObj.osi === 'false') {
                        history.push([...currentJourney]);
                        currentJourney = [];
                    }
                } else {
                    // Exit without entry
                    eventObj.error = "invalid-trip";
                    currentJourney.push({ exit: eventObj });
                    history.push([...currentJourney]);
                    currentJourney = [];
                }
            }
        }

        // Catch hanging trips (e.g., currently riding the train)
        if (pendingEntry) {
            currentJourney.push({ entry: pendingEntry });
        }
        if (currentJourney.length > 0) {
            history.push([...currentJourney]);
        }

        // Reverse to show newest journeys at the top
        history.reverse();

        return NextResponse.json({ details, history });
    } catch (error) {
        console.error("Transit API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}