export async function fetchAndProcessLogs(serial: string | null) {
    const targetUrl = 'https://bluemap.limaru.net/iciwi.log';

    const response = await fetch(targetUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch data');

    const data = await response.text();
    // Fix the weird JSON format from the raw log
    const commaSeparated = data.replace(/\}\s*\{/g, '},\n{');
    const validJsonString = `[\n${commaSeparated}\n]`;
    const allLogs = JSON.parse(validJsonString);

    if (!serial) return { valid: false, logs: [], details: null };

    // Filter logs for this specific card
    const serialLogs = allLogs.filter((log: any) =>
        log.data?.serial === serial || log.data?.card === serial
    );

    // Scan for new-card to isolate only the current ACTIVE session
    let startIndex = 0;
    for (let i = 0; i < serialLogs.length; i++) {
        if (serialLogs[i].message === 'new-card') {
            startIndex = i;
        }
    }

    const activeLogs = serialLogs.slice(startIndex);

    // Check validity (valid if we have logs and it hasn't been refunded)
    const valid = activeLogs.length > 0 && activeLogs[activeLogs.length - 1].message !== 'refund-card';

    // Extract player details
    const newestLog = activeLogs[activeLogs.length - 1] || serialLogs[serialLogs.length - 1];
    let username = "Unknown";
    let latestBalance = newestLog?.data?.value ?? newestLog?.data?.old ?? 0.0;

    if (newestLog?.data?.player) {
        const uuid = newestLog.data.player.replace(/-/g, '');
        try {
            const mojangRes = await fetch(`https://api.mojang.com/user/profile/${uuid}`);
            if (mojangRes.ok) {
                const mojangData = await mojangRes.json();
                username = mojangData.name;
            }
        } catch (e) {
            console.error("Mojang API error", e);
        }
    }

    return {
        valid,
        logs: activeLogs, // Kept chronological for the State Machine!
        details: {
            username,
            balance: parseFloat(latestBalance).toFixed(2),
            valid
        }
    };
}

export function formatUTC8(timestamp: string) {
    const date = new Date(timestamp.replace(' ', 'T') + 'Z');
    return date.toLocaleString('en-CA', {
        timeZone: 'Asia/Singapore',
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(',', '');
}

export function getStationType(station: string) {
    if (!station) return "unknown";
    if (station === "Not in use") return "error";
    if (["LibraryKNUT","CentralLibrary","BaanRattana","IICP","Cinemaru","Screen"].includes(station)) return "store/education";
    if (station.startsWith("Boat-")) return "boat";
    if (station.startsWith("BRT-") || station.startsWith("KTB-") || station.startsWith("Bus-") || station.startsWith("ETB-")) return "bus";
    return "train";
}