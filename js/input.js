class InputHandler {
    constructor() {
        this.keys = {};
        this.steeringInput = 0;
        this.throttleInput = 0;
        this.brakeInput = 0;
        this.resetPressed = false;
        this.joystick = null;
        this.joystickInput = { x: 0, y: 0 };
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
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            this.updateInputs();
            
            if (event.code === 'KeyR') {
                this.resetPressed = false;
            }
        });
    }

    updateInputs() {
        // Steering (inverted)
        this.steeringInput = 0;
        if (this.keys['KeyA']) {
            this.steeringInput = 1;  // A now steers right
        }
        if (this.keys['KeyD']) {
            this.steeringInput = -1;  // D now steers left
        }
        
        // Override with joystick input if available
        if (this.joystick && Math.abs(this.joystickInput.x) > 0) {
            this.steeringInput = -this.joystickInput.x;
        }
        
        // Throttle and brake
        this.throttleInput = this.keys['KeyW'] ? 1 : 0;
        this.brakeInput = this.keys['KeyS'] ? 1 : 0;
        
        // Override with joystick input if available
        if (this.joystick) {
            if (this.joystickInput.y > 0) {
                this.throttleInput = this.joystickInput.y;
                this.brakeInput = 0;
            } else if (this.joystickInput.y < 0) {
                this.throttleInput = 0;
                this.brakeInput = -this.joystickInput.y;
            }
        }
    }

    getSteeringInput() {
        return this.steeringInput;
    }
    
    getThrottleInput() {
        return this.throttleInput;
    }
    
    getBrakeInput() {
        return this.brakeInput;
    }
    
    checkReset() {
        if (this.resetPressed) {
            this.resetPressed = false;
            return true;
        }
        return false;
    }
    
    setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);
        
        if (isMobile) {
            if (typeof VirtualJoystick !== 'undefined') {
                this.joystick = new VirtualJoystick(document.body, {
                    size: 150,
                    stickSize: 60,
                    position: 'left',
                    onMove: (value) => {
                        this.joystickInput = value;
                        this.updateInputs();
                    },
                    onRelease: () => {
                        this.joystickInput = { x: 0, y: 0 };
                        this.updateInputs();
                    }
                });
                
                const resetButton = document.createElement('button');
                resetButton.className = 'mobile-reset-button';
                resetButton.innerHTML = 'RESET';
                resetButton.style.cssText = `
                    position: absolute;
                    right: 20px;
                    bottom: 20px;
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 100, 100, 0.3);
                    border: 2px solid rgba(255, 100, 100, 0.6);
                    border-radius: 50%;
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                    z-index: 1000;
                    touch-action: none;
                `;
                
                resetButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.resetPressed = true;
                    resetButton.style.background = 'rgba(255, 100, 100, 0.6)';
                });
                
                resetButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    setTimeout(() => {
                        this.resetPressed = false;
                        resetButton.style.background = 'rgba(255, 100, 100, 0.3)';
                    }, 100);
                });
                
                document.body.appendChild(resetButton);
                
                const instructions = document.createElement('div');
                instructions.className = 'mobile-instructions';
                instructions.style.cssText = `
                    position: absolute;
                    left: 50%;
                    bottom: 180px;
                    transform: translateX(-50%);
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 12px;
                    text-align: center;
                    z-index: 999;
                `;
                instructions.innerHTML = 'Joystick: Up = Throttle, Down = Brake<br>Left/Right = Steering';
                document.body.appendChild(instructions);
            }
        }
    }
}