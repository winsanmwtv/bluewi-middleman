import { NextRequest, NextResponse } from 'next/server';
import { fetchAndProcessLogs, formatUTC8 } from '@/lib/iciwi';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    try {
        const { valid, logs, details } = await fetchAndProcessLogs(serial);

        // Reverse here so payments are Newest -> Oldest
        const history = logs.reverse().map((log: any) => {
            const msg = log.message;
            let dataObj = {
                payment: "deduct",
                type: "transit",
                text: "",
                location: "",
                total: 0.0,
                datetime: formatUTC8(log.timestamp)
            };

            if (msg === 'new-card') {
                dataObj.payment = "add";
                dataObj.type = "shop";
                dataObj.text = "Purchase card";
                dataObj.location = "ICIWI Pte., Ltd.";
                dataObj.total = parseFloat(log.data?.value || 0);
            }
            else if (msg === 'top-up-card') {
                dataObj.payment = "add";
                dataObj.type = "shop";
                dataObj.text = "Add value";
                dataObj.location = "ICIWI Pte., Ltd.";
                dataObj.total = parseFloat(log.data?.change || 0);
            }
            else if (msg === 'card-entry') {
                dataObj.payment = "deduct";
                dataObj.text = "Card verification";
                dataObj.location = log.data?.nStation || "STATION";
                dataObj.total = 0.0;
            }
            else if (msg === 'card-exit') {
                dataObj.payment = "deduct";
                dataObj.text = "Transit payment";
                dataObj.location = log.data?.xStation || "STATION";
                dataObj.total = parseFloat(log.data?.fare || 0);
            }
            else if (msg === 'payment') {
                dataObj.payment = "deduct";
                dataObj.type = "shop";
                dataObj.text = "Shop payment";
                dataObj.location = log.data?.station || "STATION";
                dataObj.total = parseFloat(log.data?.cost || 0);
            }

            return dataObj;
        }).filter((item: any) => item.text !== ""); // Filter out unused log types

        return NextResponse.json({ details, history });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}