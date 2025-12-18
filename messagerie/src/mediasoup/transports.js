export async function createWebRtcTransport(router) {
    return await router.createWebRtcTransport({
        listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
}
