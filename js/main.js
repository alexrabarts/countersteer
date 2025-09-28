class Game {
    constructor() {
        console.log('Starting game initialization...');
        
        this.init();
        this.setupScene();
        this.setupLighting();
        this.setupCamera();
        
        console.log('Creating environment...');
        this.environment = new Environment(this.scene);
        
        console.log('Creating cones course...');
        this.cones = new Cones(this.scene, this.environment);
        
        console.log('Creating traffic...');
        this.traffic = new Traffic(this.scene, this.environment);
        
        console.log('Creating vehicle...');
        this.vehicle = new Vehicle(this.scene);
        this.vehicle.environment = this.environment; // Pass environment reference for elevation
        
        // Initialize vehicle at proper road height
        if (this.environment.roadPath && this.environment.roadPath.length > 0) {
            const startY = this.environment.roadPath[0].y || 0;
            this.vehicle.position.y = startY;
        }
        
        this.input = new InputHandler();
        
        this.clock = new THREE.Clock();
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        // High score tracking (now stores score instead of distance)
        this.highScore = parseFloat(localStorage.getItem('motorcycleHighScore') || '0');
        this.updateHighScoreDisplay();

        // Finish state
        this.finished = false;
        this.finishTime = 0;
        this.startTime = performance.now();

        console.log('Starting animation loop...');
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        document.body.appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        // Misty mountain atmosphere with layered fog effect
        this.scene.background = new THREE.Color(0x9db4c8);
        // Use exponential fog for more realistic mountain haze
        this.scene.fog = new THREE.FogExp2(0x9db4c8, 0.004);
    }

    setupLighting() {
        // Ambient light - increased for better visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Hemisphere light for natural sky/ground lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5f3a, 0.3);
        this.scene.add(hemisphereLight);

        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 80, 0);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.directionalLight.shadow.bias = -0.0001; // Reduce shadow acne
        this.scene.add(this.directionalLight);

        // Fill light from opposite side for softer shadows
        this.fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
        this.fillLight.position.set(-50, 30, 0);
        this.scene.add(this.fillLight);

        // Rim light for vehicle highlighting
        this.rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        this.rimLight.position.set(0, 10, -50);
        this.scene.add(this.rimLight);

        // Vehicle headlights
        this.leftHeadlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/6, 0.1, 2);
        this.leftHeadlight.castShadow = true;
        this.leftHeadlight.shadow.mapSize.width = 1024;
        this.leftHeadlight.shadow.mapSize.height = 1024;
        this.scene.add(this.leftHeadlight);

        this.rightHeadlight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/6, 0.1, 2);
        this.rightHeadlight.castShadow = true;
        this.rightHeadlight.shadow.mapSize.width = 1024;
        this.rightHeadlight.shadow.mapSize.height = 1024;
        this.scene.add(this.rightHeadlight);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 5, -10);
        this.camera.lookAt(0, 0, 0);
        
        // Dynamic camera offset for mountain roads
        this.baseCameraOffset = new THREE.Vector3(0, 3, -6); // Even closer view for more immersion
        this.cameraOffset = this.baseCameraOffset.clone();
        this.cameraTarget = new THREE.Vector3();
        this.currentCameraPos = this.camera.position.clone();
        this.currentLookTarget = new THREE.Vector3(0, 1, 0);
        this.cameraLerpFactor = 0.08; // Slightly faster response for mountain roads
        console.log('Camera setup complete');
    }



    updateCamera() {
        // Follow camera - keep camera behind vehicle
        const vehiclePos = this.vehicle.position.clone();
        const vehicleRotation = new THREE.Euler(0, this.vehicle.yawAngle, 0);

        // Dynamic camera offset based on lean angle for better mountain road feel
        const leanInfluence = this.vehicle.leanAngle * 2; // Shift camera opposite to lean
        this.cameraOffset.x = this.baseCameraOffset.x - leanInfluence;
        
        // Adjust height based on speed for dramatic effect
        const speedRatio = this.vehicle.speed / this.vehicle.maxSpeed;
        this.cameraOffset.y = this.baseCameraOffset.y + speedRatio * 0.5; // Slight rise with speed
        this.cameraOffset.z = this.baseCameraOffset.z - speedRatio * 1; // Move back slightly with speed

        // Calculate camera position relative to vehicle
        const offset = this.cameraOffset.clone();
        offset.applyEuler(vehicleRotation);
        const cameraPos = vehiclePos.clone().add(offset);

        // Smooth camera movement with lag
        this.currentCameraPos.lerp(cameraPos, this.cameraLerpFactor);
        this.camera.position.copy(this.currentCameraPos);

        // Dynamic FOV based on speed for immersion
        const speedFactor = this.vehicle.speed / this.vehicle.maxSpeed;
        this.camera.fov = 70 + speedFactor * 15; // 70 to 85 degrees for mountain roads
        this.camera.updateProjectionMatrix();

        // Look ahead of vehicle for better anticipation on mountain roads
        const lookAheadDistance = 3 + speedRatio * 7; // Look further ahead at speed
        const lookAhead = new THREE.Vector3(0, 0, lookAheadDistance);
        lookAhead.applyEuler(vehicleRotation);
        
        const lookTarget = this.vehicle.position.clone().add(lookAhead);
        lookTarget.y += 1;
        this.currentLookTarget.lerp(lookTarget, this.cameraLerpFactor * 1.5);
        this.camera.lookAt(this.currentLookTarget);
    }

    updateUI() {
        if (this.finished) {
            // Hide regular UI when finished
            document.getElementById('speed').style.display = 'none';
            document.getElementById('lean').style.display = 'none';
            document.getElementById('leanVel').style.display = 'none';
            document.getElementById('steering').style.display = 'none';
            document.getElementById('distance').style.display = 'none';
            document.getElementById('highScore').style.display = 'none';
            document.getElementById('fps').style.display = 'none';
            return;
        }

        document.getElementById('speed').textContent = `Speed: ${this.vehicle.getSpeed().toFixed(0)} mph`;

        const leanText = this.vehicle.crashed ?
            `CRASHED! (Press R to reset)` :
            `Lean: ${this.vehicle.getLeanAngleDegrees().toFixed(1)}°`;
        document.getElementById('lean').textContent = leanText;

        document.getElementById('leanVel').textContent = `Lean Rate: ${(this.vehicle.leanVelocity * 180 / Math.PI).toFixed(1)}°/s`;
        document.getElementById('steering').textContent = `Steering: ${this.vehicle.getSteeringAngleDegrees().toFixed(1)}°`;

        // Update distance display
        const distance = this.vehicle.getDistanceTraveled();
        document.getElementById('distance').textContent = `Distance: ${distance.toFixed(0)} m`;

        // High score is now based on finish score, not crash distance
        // Only update high score when finishing the course
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = `Best Score: ${this.highScore.toLocaleString()}`;
    }

    showFinishScreen() {
        // Calculate score based on distance and time
        const distance = this.vehicle.getDistanceTraveled();
        const timeSeconds = this.finishTime / 1000;
        const averageSpeed = distance / timeSeconds * 3.6; // km/h

        // Score formula: distance bonus + speed bonus - time penalty
        const distanceScore = distance * 10;
        const speedBonus = Math.max(0, averageSpeed - 50) * 5; // Bonus for speeds over 50 km/h
        const timePenalty = timeSeconds * 2;
        const totalScore = Math.round(distanceScore + speedBonus - timePenalty);

        // Create finish banner
        const finishBanner = document.createElement('div');
        finishBanner.id = 'finishBanner';
        finishBanner.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c3e50, #34495e);
            border: 3px solid #f39c12;
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            box-shadow: 0 0 30px rgba(0,0,0,0.8);
            animation: fadeIn 0.5s ease-out;
        `;

        finishBanner.innerHTML = `
            <h1 style="color: #f39c12; margin: 0 0 20px 0; font-size: 48px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                COURSE COMPLETE!
            </h1>
            <div style="font-size: 24px; margin-bottom: 20px;">
                <div style="margin-bottom: 10px;">Distance: <span style="color: #3498db;">${distance.toFixed(0)} meters</span></div>
                <div style="margin-bottom: 10px;">Time: <span style="color: #e74c3c;">${timeSeconds.toFixed(1)} seconds</span></div>
                <div style="margin-bottom: 10px;">Average Speed: <span style="color: #9b59b6;">${averageSpeed.toFixed(1)} km/h</span></div>
            </div>
            <div style="font-size: 36px; font-weight: bold; color: #f39c12; margin-bottom: 20px;">
                SCORE: ${totalScore.toLocaleString()}
            </div>
            <div style="font-size: 18px; color: #bdc3c7;">
                Press R to play again
            </div>
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(finishBanner);

        // Update high score if this score is better
        if (totalScore > this.highScore) {
            this.highScore = totalScore;
            localStorage.setItem('motorcycleHighScore', this.highScore.toString());
        }

        console.log(`COURSE FINISHED! Distance: ${distance.toFixed(0)}m, Time: ${timeSeconds.toFixed(1)}s, Score: ${totalScore}`);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // FPS calculation
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        }

        const deltaTime = this.clock.getDelta();
        const steeringInput = this.input.getSteeringInput();
        const throttleInput = this.input.getThrottleInput();
        const brakeInput = this.input.getBrakeInput();
        
        // Check for reset
        if (this.input.checkReset()) {
            // Remove finish banner if it exists
            const finishBanner = document.getElementById('finishBanner');
            if (finishBanner) {
                finishBanner.remove();
            }

            // High score is updated when finishing the course, not on reset

            this.vehicle.reset();
            this.cones.reset();
            this.finished = false;
            this.startTime = performance.now();

            // Show UI again
            document.getElementById('speed').style.display = 'block';
            document.getElementById('lean').style.display = 'block';
            document.getElementById('leanVel').style.display = 'block';
            document.getElementById('steering').style.display = 'block';
            document.getElementById('distance').style.display = 'block';
            document.getElementById('highScore').style.display = 'block';
            document.getElementById('fps').style.display = 'block';
        }
        
        this.vehicle.update(deltaTime, steeringInput, throttleInput, brakeInput);

        // Check for finish line crossing
        if (!this.finished && !this.vehicle.crashed && this.environment.finishLinePosition) {
            const distanceToFinish = this.vehicle.position.distanceTo(this.environment.finishLinePosition);
            if (distanceToFinish < 5) { // Within 5 units of finish line
                this.finished = true;
                this.finishTime = performance.now() - this.startTime;
                this.showFinishScreen();
            }
        }

        // Update traffic
        if (this.traffic) {
            const collision = this.traffic.update(deltaTime, this.vehicle.position);
            if (collision && collision.hit && !this.vehicle.crashed) {
                this.vehicle.crashed = true;
                this.vehicle.crashAngle = this.vehicle.leanAngle || 0.5;
                this.vehicle.frame.material.color.setHex(0xff00ff); // Magenta for traffic collision
                
                // Calculate impact direction based on car position
                const car = collision.car;
                if (car && car.carGroup) {
                    const impactDir = new THREE.Vector3(
                        this.vehicle.position.x - car.carGroup.position.x,
                        0,
                        this.vehicle.position.z - car.carGroup.position.z
                    ).normalize();
                    
                    // Combine vehicle and car speeds for impact force
                    const relativeSpeed = this.vehicle.speed + car.currentSpeed * 0.5;
                    const impactForce = Math.min(relativeSpeed * 0.3, 8);
                    
                    this.vehicle.velocity = impactDir.multiplyScalar(impactForce);
                    this.vehicle.velocity.y = 4; // Upward force from impact
                } else {
                    // Fallback if car data not available
                    const impactForce = Math.min(this.vehicle.speed * 0.3, 6);
                    this.vehicle.velocity = new THREE.Vector3(
                        Math.random() - 0.5,
                        2,
                        Math.random() - 0.5
                    ).normalize().multiplyScalar(impactForce);
                }
                
                console.log('CRASHED! Hit a car at', (this.vehicle.speed * 2.237).toFixed(1) + ' mph');
            }
        }
        
        // Check cone collisions
        if (!this.vehicle.crashed) {
            this.cones.checkCollision(this.vehicle.position);
        }
        
        this.updateCamera();
        this.updateUI();
        
        // Update directional light to follow vehicle
        this.directionalLight.position.x = this.vehicle.position.x + 50;
        this.directionalLight.position.z = this.vehicle.position.z;
        this.directionalLight.target.position.copy(this.vehicle.position);
        this.directionalLight.target.updateMatrixWorld();

        // Subtle intensity variation for natural lighting
        const time = performance.now() * 0.001;
        this.directionalLight.intensity = 0.8 + Math.sin(time * 0.1) * 0.05;

        // Update headlights
        const headlightOffset = new THREE.Vector3(0, 0.5, 0.7);
        headlightOffset.applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0));

        this.leftHeadlight.position.copy(this.vehicle.position).add(new THREE.Vector3(-0.3, 0, 0).applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0))).add(headlightOffset);
        this.rightHeadlight.position.copy(this.vehicle.position).add(new THREE.Vector3(0.3, 0, 0).applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0))).add(headlightOffset);

        const targetOffset = new THREE.Vector3(0, 0, 50);
        targetOffset.applyEuler(new THREE.Euler(0, this.vehicle.yawAngle, 0));

        this.leftHeadlight.target.position.copy(this.vehicle.position).add(targetOffset);
        this.rightHeadlight.target.position.copy(this.vehicle.position).add(targetOffset);

        this.leftHeadlight.target.updateMatrixWorld();
        this.rightHeadlight.target.updateMatrixWorld();

        // Update rim light to follow behind vehicle
        this.rimLight.position.set(this.vehicle.position.x, 10, this.vehicle.position.z - 50);

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});