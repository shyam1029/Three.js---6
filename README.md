# Three.js---6
# AetherRush

AetherRush is an immersive 3D endless runner game built with Three.js, where players navigate a fantastical skyworld, dodging clouds and collecting glowing orbs to rack up points. With dynamic environments, customizable characters, and a sleek futuristic interface, it’s a thrilling blend of art and code. Control your character using arrow keys or touch gestures, and experience seamless gameplay across desktop and mobile devices.

## Features

- **Dynamic Gameplay**: Avoid procedurally generated clouds and collect orbs to boost your score.
- **Customizable Experience**: Switch between three unique character models (Phoenix, Pegasus, Son Goku) and toggle between morning, evening, and night environments.
- **Responsive Design**: Optimized for both desktop and mobile with touch and keyboard controls.
- **Immersive Visuals**: Powered by Three.js with custom shaders for clouds, rewards, and celestial bodies (moon and sun).
- **Interactive UI**: Futuristic sidebar for real-time game settings and a glowing progress bar for asset loading.
- **Smooth Animations**: GSAP-driven player jumps and Three.js animations for character models.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules)
- **3D Graphics**: Three.js (r172), GLTFLoader for 3D models
- **Animation**: GSAP for player movements, Three.js AnimationMixer for model animations
- **Styling**: Custom CSS with Montserrat and Exo 2 fonts, futuristic design with glow effects
- **Assets**: Custom 3D models (.glb), particle textures, and background images
- **Other Libraries**: OrbitControls for camera, lil-gui for debug interface

### Gameplay Instructions

- **Start the Game**: Click the "Click to Start" button on the menu screen.
- **Controls**:
  - **Keyboard**: 
    - Left Arrow (←): Move left
    - Right Arrow (→): Move right
    - Up Arrow (↑): Jump
  - **Touch**:
    - Swipe left/right: Move left or right
    - Swipe up: Jump
- **Objective**: Dodge clouds, collect orbs, and survive as long as possible to increase your score.
- **Settings**: Use the sidebar to switch character models or change the time of day for different visuals.

## Project Structure

```
aetherrush/
├── assets/
│   ├── images/           # Background images and particle textures
│   └── models/           # 3D models (.glb files)
├── index.html            # Main HTML file
├── style.css             # Styling for UI and game elements
├── main.js               # Game logic, Three.js setup, and animations
```

## Future Enhancements

- Implement a high-score leaderboard using local storage or a backend.
- Introduce power-ups or new obstacles for varied gameplay.
- Optimize performance for lower-end devices by reducing particle counts or simplifying shaders.

Please ensure your code follows the existing style and includes comments for clarity.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Three.js](https://threejs.org/) for the powerful 3D rendering engine.
- [GSAP](https://greensock.com/gsap/) for smooth animations.
- [Exo 2](https://fonts.google.com/specimen/Exo+2) and [Montserrat](https://fonts.google.com/specimen/Montserrat) fonts for the futuristic UI.
- 3D model creators for Phoenix, Pegasus, and Son Goku assets.

---

Built with ☕ and ✨ by Syam satish. Check out the live demo [here](https://shyam1029.github.io/Three.js---6/)!
