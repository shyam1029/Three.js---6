import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
//import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";
import { gsap } from "https://cdn.skypack.dev/gsap";

// SOUND EFFECTS
const crashAudio = document.getElementById('crash-audio');
const bonusAudio = document.getElementById('bonus-audio');
bonusAudio.volume = 0.35;
const bgAudio = document.getElementById('game-audio');
bgAudio.volume = 0.15;


// DOM Elements
const progressContainer = document.querySelector(".progress-bar-container");
const progressBar = document.querySelector("progress#progress-bar");
const progressText = document.querySelector("label.progress-bar");

// Global Variables
let scene = new THREE.Scene();
scene.background = new THREE.Color("#050f26");
const canvas = document.querySelector("canvas.webgl");
const sizes = { width: window.innerWidth, height: window.innerHeight };
const aspectRatio = sizes.width / sizes.height;
let camera = new THREE.PerspectiveCamera(
    /Mobi|Android/i.test(navigator.userAgent) ? 60 : 55,
    aspectRatio,
    0.1,
    1000
);
camera.position.set(-0.04, 1.34, /Mobi|Android/i.test(navigator.userAgent) ? 50.5 : 52.75);
scene.add(camera);
let renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
// let controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;
// controls.dampingFactor = 0.01;
let player, playerBox, playerBoxHelper, currentModel, phoenixModel, pegasusModel, sonGokuModel, mixerP, mixerPh;
let moon, sonM, sonE, particles, ambientLight, directionalLight;
let playGround1, playGround2, playGround3;
let cloudComputeBoxArr = [], cloudMeshArr = [], cloudMaterials = [], rewardComputeBoxArr = [], rewardMeshArr = [];
let gameStarts = false, currScore = 0, maxScore = 0, level = 1, levelSpeed = 15;
let playerTargetX = 0, playerJump = false, jumpTweenActive = false;
let xDown = null, yDown = null;
const playgroundLength = 110, playgroundBreadth = 60;
const parameters = { modelType: "phoenix", timeOfDay: "night", speedModifier: 1.0, particleType: "stars" };
const clock = new THREE.Clock();
const targetFrameRate = 60;
const frameTime = 1 / targetFrameRate;
let frameAccumulator = 0;

// Loading Manager
const manager = new THREE.LoadingManager();
manager.onStart = () => setTimeout(() => progressText.innerText = "Almost done...", 1300);
manager.onLoad = () => progressContainer.style.display = "none";
manager.onProgress = (url, itemsLoaded, itemsTotal) => progressBar.value = itemsLoaded / itemsTotal;
manager.onError = url => console.error("Error loading " + url);
const gltfLoader = new GLTFLoader(manager);
const textureLoader = new THREE.TextureLoader(manager);
const particleTexture = textureLoader.load("./assets/images/star_01.png");
const colorArray = new Uint8Array([170, 170, 170]);
const solidTexture = new THREE.DataTexture(colorArray, 1, 1, THREE.RGBFormat);
solidTexture.needsUpdate = true;

// Player Setup
player = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.5, 0.7),
    new THREE.MeshStandardMaterial({ color: "red", transparent: true, opacity: 0 })
);
player.position.set(0, -0.5, 48);
playerBox = new THREE.Box3();
player.geometry.computeBoundingBox();
playerBox.copy(player.geometry.boundingBox).applyMatrix4(player.matrixWorld);
scene.add(player);
playerBoxHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
// scene.add(playerBoxHelper);

// Model Loading
gltfLoader.load("./assets/models/phoenix_bird.glb", gltf => {
    phoenixModel = gltf.scene;
    phoenixModel.scale.set(0.003, 0.003, 0.003);
    phoenixModel.position.set(0, -0.7, 48);
    phoenixModel.rotation.y = Math.PI / 2;
    phoenixModel.traverse(child => {
        if (child.isMesh && child.material && "metalness" in child.material) {
            child.material.envMap = solidTexture;
            child.material.metalness = 0.1;
            child.material.roughness = 0.1;
            child.material.envMapIntensity = 0.1;
            child.material.emissive = new THREE.Color(0xffffff);
            child.material.emissiveIntensity = 0.005;
            child.material.needsUpdate = true;
        }
    });
    if (gltf.animations && gltf.animations.length > 0) {
        mixerPh = new THREE.AnimationMixer(phoenixModel);
        gltf.animations.forEach(clip => mixerPh.clipAction(clip).play());
    }
    scene.add(phoenixModel);
    currentModel = phoenixModel;
}, undefined, err => console.error("Failed to load phoenix model:", err));

gltfLoader.load("./assets/models/pegasus.glb", gltf => {
    pegasusModel = gltf.scene;
    pegasusModel.position.set(0, -0.4, 48);
    pegasusModel.scale.set(0.5, 0.5, 0.5);
    pegasusModel.visible = false;
    mixerP = new THREE.AnimationMixer(pegasusModel);
    if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach(clip => mixerP.clipAction(clip).play());
    }
    scene.add(pegasusModel);
}, undefined, err => console.error("Failed to load pegasus model:", err));

gltfLoader.load("./assets/models/son_goku.glb", gltf => {
    sonGokuModel = gltf.scene;
    sonGokuModel.position.set(0, -0.6, 48);
    sonGokuModel.rotation.order = 'YXZ';
    sonGokuModel.rotation.y = Math.PI;
    sonGokuModel.visible = false;
    sonGokuModel.traverse(child => {
        if (child.isMesh && child.material && "metalness" in child.material) {
            child.material.envMap = solidTexture;
            child.material.metalness = 0.1;
            child.material.roughness = 0.1;
            child.material.envMapIntensity = 0.1;
            child.material.emissive = new THREE.Color(0xffffff);
            child.material.emissiveIntensity = 0.005;
            child.material.needsUpdate = true;
        }
    });
    scene.add(sonGokuModel);
}, undefined, err => console.error("Failed to load sonGoku model:", err));

// Cloud Functions
const makeCloudComputeBox = cloud => {
    const box = new THREE.Box3();
    const baseRadius = 0.15;
    const scale = cloud.scale.x;
    const scaledDiameter = baseRadius * 2 * scale;
    const boxSideLength = scaledDiameter / 2;
    const center = cloud.position.clone();
    const size = new THREE.Vector3(boxSideLength, boxSideLength, boxSideLength);
    box.setFromCenterAndSize(center, size);
    box.applyMatrix4(cloud.parent.matrixWorld);
    cloudComputeBoxArr.push(box);
    const boxHelper = new THREE.Box3Helper(box, 0xffff00);
    // scene.add(boxHelper);
};

const createCloudMaterial = () => {
    const cloudVertexShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const cloudFragmentShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 baseColor;
        uniform vec3 edgeColor;
        void main() {
            vec3 light = normalize(vec3(1.0, 0.8, 0.5));
            float intensity = max(0.5, dot(vNormal, light));
            float edge = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.5);
            vec3 color = mix(baseColor, edgeColor, edge * 0.7);
            color = color * intensity;
            gl_FragColor = vec4(color, 0.95);
        }
    `;
    const material = new THREE.ShaderMaterial({
        uniforms: { baseColor: { value: new THREE.Color(0xffffff) }, edgeColor: { value: new THREE.Color(0xd1e3f3) } },
        vertexShader: cloudVertexShader,
        fragmentShader: cloudFragmentShader,
        transparent: true
    });
    cloudMaterials.push(material);
    return material;
};

const makeOneCloud = () => {
    const cloud = new THREE.Group();
    const sphereGeometry = new THREE.SphereGeometry(0.2);
    const sphereMaterial = createCloudMaterial();
    const spheres = [];
    for (let i = 0; i < 8; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        sphere.position.set(i * 0.5 - Math.random(), Math.random(), (Math.random() - 0.5) * 2);
        const scale = Math.random() * 5 + 2;
        sphere.scale.set(scale, scale, scale);
        cloud.add(sphere);
        spheres.push(sphere);
    }
    spheres.forEach(sphere => {
        makeCloudComputeBox(sphere);
        cloudMeshArr.push(sphere);
    });
    return cloud;
};

const makeClouds = cloudNum => {
    const clouds = new THREE.Group();
    for (let i = 0; i < cloudNum; i++) {
        const cloud = makeOneCloud();
        cloud.position.set(
            ((Math.random() * playgroundBreadth) / 2) * (i % 2 === 0 ? -1 : 1),
            -0.75,
            ((Math.random() * playgroundLength) / 2) * (Math.random() < 0.5 ? -1 : 1)
        );
        cloud.rotation.x = (Math.random() / 3) * (i % 2 === 0 ? -1 : 1);
        clouds.add(cloud);
    }
    return clouds;
};

// Reward Functions
const makeRewardComputeBox = reward => {
    const box = new THREE.Box3();
    reward.updateMatrix();
    reward.updateMatrixWorld(true);
    reward.geometry.computeBoundingBox();
    if (!reward.geometry.boundingBox) {
        reward.geometry.boundingBox = new THREE.Box3(
            new THREE.Vector3(-0.2, -0.2, -0.2),
            new THREE.Vector3(0.2, 0.2, 0.2)
        );
    }
    box.copy(reward.geometry.boundingBox).applyMatrix4(reward.matrixWorld);
    rewardComputeBoxArr.push(box);
};

const makeRewards = rewardNum => {
    const colors = [
        new THREE.Color("#ff4d4d"), new THREE.Color("#ffd700"), new THREE.Color("#00ff80"),
        new THREE.Color("#1e90ff"), new THREE.Color("#e066ff"), new THREE.Color("#ff69b4")
    ];
    const rewards = new THREE.Group();
    const vertexShader = `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader = `
        uniform vec3 glowColor;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            float pulse = 0.5 + 0.5 * sin(time * 2.0);
            float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 1)), 2.0);
            vec3 color = glowColor * (0.7 + pulse * 0.3);
            gl_FragColor = vec4(color, 0.9 * (1.0 - intensity));
        }
    `;
    for (let i = 0; i < rewardNum; i++) {
        const material = new THREE.ShaderMaterial({
            uniforms: { glowColor: { value: colors[i % colors.length] }, time: { value: 0 } },
            vertexShader,
            fragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        const reward = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), material);
        reward.position.set(
            ((Math.random() * playgroundBreadth) / 2) * (i % 2 === 0 ? -1 : 1),
            -0.5,
            ((Math.random() * playgroundLength) / 2) * (Math.floor(Math.random() * 10) % 2 === 0 ? -1 : 1)
        );
        reward.rotation.set((Math.random() / 3) * (i % 2 === 0 ? -1 : 1), 0, 0);
        let scaleVal = Math.random() * 0.5 + 0.5;
        scaleVal = scaleVal < 0.7 ? 0.7 : scaleVal;
        reward.scale.set(scaleVal, scaleVal, scaleVal);
        reward.userData = { initialY: reward.position.y, animationOffset: Math.random() * Math.PI * 2 };
        reward.visible = true;
        reward.geometry.computeBoundingBox();
        makeRewardComputeBox(reward);
        rewardMeshArr.push(reward);
        rewards.add(reward);
    }
    return rewards;
};

// Playground Setup
playGround1 = new THREE.Group();
playGround1.add(makeClouds(25), makeRewards(40));
scene.add(playGround1);
playGround2 = new THREE.Group();
playGround2.add(makeClouds(25), makeRewards(40));
playGround2.position.z -= playgroundLength;
scene.add(playGround2);
playGround3 = new THREE.Group();
playGround3.add(makeClouds(25), makeRewards(40));
playGround3.position.z -= playgroundLength * 2;
scene.add(playGround3);

// Moon Setup
moon = new THREE.Group();
const moonVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const moonFragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;
    uniform vec3 moonColor;
    uniform vec3 craterColor;
    uniform vec3 glowColor;
    uniform float glowIntensity;
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 3.0;
        for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }
    void main() {
        vec3 color = moonColor * 1.2;
        float detail = fbm(vUv * 20.0);
        float smallDetail = fbm(vUv * 50.0);
        vec3 lightDir = normalize(vec3(1.0, 0.0, 0.0));
        float diffuse = max(0.3, dot(vNormal, lightDir));
        float craterMask = smoothstep(0.4, 0.6, detail);
        color = mix(color, craterColor, craterMask * 0.4);
        color = mix(color, craterColor, smallDetail * 0.15);
        color *= diffuse * 1.3;
        vec3 viewDir = normalize(vViewPosition);
        float rimFactor = 1.0 - max(0.0, dot(viewDir, vNormal));
        rimFactor = pow(rimFactor, 3.0);
        color += glowColor * rimFactor * glowIntensity;
        float center = 1.0 - distance(vUv, vec2(0.5, 0.5)) * 2.0;
        center = max(0.0, center);
        color += moonColor * center * 0.1;
        gl_FragColor = vec4(color, 1.0);
    }
`;
const moonMaterial = new THREE.ShaderMaterial({
    uniforms: {
        moonColor: { value: new THREE.Color(0xf8f8f0) },
        craterColor: { value: new THREE.Color(0xc8c8c0) },
        glowColor: { value: new THREE.Color(0xffffee) },
        glowIntensity: { value: 0.7 }
    },
    vertexShader: moonVertexShader,
    fragmentShader: moonFragmentShader,
    side: THREE.FrontSide
});
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), moonMaterial);
moonMesh.position.set(-23, 17, 0);
moon.add(moonMesh);
const glowMaterial = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0xffffee) } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
            gl_FragColor = vec4(glowColor, intensity * 0.3);
        }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});
const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 32), glowMaterial);
glowMesh.position.copy(moonMesh.position);
moon.add(glowMesh);
const moonLight = new THREE.PointLight(0xf0f0ff, 1.5, 100);
moonLight.position.copy(moonMesh.position);
moon.add(moonLight);
scene.add(moon);

// Morning Sun Setup
sonM = new THREE.Group();
const sunGeometry = new THREE.SphereGeometry(4, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfffaf0, transparent: true, opacity: 0.9 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(30, 15, -40);
sonM.add(sunMesh);
const innerGlowGeometry = new THREE.SphereGeometry(4.05, 32, 32);
const innerGlowMaterial = new THREE.ShaderMaterial({
    uniforms: { sunColor: { value: new THREE.Color(0xfffcf0) } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 sunColor;
        void main() {
            float intensity = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
            gl_FragColor = vec4(sunColor, intensity * 0.2);
        }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});
const innerGlowMesh = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
innerGlowMesh.position.copy(sunMesh.position);
sonM.add(innerGlowMesh);
const glowGeometry = new THREE.SphereGeometry(4.5, 32, 32);
const glowMaterialSun = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0xfffbf0) } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(glowColor, intensity * 0.35);
        }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});
const glowMeshSun = new THREE.Mesh(glowGeometry, glowMaterialSun);
glowMeshSun.position.copy(sunMesh.position);
sonM.add(glowMeshSun);
const sunLight = new THREE.DirectionalLight(0xfffdf7, 1.0);
sunLight.position.set(1, 0.8, 0.2).normalize();
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.bias = -0.0005;
const shadowSize = 50;
sunLight.shadow.camera.left = -shadowSize;
sunLight.shadow.camera.right = shadowSize;
sunLight.shadow.camera.top = shadowSize;
sunLight.shadow.camera.bottom = -shadowSize;
sonM.add(sunLight);
const skyLight = new THREE.HemisphereLight(0xe0f0ff, 0xfff5e0, 0.4);
sonM.add(skyLight);
sonM.visible = false;
scene.add(sonM);

// Evening Sun Setup
sonE = new THREE.Group();
const sunGeometryE = new THREE.SphereGeometry(5, 64, 64);
const sunMaterialE = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 });
const sunMeshE = new THREE.Mesh(sunGeometryE, sunMaterialE);
sunMeshE.position.set(-30, 8, -40);
sonE.add(sunMeshE);
const innerGlowGeometryE = new THREE.SphereGeometry(5.05, 32, 32);
const innerGlowMaterialE = new THREE.ShaderMaterial({
    uniforms: { sunColor: { value: new THREE.Color(0xffca7a) } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 sunColor;
        void main() {
            float intensity = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
            gl_FragColor = vec4(sunColor, intensity * 0.25);
        }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});
const innerGlowMeshE = new THREE.Mesh(innerGlowGeometryE, innerGlowMaterialE);
innerGlowMeshE.position.copy(sunMeshE.position);
sonE.add(innerGlowMeshE);
const hazeGeometry = new THREE.SphereGeometry(6, 32, 32);
const hazeMaterial = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0xff8c42) } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.7);
            gl_FragColor = vec4(glowColor, intensity * 0.4);
        }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});
const hazeMesh = new THREE.Mesh(hazeGeometry, hazeMaterial);
hazeMesh.position.copy(sunMeshE.position);
sonE.add(hazeMesh);
const atmosphereGeometry = new THREE.SphereGeometry(8, 32, 32);
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(0xff6347) } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 glowColor;
        void main() {
            vec3 viewDir = vec3(0.0, 0.0, 1.0);
            float intensity = pow(0.55 - dot(vNormal, viewDir), 1.5);
            intensity *= (1.0 - 0.7 * vNormal.y);
            gl_FragColor = vec4(glowColor, intensity * 0.3);
        }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
});
const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
atmosphereMesh.position.copy(sunMeshE.position);
sonE.add(atmosphereMesh);
const sunLightE = new THREE.DirectionalLight(0xff8c42, 0.8);
sunLightE.position.set(-1, 0.3, 0.2).normalize();
sunLightE.castShadow = true;
sunLightE.shadow.mapSize.width = 2048;
sunLightE.shadow.mapSize.height = 2048;
sunLightE.shadow.camera.near = 0.5;
sunLightE.shadow.camera.far = 500;
sunLightE.shadow.bias = -0.0005;
sunLightE.shadow.camera.left = -shadowSize;
sunLightE.shadow.camera.right = shadowSize;
sunLightE.shadow.camera.top = shadowSize;
sunLightE.shadow.camera.bottom = -shadowSize;
sonE.add(sunLightE);
const skyLightE = new THREE.HemisphereLight(0xffca7a, 0xff6347, 0.5);
sonE.add(skyLightE);
const fillLight = new THREE.DirectionalLight(0xff8c42, 0.3);
fillLight.position.set(-0.8, 0.2, 0.5).normalize();
sonE.add(fillLight);
sonE.visible = false;
scene.add(sonE);

// Particle System
const createStarParticles = count => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 25;
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        size: 0.2,
        transparent: true,
        alphaMap: particleTexture,
        sizeAttenuation: true,
        depthWrite: false
    });
    return new THREE.Points(geometry, material);
};

const createRainParticles = count => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 30;
        positions[i3 + 1] = Math.random() * 25 + 5;
        positions[i3 + 2] = (Math.random() - 0.3) * 25;
        velocities[i] = 0.1 + Math.random() * 0.15;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xaaddff,
        size: 0.07,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    const rainSystem = new THREE.Points(geometry, material);
    rainSystem.userData = { velocities, isRain: true };
    return rainSystem;
};

const switchParticles = type => {
    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        particles = null;
    }
    if (type === "stars") {
        particles = createStarParticles(1500);
        particles.position.set(0, 0, 51);
        scene.add(particles);
    } else if (type === "rain") {
        particles = createRainParticles(5000);
        particles.position.set(0, 5, 40);
        scene.add(particles);
    }
};

particles = createStarParticles(1500);
particles.position.set(0, 0, 51);
scene.add(particles);

// Lighting
ambientLight = new THREE.AmbientLight("grey", 1.5);
scene.add(ambientLight);
directionalLight = new THREE.DirectionalLight("white", 4);
directionalLight.position.set(0, 4, 7);
scene.add(directionalLight);

// Game Sidebar GUI
class GameSidebar {
    constructor() {
        this.parameters = { ...parameters };
        this.callbacks = {};
        this.createStyles();
        this.createSidebar();
    }

    createStyles() {
        const existingStyles = document.getElementById("game-sidebar-styles");
        if (existingStyles) existingStyles.remove();
        const style = document.createElement("style");
        style.id = "game-sidebar-styles";
        style.textContent = `
            #game-sidebar {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 280px;
                background: rgba(0, 20, 40, 0.8);
                color: #fff;
                font-family: 'Rajdhani', Arial, sans-serif;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(0, 136, 255, 0.5);
                z-index: 9000;
                backdrop-filter: blur(5px);
                border: 2px solid #0088ff;
                overflow: hidden;
            }
            .sidebar-title {
                background: linear-gradient(90deg, #003366 0%, #0077cc 100%);
                padding: 12px 20px;
                font-size: 20px;
                font-weight: bold;
                letter-spacing: 2px;
                text-align: center;
                border-bottom: 2px solid #0088ff;
                color: #ffffff;
                text-shadow: 0 0 5px rgba(0, 136, 255, 0.5);
            }
            .category {
                border-bottom: 1px solid rgba(0, 136, 255, 0.3);
            }
            .category-header {
                background: rgba(0, 60, 120, 0.5);
                padding: 12px 20px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .category-header:hover {
                background: rgba(0, 80, 160, 0.7);
            }
            .category-header::after {
                content: '+';
                font-size: 20px;
                color: #0088ff;
                font-weight: bold;
            }
            .category.open .category-header::after {
                content: '-';
            }
            .category-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }
            .category.open .category-content {
                max-height: 500px;
            }
            .control-item {
                padding: 12px 20px;
                border-top: 1px solid rgba(0, 136, 255, 0.2);
            }
            .control-label {
                font-weight: 500;
                margin-bottom: 8px;
                color: #0088ff;
            }
            .toggle-group {
                display: flex;
                justify-content: space-between;
                gap: 6px;
                flex-wrap: wrap;
            }
            .toggle-button {
                flex: 1;
                min-width: 70px;
                background: rgba(0, 40, 80, 0.6);
                border: 1px solid #0088ff;
                color: #bbd8ff;
                padding: 8px 4px;
                cursor: pointer;
                text-align: center;
                border-radius: 4px;
                font-size: 13px;
                transition: all 0.2s ease;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 500;
                text-transform: capitalize;
            }
            .toggle-button:hover {
                background: rgba(0, 80, 160, 0.4);
                box-shadow: 0 0 5px rgba(0, 136, 255, 0.5);
            }
            .toggle-button.active {
                background: #0088ff;
                color: white;
                box-shadow: 0 0 10px rgba(0, 136, 255, 0.8);
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 10px rgba(0, 136, 255, 0.4); }
                50% { box-shadow: 0 0 20px rgba(0, 136, 255, 0.7); }
                100% { box-shadow: 0 0 10px rgba(0, 136, 255, 0.4); }
            }
            #game-sidebar {
                animation: pulse 3s infinite;
            }
            .scanline {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #0088ff, transparent);
                opacity: 0.7;
                z-index: 9001;
                pointer-events: none;
                animation: scan 4s linear infinite;
            }
            @keyframes scan {
                0% { top: 0; }
                100% { top: 100%; }
            }
        `;
        document.head.appendChild(style);
        if (!document.getElementById("rajdhani-font")) {
            const font = document.createElement("link");
            font.id = "rajdhani-font";
            font.rel = "stylesheet";
            font.href = "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap";
            document.head.appendChild(font);
        }
    }

    createSidebar() {
        const existingSidebar = document.getElementById("game-sidebar");
        if (existingSidebar) existingSidebar.remove();
        const sidebar = document.createElement("div");
        sidebar.id = "game-sidebar";
        const title = document.createElement("div");
        title.className = "sidebar-title";
        title.textContent = "GAME CONTROLS";
        sidebar.appendChild(title);
        const scanline = document.createElement("div");
        scanline.className = "scanline";
        sidebar.appendChild(scanline);
        this.createCategory(sidebar, "Character", [
            { label: "Character Type", param: "modelType", options: ["phoenix", "pegasus", "songoku"] }
        ]);
        this.createCategory(sidebar, "Environment", [
            { label: "Time of Day", param: "timeOfDay", options: ["morning", "evening", "night"] }
        ]);
        document.body.appendChild(sidebar);
        setTimeout(() => {
            const envCategory = document.getElementById("category-environment");
            if (envCategory) envCategory.classList.add("open");
        }, 100);
    }

    createCategory(parent, name, controls) {
        const categoryId = name.toLowerCase();
        const category = document.createElement("div");
        category.className = "category";
        category.id = `category-${categoryId}`;
        const header = document.createElement("div");
        header.className = "category-header";
        header.textContent = name;
        header.onclick = () => category.classList.toggle("open");
        const content = document.createElement("div");
        content.className = "category-content";
        controls.forEach(control => this.createButtonToggleControl(content, control));
        category.appendChild(header);
        category.appendChild(content);
        parent.appendChild(category);
    }

    createButtonToggleControl(parent, control) {
        const controlItem = document.createElement("div");
        controlItem.className = "control-item";
        const label = document.createElement("div");
        label.className = "control-label";
        label.textContent = control.label;
        const toggleGroup = document.createElement("div");
        toggleGroup.className = "toggle-group";
        control.options.forEach(option => {
            const button = document.createElement("button");
            button.className = "toggle-button";
            button.textContent = this.capitalize(option);
            if (option === this.parameters[control.param]) button.classList.add("active");
            button.onclick = () => {
                toggleGroup.querySelectorAll(".toggle-button").forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                this.parameters[control.param] = option;
                parameters[control.param] = option;
                if (this.callbacks[control.param]) this.callbacks[control.param](option);
            };
            toggleGroup.appendChild(button);
        });
        controlItem.appendChild(label);
        controlItem.appendChild(toggleGroup);
        parent.appendChild(controlItem);
    }

    onChange(param, callback) {
        this.callbacks[param] = callback;
    }

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

const gameGUI = new GameSidebar();
gameGUI.onChange("modelType", value => {
    if (phoenixModel) phoenixModel.visible = false;
    if (pegasusModel) pegasusModel.visible = false;
    if (sonGokuModel) sonGokuModel.visible = false;
    let selectedModel = null;
    if (value === "phoenix" && phoenixModel) selectedModel = phoenixModel;
    else if (value === "pegasus" && pegasusModel) selectedModel = pegasusModel;
    else if (value === "songoku" && sonGokuModel) selectedModel = sonGokuModel;
    if (selectedModel) {
        selectedModel.visible = true;
        currentModel = selectedModel;
        parameters.modelType = value;
        if (player) currentModel.position.copy(player.position);
    }
});
gameGUI.onChange("timeOfDay", value => {
    const settings = {
        morning: {
            bg: "#87CEEB",
            ambient: ["#FFFFFF", 1.8],
            directional: ["#FFFACD", 5],
            moon: { visible: false, lights: [] },
            sonM: { visible: true, lights: ["DirectionalLight", "HemisphereLight"] },
            sonE: { visible: false, lights: [] },
            cloudColors: { base: new THREE.Color(0xffffff), edge: new THREE.Color(0xffffff) },
            particleType: "none"
        },
        evening: {
            bg: "#f4a261",
            ambient: ["#ffca7a", 1.2],
            directional: ["#ff8c42", 3],
            moon: { visible: false, lights: [] },
            sonM: { visible: false, lights: [] },
            sonE: { visible: true, lights: ["DirectionalLight", "HemisphereLight", "DirectionalLight"] },
            cloudColors: { base: new THREE.Color(0xf8d9b5), edge: new THREE.Color(0xf88f6d) },
            particleType: "rain"
        },
        night: {
            bg: "#050f26",
            ambient: ["grey", 1.5],
            directional: ["white", 4],
            moon: { visible: true, lights: ["PointLight"] },
            sonM: { visible: false, lights: [] },
            sonE: { visible: false, lights: [] },
            cloudColors: { base: new THREE.Color(0xffffff), edge: new THREE.Color(0xd1e3f3) },
            particleType: "stars"
        }
    }[value];
    scene.background = new THREE.Color(settings.bg);
    ambientLight.color.set(settings.ambient[0]);
    ambientLight.intensity = settings.ambient[1];
    directionalLight.color.set(settings.directional[0]);
    directionalLight.intensity = settings.directional[1];
    moon.visible = settings.moon.visible;
    moon.traverse(child => {
        if (settings.moon.lights.includes(child.type)) child.visible = settings.moon.visible;
    });
    sonM.visible = settings.sonM.visible;
    sonM.traverse(child => {
        if (settings.sonM.lights.includes(child.type)) child.visible = settings.sonM.visible;
    });
    sonE.visible = settings.sonE.visible;
    sonE.traverse(child => {
        if (settings.sonE.lights.includes(child.type)) child.visible = settings.sonE.visible;
    });
    cloudMaterials.forEach(material => {
        material.uniforms.baseColor.value.copy(settings.cloudColors.base);
        material.uniforms.edgeColor.value.copy(settings.cloudColors.edge);
    });
    parameters.particleType = settings.particleType;
    switchParticles(settings.particleType);
    parameters.timeOfDay = value;
});

// Game Logic
let levelTimer = null;

document.querySelector(".menu-container h2").addEventListener("click", () => {
    document.querySelector(".menu-container").style.display = "none";
    bgAudio.play();
    if (levelTimer) clearInterval(levelTimer);
    level = 1;
    levelSpeed = 15;
    document.getElementById("level-container").innerHTML = `<div>Level ${level}</div>`;
    levelTimer = setInterval(() => {
        level += 1;
        levelSpeed += 5;
        document.getElementById("level-container").innerHTML = `<div>Level ${level}</div>`;
    }, 20000);
    setTimeout(() => gameStarts = true, 3000);
});

function reset() {
    if (currScore > maxScore) {
        maxScore = Math.floor(currScore);
        document.getElementById("max-score").innerHTML = `Max score : <span> ${maxScore} </span>`;
    }
    currScore = 0;
    level = 1;
    levelSpeed = 15;
    if (levelTimer) {
        clearInterval(levelTimer);
        levelTimer = null;
    }
    document.getElementById("level-container").innerHTML = `<div>Level ${level}</div>`;
    document.getElementById("curr-score").innerHTML = `Curr score : <span> 0 </span>`;
    player.position.set(0, -0.5, 48);
    if (currentModel) currentModel.position.copy(player.position);
    gameStarts = false;
    document.querySelector(".menu-container").style.display = "flex";
    playGround1.position.z = 0;
    playGround2.position.z = -playgroundLength;
    playGround3.position.z = -playgroundLength * 2;
    randomizeClouds(playGround1);
    randomizeClouds(playGround2);
    randomizeClouds(playGround3);
}

function randomizeClouds(playGround) {
    const cloudArr = playGround.children[0].children;
    let i = 0;
    cloudArr.forEach(cloud => {
        cloud.position.set(
            Math.random() * playgroundBreadth / 2 * (i % 2 === 0 ? -1 : 1),
            -0.75,
            Math.random() * playgroundLength / 2 * (Math.floor(Math.random() * 10) % 2 === 0 ? -1 : 1)
        );
        cloud.rotation.x = (Math.random() / 3) * (i % 2 === 0 ? -1 : 1);
        cloud.updateMatrix();
        i++;
    });
}

function regenerateGround() {
    if (playGround1.position.z > playgroundLength) {
        playGround1.position.z = -playgroundLength * 2;
        randomizeClouds(playGround1);
    } else if (playGround2.position.z > playgroundLength) {
        playGround2.position.z = -playgroundLength * 2;
        randomizeClouds(playGround2);
    } else if (playGround3.position.z > playgroundLength) {
        playGround3.position.z = -playgroundLength * 2;
        randomizeClouds(playGround3);
    }
}

function updateBoundingBoxes() {
    playerBox.copy(player.geometry.boundingBox).applyMatrix4(player.matrixWorld);
    playerBoxHelper.box = playerBox;
    cloudComputeBoxArr.forEach((box, i) => {
        const cloud = cloudMeshArr[i];
        if (cloud) {
            const baseRadius = 0.15;
            const scale = cloud.scale.x;
            const scaledDiameter = baseRadius * 2 * scale;
            const boxSideLength = scaledDiameter / 2;
            const center = cloud.position.clone();
            const size = new THREE.Vector3(boxSideLength, boxSideLength, boxSideLength);
            box.setFromCenterAndSize(center, size);
            box.applyMatrix4(cloud.parent.matrixWorld);
        }
    });
    const defaultBox = new THREE.Box3(
        new THREE.Vector3(-0.2, -0.2, -0.2),
        new THREE.Vector3(0.2, 0.2, 0.2)
    );
    for (let i = 0; i < rewardComputeBoxArr.length && i < rewardMeshArr.length; i++) {
        const boundingBox = rewardMeshArr[i].geometry.boundingBox || defaultBox;
        rewardComputeBoxArr[i].copy(boundingBox).applyMatrix4(rewardMeshArr[i].matrixWorld);
    }
}

function checkCollision() {
    for (let i = 0; i < cloudComputeBoxArr.length; i++) {
        if (playerBox.intersectsBox(cloudComputeBoxArr[i])){
            crashAudio.play();
            reset();
        } 
    }
    for (let i = 0; i < rewardComputeBoxArr.length; i++) {
        if (playerBox.intersectsBox(rewardComputeBoxArr[i])) {
            currScore += 5;
            bonusAudio.play();
        }
    }
    document.getElementById("curr-score").innerHTML = `Curr score : <span> ${Math.floor(currScore)} </span>`;
}

function updatePlayerMovement(dt) {
    const lateralSpeed = 0.08 * dt * 60;
    if (playerTargetX > player.position.x + 0.01) {
        player.position.x += Math.min(lateralSpeed, playerTargetX - player.position.x);
    } else if (playerTargetX < player.position.x - 0.01) {
        player.position.x -= Math.min(lateralSpeed, player.position.x - playerTargetX);
    }
    if (playerJump && !jumpTweenActive) {
        playerJump = false;
        jumpTweenActive = true;
        gsap.to(player.position, {
            y: 2.5,
            ease: "power1.out",
            duration: 0.35,
            onComplete: () => {
                gsap.to(player.position, {
                    y: -0.5,
                    ease: "power1.in",
                    duration: 0.35,
                    onComplete: () => jumpTweenActive = false
                });
            }
        });
    }
}

function updateGameState(dt) {
    const effectiveSpeed = levelSpeed * parameters.speedModifier;
    playGround1.position.z += dt * effectiveSpeed;
    playGround2.position.z += dt * effectiveSpeed;
    playGround3.position.z += dt * effectiveSpeed;
    playGround1.updateMatrixWorld(true);
    playGround2.updateMatrixWorld(true);
    playGround3.updateMatrixWorld(true);
    updatePlayerMovement(dt);
    updateBoundingBoxes();
    if (gameStarts) {
        currScore += 0.05 * parameters.speedModifier * (dt / frameTime);
        document.getElementById("curr-score").innerHTML = `Curr score : <span> ${Math.floor(currScore)} </span>`;
        checkCollision();
    }
    regenerateGround();
}

// Animation and Effects
function updateEffects(dt, elapsedTime) {
    if (currentModel) {
        currentModel.rotation.x = Math.sin(elapsedTime) / 5;
        currentModel.position.copy(player.position);
        if (parameters.modelType === "songoku") {
            currentModel.rotation.y = -Math.PI + Math.sin(elapsedTime) / 15;
        }
    }
    [playGround1, playGround2, playGround3].forEach(pg => {
        pg.updateMatrix();
        pg.updateMatrixWorld(true);
        const rewardsGroup = pg.children[1];
        if (rewardsGroup) {
            rewardsGroup.children.forEach(reward => {
                if (reward.visible) {
                    reward.position.y = reward.userData.initialY + Math.sin(elapsedTime * 2 + reward.userData.animationOffset) * 0.15;
                    if (reward.material.uniforms && reward.material.uniforms.time) {
                        reward.material.uniforms.time.value = elapsedTime;
                    }
                    reward.rotation.y += dt * 0.5;
                    reward.updateMatrix();
                    reward.updateMatrixWorld(true);
                }
            });
        }
    });
    if (particles && parameters.particleType === "stars") {
        particles.rotation.x = -elapsedTime * 0.25;
    } else if (particles && parameters.particleType === "rain") {
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.userData.velocities;
        for (let i = 0; i < velocities.length; i++) {
            const i3 = i * 3;
            positions[i3 + 1] -= velocities[i] * dt * 60;
            positions[i3] += (Math.random() - 0.5) * 0.01;
            if (positions[i3 + 1] < -5) {
                positions[i3] = (Math.random() - 0.5) * 30;
                positions[i3 + 1] = 25 + Math.random() * 10;
                positions[i3 + 2] = (Math.random() - 0.3) * 25;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }
}

function animation() {
    requestAnimationFrame(animation);
    const elapsedTime = clock.getElapsedTime();
    let deltaTime = elapsedTime - (animation.lastTime || 0);
    animation.lastTime = elapsedTime;
    if (deltaTime > 0.1) deltaTime = 0.1;
    frameAccumulator += deltaTime;
    while (frameAccumulator >= frameTime) {
        updateGameState(frameTime);
        frameAccumulator -= frameTime;
    }
    controls.update();
    if (mixerPh) mixerPh.update(0.0075);
    if (mixerP) mixerP.update(0.05);
    updateEffects(frameTime, elapsedTime);
    renderer.render(scene, camera);
}

// Input Handling
document.onkeydown = e => {
    if (e.keyCode === 37) {
        playerTargetX = playerTargetX === 0 ? -1.75 : playerTargetX === 1.75 ? 0 : playerTargetX;
    } else if (e.keyCode === 39) {
        playerTargetX = playerTargetX === 0 ? 1.75 : playerTargetX === -1.75 ? 0 : playerTargetX;
    } else if (e.keyCode === 38 && !playerJump && !jumpTweenActive) {
        playerJump = true;
    }
};

document.addEventListener("touchstart", e => {
    if (e.touches[0]) {
        xDown = e.touches[0].clientX;
        yDown = e.touches[0].clientY;
    }
}, false);

document.addEventListener("touchmove", e => {
    if (!xDown || !yDown || !e.touches[0]) return;
    const xDiff = xDown - e.touches[0].clientX;
    const yDiff = yDown - e.touches[0].clientY;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
            playerTargetX = playerTargetX === 0 ? -1.5 : playerTargetX === 1.5 ? 0 : playerTargetX;
        } else {
            playerTargetX = playerTargetX === 0 ? 1.5 : playerTargetX === -1.5 ? 0 : playerTargetX;
        }
    } else if (yDiff > 0 && !playerJump && !jumpTweenActive) {
        playerJump = true;
    }
    xDown = null;
    yDown = null;
}, false);

// Window Resize Handler
window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});

// Start Animation
animation();
