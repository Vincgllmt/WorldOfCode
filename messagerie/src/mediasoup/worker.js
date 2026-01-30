import mediasoup from "mediasoup";

let worker;

export async function initMediaSoupWorker() {
    worker = await mediasoup.createWorker({
        rtcMinPort: 40000,
        rtcMaxPort: 40100,
    });


    worker.on("died", () => {
        console.error("💥 MediaSoup worker died");
        process.exit(1);
    });

    console.log("🎥 MediaSoup worker started");
}

export function getWorker() {
    return worker;
}
