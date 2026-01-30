import { io } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const CONV_ID = "test-conversation";

const params = new URLSearchParams(window.location.search);
const USER_ID = Number(params.get("user") || 1);

// Mets 2 tokens valides ici
const TOKENS = {
    1: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3Njk3NzExOTMsImV4cCI6MTc2OTc3NDc5Mywicm9sZXMiOlsiUk9MRV9VU0VSIl0sInVzZXJuYW1lIjoidGVzdDEyMzQifQ.WgwrSxYBC-EYz6fvtQ9OK4cNIK5AzZ_AesBhAYqCBRCPOAWlGqP9sneoPt1AfnHlYMLN51GzgC7KeWndNWGNoZXqKQU-cd0n3s-6tVt_hk1Q3MKAmxybu-aDiEW3DVVyTKAJ6z7zllnO98PzQ2fBb3QeM5mlVJznzTQbI1aIK41ymz1MFXezkP8SvlM8dWaiKPNC8-c7ZhLx7MBDfuXg8uGl6uNhe8--WznZiRDRAnJV16VguAtEvK0UHaHQOe4cgY8bcDMUQE4brVyEcJHp1A6nw6jClUWjIAPXhj7RYyYoM_0NAvpJv5oyJc4p7iaLZntIBaolQz3nz-X7Xtcbag",
    2: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3Njk3NzExMzgsImV4cCI6MTc2OTc3NDczOCwicm9sZXMiOlsiUk9MRV9VU0VSIl0sInVzZXJuYW1lIjoidGVzdDEyMzQ1In0.u1CUo-hRbCUKXg8QTgmJX6ex4-GdBWy-0UnkKHxC5AcQ79zGLm_KghI88WR9ITet1rqSFqacYYZ0TmbKRN9NzizLSINqXS_b07-_c-l-7U6y0jGyPvtpsULquOqco4iFkkKuD2YGpv-PvXbkLmoTL-jmMqbmCP-oTovsBci7-EFMKeFlpezLX_HTKLGy7QNmmQ_X5h4-GlLjpGuFs8enu7zF9LBlhemwE0bEyS_QgIsQENPYcQRjeyaz5kpIKHbgec8QJ9jJgRcihanL2VVtRKmJecJz6ezmJ6eBMHzVVCrI_IoKjFHtHYufYoi9jGxA678qW4skxRxYQPkWs4yg-Q",
};

const TOKEN = TOKENS[USER_ID];

const socket = io("http://localhost:8081", {
    auth: { token: TOKEN, userId: USER_ID },
    transports: ["websocket"],
});

let device;
let sendTransport;
let recvTransport;
let audioProducer;
let videoProducer;
let remoteVideoElement = null;
let micMuted = false;
let cameraOff = false;

document.body.innerHTML = `
  <div class="min-h-screen bg-gray-900 text-white flex flex-col relative">

    <!-- Header -->
    <header class="px-6 py-4 border-b border-gray-700 flex items-center justify-between z-10">
      <h1 class="text-xl font-semibold">🎥 MediaSoup POC</h1>
      <button
        id="join"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg">
        Join
      </button>
    </header>

    <!-- Main video area -->
    <main class="flex-1 relative bg-black">

      <!-- Remote video (plein écran) -->
      <div
        id="remote-videos"
        class="absolute inset-0 flex items-center justify-center">
      </div>

      <!-- Local preview -->
      <!-- Local preview -->
<div
  id="local-container"
  class="absolute bottom-24 right-4 w-48 h-32 bg-black rounded-lg overflow-hidden shadow-lg border border-gray-700 flex items-center justify-center">

  <!-- Video -->
  <video
    id="local"
    autoplay
    muted
    playsinline
    class="absolute inset-0 w-full h-full object-cover">
  </video>

  <!-- Fallback userId -->
  <div
    id="local-fallback"
    class="hidden text-white text-lg font-semibold tracking-wide">
    User 1
  </div>
</div>

      <!-- Bottom controls (Meet-style) -->
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2
               flex gap-4 bg-black/70 px-6 py-3 rounded-full
               backdrop-blur-md shadow-lg">

        <button
          id="cam"
          class="px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700
                 disabled:opacity-50 disabled:cursor-not-allowed">
          📷
        </button>

        <button
          id="mute"
          class="px-5 py-3 rounded-full bg-gray-700 hover:bg-gray-600
                 disabled:opacity-50 disabled:cursor-not-allowed">
          🎤
        </button>

      </div>

    </main>
  </div>
`;


document.getElementById("local-fallback").textContent = `User ${USER_ID}`;
document.querySelector("h1").textContent = `🎥 MediaSoup POC — User ${USER_ID}`;

/**
 * ===== JOIN VIDEO =====
 */
document.getElementById("join").onclick = async () => {
    console.log("🔵 Joining video room...");

    const { rtpCapabilities, existingProducers } = await emit("join_video", {
        conversation_id: CONV_ID,
    });

    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });

    sendTransport = await createTransport("send");
    recvTransport = await createTransport("recv");

    // 🔥 Consommer les producers déjà présents
    for (const producerId of existingProducers) {
        console.log(`📺 Consuming existing producer: ${producerId}`);
        await consumeProducer(producerId);
    }

    console.log("✅ Joined video room");
};

/**
 * ===== START CAMERA =====
 */
/**
 * ===== CAMERA TOGGLE =====
 */
document.getElementById("cam").onclick = async () => {
    const camBtn = document.getElementById("cam");

    // 🎥 Première activation
    if (!videoProducer) {
        console.log("🎥 Starting camera...");

        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        document.getElementById("local").srcObject = stream;

        videoProducer = await sendTransport.produce({
            track: stream.getVideoTracks()[0],
        });

        audioProducer = await sendTransport.produce({
            track: stream.getAudioTracks()[0],
        });

        camBtn.textContent = "📷 Off";
        camBtn.classList.remove("bg-emerald-600");
        camBtn.classList.add("bg-red-600");

        cameraOff = false;
        console.log("✅ Camera started");
        return;
    }

    // 🔴 Toggle OFF
    if (!cameraOff) {
        videoProducer.pause();
        cameraOff = true;
        document.getElementById("local").classList.add("hidden");
        document.getElementById("local-fallback").classList.remove("hidden");

        camBtn.textContent = "📷 On";
        camBtn.classList.remove("bg-emerald-600");
        camBtn.classList.add("bg-gray-700");
        document.getElementById("local").classList.add("hidden");

        console.log("📴 Camera paused");
    }
    // 🟢 Toggle ON
    else {
        videoProducer.resume();
        cameraOff = false;
        document.getElementById("local").classList.remove("hidden");
        document.getElementById("local-fallback").classList.add("hidden");

        camBtn.textContent = "📷 Off";
        camBtn.classList.remove("bg-gray-700");
        camBtn.classList.add("bg-emerald-600");
        document.getElementById("local").classList.remove("hidden");

        console.log("🎥 Camera resumed");
    }
};



window.addEventListener("beforeunload", () => {
    socket.disconnect();
});



/**
 * ===== MUTE =====
 */
document.getElementById("mute").onclick = () => {
    if (!audioProducer) return;

    const muteBtn = document.getElementById("mute");

    if (!micMuted) {
        audioProducer.pause();
        micMuted = true;
        muteBtn.classList.remove("bg-gray-700");
        muteBtn.classList.add("bg-red-600");
        muteBtn.textContent = "🔇";
    } else {
        audioProducer.resume();
        micMuted = false;
        muteBtn.classList.remove("bg-red-600");
        muteBtn.classList.add("bg-gray-700");
        muteBtn.textContent = "🎤";
    }
};



/**
 * ===== NEW PRODUCER =====
 */

socket.on("new_producer", async ({ producerId, peerId }) => {
    console.log(`🔔 New producer detected: ${producerId} from ${peerId}`);
    if (peerId === socket.id) return; // 🔥 clé
    await consumeProducer(producerId);
});


socket.on("producer_closed", ({ producerId }) => {
    console.log(`❌ Producer closed: ${producerId}`);

    const el = document.querySelector(
        `[data-producer-id="${producerId}"]`
    );


    if (el) {
        el.srcObject?.getTracks().forEach(t => t.stop());
        el.remove();
    }
});

/**
 * ===== CONSUME PRODUCER =====
 */
async function consumeProducer(producerId) {
    console.log(`📥 Consuming producer: ${producerId}`);
    if (document.querySelector(`[data-producer-id="${producerId}"]`)) {
        console.log("⏭️ already mounted", producerId);
        return;
    }
    const consumerData = await emit("consume", {
        conversation_id: CONV_ID,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
    });

    const consumer = await recvTransport.consume(consumerData);
    try {
        await consumer.resume?.();
    } catch (e) { }

    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    // if (consumer.kind === "video") {
    //     const video = document.createElement("video");
    //     video.dataset.producerId = producerId;
    //     video.srcObject = stream;
    //     video.autoplay = true;
    //     video.playsInline = true;
    //     video.muted = true;
    //     video.className =
    //         "w-full h-full object-cover rounded-xl border-2 border-transparent transition-colors";


    //     remoteVideoElement = video;
    //     document.getElementById("remote-videos").appendChild(video);
    // }
    if (consumer.kind === "video") {
        const video = document.createElement("video");
        video.dataset.producerId = producerId;
        video.srcObject = stream;

        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // ✅ allow autoplay
        video.className =
            "w-full h-full object-cover rounded-xl border-2 border-transparent transition-colors";

        remoteVideoElement = video;
        document.getElementById("remote-videos").appendChild(video);
        try {
            await video.play();
            console.log("▶️ remote video playing", producerId);
        } catch (e) {
            console.warn("⚠️ remote video play blocked", e);
        }
    }


    if (consumer.kind === "audio") {
        const audio = document.createElement("audio");
        audio.dataset.producerId = producerId;
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.muted = false;

        document.body.appendChild(audio);

        const audioContext = new AudioContext();
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let running = true;

        function detectVoice() {
            if (!running) return;

            analyser.getByteFrequencyData(dataArray);

            const volume =
                dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

            if (remoteVideoElement) {
                remoteVideoElement.classList.toggle(
                    "border-emerald-500",
                    volume > 25
                );
            }

            requestAnimationFrame(detectVoice);
        }

        detectVoice();

        // 🔥 STOP propre quand le consumer se ferme
        consumer.on("transportclose", () => {
            running = false;
            audioContext.close();
        });
    }

    console.log(`✅ Consumer created: ${consumer.id} (${consumer.kind})`);
}


/**
 * ===== CREATE TRANSPORT (🔥 FIX ICI) =====
 */
async function createTransport(direction) {
    const data = await emit("create_transport", {
        conversation_id: CONV_ID,
        direction, // 🔥 AJOUT
    });


    const transport =
        direction === "send"
            ? device.createSendTransport({
                ...data,
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            })
            : device.createRecvTransport({
                ...data,
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

    // 🔥 FIX : Connecter le transport correctement
    transport.on("connect", async ({ dtlsParameters }, cb, errback) => {
        try {
            console.log(`🔗 Connecting ${direction} transport...`);

            await emit("connect_transport", {
                conversation_id: CONV_ID,
                transportId: transport.id,
                dtlsParameters,
            });

            console.log(`✅ ${direction} transport connected`);
            cb();
        } catch (err) {
            console.error(`❌ ${direction} transport connection failed:`, err);
            errback(err);
        }
    });

    // Pour le sendTransport uniquement
    if (direction === "send") {
        transport.on("produce", async ({ kind, rtpParameters }, cb, errback) => {
            try {
                console.log(`📤 Producing ${kind}...`);

                const { id } = await emit("produce", {
                    conversation_id: CONV_ID,
                    transportId: transport.id,
                    kind,
                    rtpParameters,
                });

                console.log(`✅ Producer created: ${id}`);
                cb({ id });
            } catch (err) {
                console.error(`❌ Produce failed:`, err);
                errback(err);
            }
        });
    }

    return transport;
}

/**
 * ===== SOCKET EMIT HELPER =====
 */
function emit(event, data) {
    return new Promise((resolve) => socket.emit(event, data, resolve));
}