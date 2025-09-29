class InputHandler {
    constructor() {
        this.keys = {};
        this.steeringInput = 0;
        this.targetSteeringInput = 0;
        this.throttleInput = 0;
        this.brakeInput = 0;
        this.wheelieInput = 0;
        this.resetPressed = false;
        this.soundTogglePressed = false;
        this.checkpointRestartPressed = false;
        this.virtualControls = null;
        this.steeringSmoothing = 0.4; // How quickly steering ramps up (0-1, higher = faster)
        this.setupEventListeners();
        this.setupMobileControls();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            this.updateInputs();
            
            // Check for reset
            if (event.code === 'KeyR') {
                this.resetPressed = true;
            }

            // Check for sound toggle
            if (event.code === 'KeyM') {
                this.soundTogglePressed = true;
            }

            // Check for checkpoint restart
            if (event.code === 'KeyC') {
                this.checkpointRestartPressed = true;
                console.log('C key pressed - checkpoint restart triggered');
            }

            // Test key to force falling
            if (event.code === 'KeyF') {
                console.log('F key pressed - forcing fall test');
                // This will be handled in main.js
            }
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            this.updateInputs();
            
            if (event.code === 'KeyR') {
                this.resetPressed = false;
            }

            if (event.code === 'KeyM') {
                this.soundTogglePressed = false;
            }

            if (event.code === 'KeyC') {
                this.checkpointRestartPressed = false;
            }
        });
    }

    updateInputs() {
        // Check both keyboard and virtual controls
        // WASD keys
        const keyA = this.keys['KeyA'] || (this.virtualControls && this.virtualControls.getKey('KeyA'));
        const keyD = this.keys['KeyD'] || (this.virtualControls && this.virtualControls.getKey('KeyD'));
        const keyW = this.keys['KeyW'] || (this.virtualControls && this.virtualControls.getKey('KeyW'));
        const keyS = this.keys['KeyS'] || (this.virtualControls && this.virtualControls.getKey('KeyS'));

        // Arrow keys
        const keyLeft = this.keys['ArrowLeft'];
        const keyRight = this.keys['ArrowRight'];
        const keyUp = this.keys['ArrowUp'];
        const keyDown = this.keys['ArrowDown'];

        // Steering (inverted) - combine WASD and arrow keys
        // Set target steering value
        this.targetSteeringInput = 0;
        if (keyA || keyLeft) {
            this.targetSteeringInput = 1;  // A/Left now steers right
        }
        if (keyD || keyRight) {
            this.targetSteeringInput = -1;  // D/Right now steers left
        }

        // Smooth steering towards target
        this.steeringInput = this.steeringInput + (this.targetSteeringInput - this.steeringInput) * this.steeringSmoothing;

        // Throttle and brake - combine WASD and arrow keys
        this.throttleInput = (keyW || keyUp) ? 1 : 0;
        this.brakeInput = (keyS || keyDown) ? 1 : 0;
        
        // Wheelie input - Shift key or Space key
        this.wheelieInput = (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['Space']) ? 1 : 0;
    }

    getSteeringInput() {
        // Update inputs before returning (for virtual controls and smoothing)
        this.updateInputs();
        return this.steeringInput;
    }
    
    getThrottleInput() {
        // Update inputs before returning (for virtual controls)
        if (this.virtualControls) {
            this.updateInputs();
        }
        return this.throttleInput;
    }
    
    getBrakeInput() {
        // Update inputs before returning (for virtual controls)
        if (this.virtualControls) {
            this.updateInputs();
        }
        return this.brakeInput;
    }
    
    getWheelieInput() {
        // Update inputs before returning
        if (this.virtualControls) {
            this.updateInputs();
        }
        return this.wheelieInput;
    }
    
    checkReset() {
        // Check virtual control reset button
        if (this.virtualControls && this.virtualControls.getKey('KeyR')) {
            this.virtualControls.touches['KeyR'] = false; // Clear after use
            return true;
        }

        if (this.resetPressed) {
            this.resetPressed = false;
            return true;
        }
        return false;
    }

    checkSoundToggle() {
        if (this.soundTogglePressed) {
            this.soundTogglePressed = false;
            return true;
        }
        return false;
    }

    checkCheckpointRestart() {
        if (this.checkpointRestartPressed) {
            this.checkpointRestartPressed = false;
            console.log('Checkpoint restart triggered');
            return true;
        }
        return false;
    }
    
    setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);
        
        if (isMobile) {
            if (typeof VirtualControls !== 'undefined') {
                this.virtualControls = new VirtualControls();
            }
        }
    }
}