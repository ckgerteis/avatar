let scene, camera, renderer, avatar;
let mediaRecorder, audioChunks = [];

async function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 3);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("threejs-canvas"), alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 5, 5).normalize();
    scene.add(light);

    // Load GLB model
    const loader = new THREE.GLTFLoader();
    loader.load("https://github.com/ckgerteis/avatar/KimYoungsookAvatar.glb", function(gltf) {
        avatar = gltf.scene;
        avatar.scale.set(1, 1, 1);
        scene.add(avatar);
        animate();
    });
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

async function startVoiceConversation() {
    // Access user microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob);

        // Send audio to ElevenLabs Conversational AI API
        const response = await fetch("https://api.elevenlabs.io/v1/conversational-ai", {
            method: "POST",
            headers: {
                "Authorization": "Bearer sk_1121450cbb7b3a5efc9b238d1e4c03b052e089852fae0954"
            },
            body: formData
        });

        const data = await response.json();
        const audioUrl = data.audio_url;

        // Play AI-generated response
        const audio = document.getElementById("aiResponseAudio");
        audio.src = audioUrl;
        audio.play();

        // Trigger lip sync animation
        analyzeAudioForLipSync(audioUrl);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
}

async function analyzeAudioForLipSync(audioUrl) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const analyzer = audioContext.createAnalyser();
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyzer);
    source.connect(audioContext.destination);
    source.start();

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    function updateLipSync() {
        analyzer.getByteFrequencyData(dataArray);
        let volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (volume > 30) {
            if (avatar) {
                let mouth = avatar.getObjectByName("Mouth");
                if (mouth) mouth.scale.y = 1.5;
            }
        } else {
            if (avatar) {
                let mouth = avatar.getObjectByName("Mouth");
                if (mouth) mouth.scale.y = 1;
            }
        }

        requestAnimationFrame(updateLipSync);
    }

    updateLipSync();
}

initThreeJS();
