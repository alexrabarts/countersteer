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
        
        console.log('Creating vehicle...');
        this.vehicle = new Vehicle(this.scene);
        this.input = new InputHandler();
        
        this.clock = new THREE.Clock();
        
        console.log('Starting animation loop...');
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        // Sky blue background with distance fog
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 200, 800);
    }

    setupLighting() {
        // Ambient light - increased for better visibility
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 50, 0);
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
        this.cameraOffset = new THREE.Vector3(0, 4, -10); // Slightly higher and further back
        this.cameraTarget = new THREE.Vector3();
        this.currentCameraPos = this.camera.position.clone();
        this.currentLookTarget = new THREE.Vector3(0, 1, 0);
        this.cameraLerpFactor = 0.05; // Smooth lag
        console.log('Camera setup complete');
    }



    updateCamera() {
        // Follow camera - keep camera behind vehicle
        const vehiclePos = this.vehicle.position.clone();
        const vehicleRotation = new THREE.Euler(0, this.vehicle.yawAngle, 0);

        // Calculate camera position relative to vehicle
        const offset = this.cameraOffset.clone();
        offset.applyEuler(vehicleRotation);
        const cameraPos = vehiclePos.clone().add(offset);

        // Smooth camera movement with lag
        this.currentCameraPos.lerp(cameraPos, this.cameraLerpFactor);
        this.camera.position.copy(this.currentCameraPos);

        // Look at vehicle with lag
        const lookTarget = this.vehicle.position.clone();
        lookTarget.y += 1;
        this.currentLookTarget.lerp(lookTarget, this.cameraLerpFactor);
        this.camera.lookAt(this.currentLookTarget);
    }

    updateUI() {
        document.getElementById('speed').textContent = `Speed: ${this.vehicle.getSpeed().toFixed(0)} km/h`;
        
        const leanText = this.vehicle.crashed ? 
            `CRASHED! (Press R to reset)` : 
            `Lean: ${this.vehicle.getLeanAngleDegrees().toFixed(1)}°`;
        document.getElementById('lean').textContent = leanText;
        
        document.getElementById('leanVel').textContent = `Lean Rate: ${(this.vehicle.leanVelocity * 180 / Math.PI).toFixed(1)}°/s`;
        document.getElementById('steering').textContent = `Steering: ${this.vehicle.getSteeringAngleDegrees().toFixed(1)}°`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        const steeringInput = this.input.getSteeringInput();
        const throttleInput = this.input.getThrottleInput();
        const brakeInput = this.input.getBrakeInput();
        
        // Check for reset
        if (this.input.checkReset()) {
            this.vehicle.reset();
            this.cones.reset();
        }
        
        this.vehicle.update(deltaTime, steeringInput, throttleInput, brakeInput);
        
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