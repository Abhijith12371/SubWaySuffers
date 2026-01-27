# Subway Runner 🏃‍♂️💨

A high-performance, 3D endless runner game built with **Three.js** and **Vite**. Inspired by classic mobile runners, this project features a rich forest environment, animated characters, and engaging power-up mechanics.

![Game Screenshot](public/bg.png)

## 🚀 Live Demo
The game is ready for deployment on **Netlify**. Connect your repository and it will build automatically!

---

## ✨ Features

### 🕹️ Gameplay Mechanics
- **Endless Procedural Track**: The world is generated dynamically as you run, with randomized scenery and obstacles.
- **Classic Lane Movement**: Swipe or use keys to switch between three lanes.
- **Jump & Slide**: Dodge high and low obstacles with smooth, physics-based jumping and sliding.
- **Optimized Mobile Experience**: Advanced swipe detection and "Gesture Lock" ensure the game plays perfectly on smartphones without browser interference.

### ⚡ Power-ups & Scoring
- **Jet Pack**: Collect the special power-up model to take to the skies! Enjoy a 10-second flight mode with custom animations and a cinematic POV.
- **Sky Coins**: Exclusive coin trails appear in the air when flying with the Jet Pack.
- **Highscore System**: Your best run is automatically saved to your browser's local storage.
- **Difficulty Scaling**: The game speed increases gradually as your score climbs, keeping the challenge fresh.

### 🎨 Visuals & Sound
- **Animated 3D Models**: Uses high-quality FBX and GLB assets for the character, obstacles, and environment.
- **Premium UI**: Features a sleek HUD, a pulsing Game Over screen, and a **Real-time Loading Progress Bar**.
- **Immersive Audio**: Includes dynamic background music, collection SFX, and a looping flight sound effect.

---

## 🎮 Controls
| Key | Action |
|-----|--------|
| `ArrowUp` / `W` | Jump |
| `ArrowDown` / `S` | Slide |
| `ArrowLeft` / `A` | Move Left |
| `ArrowRight` / `D` | Move Right |
| **Swipe Up** | Jump |
| **Swipe Down** | Slide |
| **Swipe Left** | Move Left |
| **Swipe Right** | Move Right |

---

## 🛠️ Tech Stack
- **Engine**: [Three.js](https://threejs.org/) (WebGL)
- **Bundler**: [Vite](https://vitejs.dev/) (Fast Dev Server)
- **Programming**: Modern JavaScript (ES6+)
- **Assets**: FBX for animations, GLB/GLTF for 3D geometry.
- **Deployment**: Configured for Netlify with `netlify.toml`.

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 20 or higher recommended)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Abhijith12371/SubWaySuffers.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the local development server:
```bash
npm run dev
```

### Build for Production
Generate a minified version in the `dist/` folder:
```bash
npm run build
```

---

## 📂 Project Structure
- `src/main.js` - Core game engine and logic.
- `index.html` - Game UI and styles.
- `public/` - 3D assets, textures, and audio files.
- `netlify.toml` - Deployment configuration.
- `vite.config.js` - Build optimization settings.

---

## 🤝 Acknowledgments
- Character and animations from **Mixamo**.
- 3D assets generated with **Meshy.ai**.
- Inspired by the timeless gameplay of Subway Surfers.

---

**Happy Running!** 🏁
