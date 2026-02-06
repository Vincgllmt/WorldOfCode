// export async function createWebRtcTransport(router) {
//     return await router.createWebRtcTransport({
//         listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
//         enableUdp: true,
//         enableTcp: true,
//         preferUdp: true,
//     });
// }
export async function createWebRtcTransport(router) {
    const transport = await router.createWebRtcTransport({
        listenIps: [
            {
                ip: "0.0.0.0",
                announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 600000,
    });

    await transport.setMaxIncomingBitrate(1500000);

    console.log("🚀 WebRTC transport created", {
        listenIps: transport.listenIps,
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
        iceCandidates: transport.iceCandidates
    });

    return transport;
}
