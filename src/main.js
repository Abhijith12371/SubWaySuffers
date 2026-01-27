import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.mixer = null;
        this.player = null;
        this.tracks = [];
        this.trackSpeed = 0.5;
        this.laneWidth = 3;
        this.currentLane = 0; // -1: left, 0: center, 1: right
        this.targetX = 0;
        this.isGameOver = false;
        this.isGameStarted = false;

        // Jump and slide mechanics
        this.isJumping = false;
        this.isSliding = false;
        this.jumpVelocity = 0;
        this.gravity = -0.045;
        this.slideTimer = 0;
        this.slideDuration = 0.5;

        this.obstacles = [];
        this.score = 0;
        this.spawnTimer = 0;
        this.difficulty = 1;
        this.coins = [];
        this.collectedCoins = 0;

        this.init();
    }

    async init() {
        this.setupLights();
        this.setupCamera();
        await this.loadAssets();
        this.setupControls();
        this.setupUI();
        this.animate();
    }

    setupUI() {
        this.scoreElement = document.getElementById('ui');
        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('start-btn');
        this.title = document.getElementById('title');
        this.finalScore = document.getElementById('final-score');

        this.startBtn.addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        this.isGameStarted = true;
        this.isGameOver = false;
        this.score = 0;
        this.trackSpeed = 0.5;
        this.currentLane = 0;
        this.targetX = 0;
        this.overlay.classList.add('hidden');
        this.finalScore.classList.add('hidden');
        this.title.innerText = "RUNNER GAME";

        // Remove existing obstacles
        this.obstacles.forEach(obs => this.scene.remove(obs));
        this.obstacles = [];

        if (this.player) {
            this.player.position.set(0, 0, 0);
        }
    }

    setupLights() {
        // Strong ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Natural environment lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        // Directional light for shadows and definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 15, 5);
        this.scene.add(directionalLight);

        // Background and Fog
        // Background and Fog
        this.scene.fog = new THREE.Fog(0x87ceeb, 20, 200);
        // Background will be set in loadAssets if bg.png exists
        // this.scene.background = new THREE.Color(0x87ceeb);
    }

    setupCamera() {
        this.camera.position.set(0, 7, 15);
        this.camera.lookAt(0, 2, -15);
    }

    async loadAssets() {
        console.log('Loading assets...');
        const gltfLoader = new GLTFLoader();
        const fbxLoader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();

        // Load Background Image
        textureLoader.load('/bg.png', (texture) => {
            console.log('Background image loaded');
            this.scene.background = texture;
        }, undefined, (err) => {
            console.warn('Could not load bg.png, using color fallback', err);
            this.scene.background = new THREE.Color(0x87ceeb);
        });

        // Pre-allocate Geometries and Materials for Performance
        this.commonBoxGeo = new THREE.BoxGeometry(2, 2.5, 1.5);
        this.commonObstacleMat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0x992200,
            metalness: 0.8,
            roughness: 0.2
        });
        this.highBarrierGeo = new THREE.BoxGeometry(this.laneWidth, 2, 1);
        this.highBarrierMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0x551100 });
        this.lowBarrierGeo = new THREE.BoxGeometry(2, 2.5, 1.5);

        // Coin Assets (Cached)
        this.coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
        this.coinGeo.rotateX(Math.PI / 2); // Make it face player
        this.coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 1.0,
            roughness: 0.3,
            emissive: 0xaa8800,
            emissiveIntensity: 0.4
        });




        // Load Player
        try {
            const fbx = await new Promise((resolve, reject) => {
                fbxLoader.load('/run.fbx', resolve, undefined, reject);
            });
            this.player = fbx;
            this.player.scale.set(0.015, 0.015, 0.015);
            this.player.position.set(0, 0, 0);
            this.player.rotation.y = Math.PI;
            this.scene.add(this.player);

            if (fbx.animations && fbx.animations.length > 0) {
                console.log('Found animations:', fbx.animations.map(a => `${a.name} (${a.duration}s)`));
                this.mixer = new THREE.AnimationMixer(this.player);
                // Use the first animation or find one named 'run'
                const clip = fbx.animations.find(a => a.name.toLowerCase().includes('run')) || fbx.animations[0];
                this.runAction = this.mixer.clipAction(clip);
                this.runAction.setLoop(THREE.LoopRepeat);
                this.runAction.play();
            }
        } catch (error) {
            console.error('Error loading player:', error);
        }

        // Load Track segments
        try {
            const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load('/track.glb', resolve, undefined, reject);
            });

            this.trackModel = gltf.scene;
            this.trackModel.scale.set(15, 15, 15);

            // Calculate length of track segment
            const bbox = new THREE.Box3().setFromObject(this.trackModel);
            this.trackLength = Math.abs(bbox.max.z - bbox.min.z);
            console.log('Track segment length:', this.trackLength);

            // Adjust length for slight overlap to hide gaps
            this.spacing = this.trackLength - 0.2;

            for (let i = 0; i < 12; i++) {
                const track = this.trackModel.clone();
                track.position.z = -i * this.spacing;
                this.addScenery(track);
                this.scene.add(track);
                this.tracks.push(track);
            }
        } catch (error) {
            console.error('Error loading track:', error);
        }

        // Load Obstacle Model
        try {
            const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load('/Meshy_AI_A_single_broken_concr_0126215832_texture.glb', resolve, undefined, reject);
            });
            this.obstacleTemplate = gltf.scene;
            this.obstacleTemplate.scale.set(3, 3, 3);
            // Center the model
            const box = new THREE.Box3().setFromObject(this.obstacleTemplate);
            const center = box.getCenter(new THREE.Vector3());
            this.obstacleTemplate.position.sub(center);
            console.log('Obstacle model loaded');
        } catch (error) {
            console.error('Error loading obstacle model:', error);
        }

        // Load Environment Model
        try {
            const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load('/Meshy_AI_A_stylized_forest_can_0126222443_texture.glb', resolve, undefined, reject);
            });
            this.envTemplate = gltf.scene;
            this.envTemplate.scale.set(5, 5, 5);

            // Center the environment model !!!
            const box = new THREE.Box3().setFromObject(this.envTemplate);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            this.envTemplate.position.sub(center);

            console.log(`Env Model Loaded. Size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);

            // Pre-scale if it's tiny
            // If height is less than 1 unit, it's likely microscopic (cm/mm scale issue)
            if (size.y < 1) {
                console.log('Model is tiny, applying base scale 10');
                this.envTemplate.scale.set(10, 10, 10);
            } else {
                this.envTemplate.scale.set(5, 5, 5);
            }
        } catch (error) {
            console.error('Error loading environment model:', error);
        }
    }

    addScenery(track) {
        // Track segments are scaled by 15. Create a container for scenery that we will 'un-scale'
        const sceneryGroup = new THREE.Group();
        sceneryGroup.scale.set(1 / 15, 1 / 15, 1 / 15);
        track.add(sceneryGroup);

        // Add forest environment on both sides
        if (this.envTemplate) {
            for (let i = 0; i < 4; i++) {
                const side = (i % 2 === 0) ? 1 : -1;
                const zPos = (Math.random() - 0.5) * this.trackLength;
                const forest = this.envTemplate.clone();
                // Match the scale and position logic
                forest.scale.set(2.5, 2.5, 2.5);
                forest.position.set(side * 25, 0, zPos * 15);
                forest.rotation.y = Math.random() * Math.PI * 2;
                sceneryGroup.add(forest);

            }
        }
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3) - 1;
        const type = Math.random();

        let obstacle;
        if (this.obstacleTemplate) {
            obstacle = this.obstacleTemplate.clone();

            if (type < 0.4) {
                // Standard obstacle
                obstacle.scale.set(4, 4, 4);
                obstacle.position.set(lane * this.laneWidth, 1.0, -200);
            } else if (type < 0.7) {
                // High barrier (jump over)
                // Use cached geometry/material
                obstacle = new THREE.Mesh(this.highBarrierGeo, this.highBarrierMat);
                obstacle.position.set(lane * this.laneWidth, 3.5, -200);
            } else {
                // Low barrier (slide under)
                obstacle.scale.set(3, 1.5, 3);
                obstacle.position.set(lane * this.laneWidth, 0.4, -200);
            }
        } else {
            // Fallback to box if model not loaded - USE CACHED
            obstacle = new THREE.Mesh(this.commonBoxGeo, this.commonObstacleMat);
            obstacle.position.set(lane * this.laneWidth, 1.25, -200);
        }

        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }

    spawnCoins() {
        // 30% chance to spawn a coin group instead of nothing (separate from obstacles)
        if (Math.random() > 0.3) return;

        const lane = Math.floor(Math.random() * 3) - 1;
        const zStart = -200;

        // Spawn a line of 3-5 coins
        const count = 3 + Math.floor(Math.random() * 3);
        const yPos = Math.random() > 0.5 ? 1.0 : 3.5; // Ground or Air (jump to collect)

        for (let i = 0; i < count; i++) {
            const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
            coin.position.set(lane * this.laneWidth, yPos, zStart - (i * 3));

            this.scene.add(coin);
            this.coins.push(coin);
        }
    }

    checkCollisions() {
        if (!this.player) return;

        // Optimized Collision: Check distance instead of computing Box3 every frame
        const playerLane = this.currentLane; // -1, 0, 1
        const playerZ = this.player.position.z; // usually 0
        const playerY = this.player.position.y; // 0 to ~2-3 when jumping

        for (let i = 0; i < this.obstacles.length; i++) {
            const obstacle = this.obstacles[i];

            // 1. Z-Depth Check (Are we close enough?)
            // Obstacles move from -200 towards +20. Player is at 0.
            if (obstacle.position.z > -2 && obstacle.position.z < 2) {

                // 2. Lane Check (Are we in the same lane?)
                // Helper to find obstacle lane based on X position
                // Lane widths are 3. Lane centers: -3, 0, 3.
                // We can just check abs difference in X.
                if (Math.abs(obstacle.position.x - this.player.position.x) < 2.0) {

                    // 3. Height Check (Is collision avoidable by jumping/sliding?)
                    // This depends on obstacle type.
                    // For now, let's assume any overlap is a hit unless jump/slide logic handles it.
                    // Standard (y=1): Hits if playerY < 2?
                    // High (y=3.5): Hits if playerY > 1 (Jumping hits it? No, High barrier needs slide?)
                    // Low (y=0.4): Hits if not jumping?

                    // Simplified: Just use a vertical distance check
                    // Player center is roughly y=1. Obstacle center varies.
                    if (Math.abs(obstacle.position.y - (playerY + 1)) < 2.0) {
                        this.gameOver();
                        break;
                    }
                }
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.isGameStarted = false;

        this.title.innerText = "GAME OVER";
        this.finalScore.innerText = `Final Score: ${Math.floor(this.score)}`;
        this.finalScore.classList.remove('hidden');
        this.startBtn.innerText = "RESTART";
        this.overlay.classList.remove('hidden');
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            if (this.isGameOver || !this.isGameStarted) return;

            if (e.key === 'ArrowLeft' || e.key === 'a') {
                if (this.currentLane > -1) {
                    this.currentLane--;
                    this.targetX = this.currentLane * this.laneWidth;
                }
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                if (this.currentLane < 1) {
                    this.currentLane++;
                    this.targetX = this.currentLane * this.laneWidth;
                }
            } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !this.isJumping && !this.isSliding) {
                this.isJumping = true;
                this.jumpVelocity = 0.7;
            } else if ((e.key === 'ArrowDown' || e.key === 's') && !this.isJumping && !this.isSliding) {
                this.isSliding = true;
                this.slideTimer = this.slideDuration;
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    update() {
        if (this.isGameOver || !this.isGameStarted) return;

        const delta = this.clock.getDelta();
        if (this.mixer) {
            this.mixer.update(delta);
            if (this.runAction) {
                // Adjust animation speed to match track speed (base 0.5 -> timeScale 1.0)
                this.runAction.timeScale = this.trackSpeed * 2.0;
            }
        }

        // Update score
        this.score += delta * 10;
        if (this.scoreElement) {
            this.scoreElement.innerText = `Score: ${Math.floor(this.score)}`;
        }

        // Difficulty increases over time
        this.trackSpeed = 0.5 + (this.score / 1000);

        // Move tracks backward to simulate forward movement
        if (this.spacing) {
            this.tracks.forEach(track => {
                track.position.z += this.trackSpeed;
                if (track.position.z > this.spacing * 2) { // Wait until well behind camera
                    track.position.z -= this.tracks.length * this.spacing;
                }
            });
        }

        // Spawn obstacles
        this.spawnTimer += delta;
        if (this.spawnTimer > 1.5 / this.trackSpeed) {
            this.spawnObstacle();
            this.spawnCoins(); // Spawn coins!
            this.spawnTimer = 0;
        }

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.position.z += this.trackSpeed;

            if (obs.position.z > 20) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }

        // Move and Animate Coins
        const playerY = this.player ? this.player.position.y : 0;

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.position.z += this.trackSpeed;
            coin.rotation.y += delta * 3; // Spin animation

            // Remove if passed
            if (coin.position.z > 20) {
                this.scene.remove(coin);
                this.coins.splice(i, 1);
                continue;
            }

            // Coin Collection Logic
            if (coin.position.z > -1 && coin.position.z < 1) { // Z check
                // X check (Lane width is 3)
                if (Math.abs(coin.position.x - this.player.position.x) < 1.0) {
                    // Y Check (Coin is 1.0 or 3.5)
                    if (Math.abs(coin.position.y - (playerY + 1)) < 2.0) {
                        // Collect!
                        this.scene.remove(coin);
                        this.coins.splice(i, 1);
                        this.collectedCoins++;

                        // UI Update
                        if (this.coinScoreElement) {
                            this.coinScoreElement.innerText = `Coins: ${this.collectedCoins}`;
                        } else {
                            // Try to find element again or log
                            const el = document.getElementById('coin-score');
                            if (el) {
                                this.coinScoreElement = el;
                                this.coinScoreElement.innerText = `Coins: ${this.collectedCoins}`;
                            } else {
                                console.log('Coin collected:', this.collectedCoins);
                            }
                        }
                    }
                }
            }
        }
        // Jump Physics
        if (this.isJumping) {
            this.player.position.y += this.jumpVelocity;
            this.jumpVelocity += this.gravity;
            if (this.player.position.y <= 0) {
                this.player.position.y = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }

        // Slide Physics
        if (this.isSliding) {
            this.slideTimer -= delta;
            // Procedural slide: squash the player
            this.player.scale.y = 0.0075;
            this.player.position.y = 0;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.player.scale.y = 0.015;
            }
        } else if (!this.isJumping) {
            this.player.scale.y = 0.015;
        }

        // Smooth lane switching
        if (this.player) {
            this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, this.targetX, 0.15);

            // Lock player Z position (Y is handled by jump/slide)
            this.player.position.z = 0;

            // Prevent root motion drift: traverse model and lock any bones that might be moving 
            // the whole character (usually 'Hips' or the root mesh)
            this.player.traverse(obj => {
                if (obj.isBone && (obj.name.toLowerCase().includes('hips') || obj.name.toLowerCase().includes('root'))) {
                    obj.position.x = 0;
                    obj.position.z = 0;
                }
            });

            // Camera follow (slightly behind)
            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x, 0.05);
        }

        this.checkCollisions();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
