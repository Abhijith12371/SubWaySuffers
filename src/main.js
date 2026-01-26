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

        this.obstacles = [];
        this.score = 0;
        this.spawnTimer = 0;
        this.difficulty = 1;

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
        this.scene.fog = new THREE.Fog(0x87ceeb, 20, 200);
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    setupCamera() {
        this.camera.position.set(0, 7, 15);
        this.camera.lookAt(0, 2, -15);
    }

    async loadAssets() {
        console.log('Loading assets...');
        const gltfLoader = new GLTFLoader();
        const fbxLoader = new FBXLoader();



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
                this.scene.add(track);
                this.tracks.push(track);
            }
        } catch (error) {
            console.error('Error loading track:', error);
        }
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3) - 1;
        const geo = new THREE.BoxGeometry(2, 2.5, 1.5);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0x992200,
            metalness: 0.8,
            roughness: 0.2
        });
        const obstacle = new THREE.Mesh(geo, mat);

        obstacle.position.set(lane * this.laneWidth, 1.25, -200);
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }

    checkCollisions() {
        if (!this.player) return;

        const playerBox = new THREE.Box3().setFromObject(this.player);
        // Slightly shrink player box for more forgiving collisions
        playerBox.expandByScalar(-0.2);

        for (let i = 0; i < this.obstacles.length; i++) {
            const obstacle = this.obstacles[i];
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);

            if (playerBox.intersectsBox(obstacleBox)) {
                this.gameOver();
                break;
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

        // Smooth lane switching
        if (this.player) {
            this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, this.targetX, 0.15);
            
            // Lock player to origin (X is handled by lane switching)
            this.player.position.y = 0;
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
