class VirtualControls {
    constructor() {
        this.touches = {
            KeyW: false,
            KeyA: false,
            KeyS: false,
            KeyD: false,
            KeyR: false,
            Space: false
        };

        this.buttons = {}; // Store button elements for highlighting

        this.createControls();
    }
    
    createControls() {
        // Calculate responsive sizes based on viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const isMobileLandscape = viewportWidth > viewportHeight && viewportHeight < 500;

        // Adjust button size based on screen size - smaller for desktop
        const buttonSize = isMobileLandscape ? 50 : Math.min(50, viewportHeight * 0.06);
        const gap = 5;
        const controlsHeight = (buttonSize + gap) * 2;
        const controlsWidth = (buttonSize + gap) * 4; // Increased width for Space button

        // Calculate safe bottom position to ensure controls fit in viewport
        const safeBottomMargin = Math.min(20, viewportHeight * 0.02);
        const bottomPosition = safeBottomMargin;
        
        // Create container for controls
        const container = document.createElement('div');
        container.className = 'virtual-controls';
        container.style.cssText = `
            position: fixed;
            bottom: ${bottomPosition}px;
            left: ${safeBottomMargin}px;
            z-index: 1000;
            touch-action: none;
            user-select: none;
            height: ${controlsHeight}px;
            width: ${controlsWidth}px;
        `;
        
        // WASD + Space layout positions - Y coordinates inverted (bottom-up positioning)
        const buttons = [
            { key: 'KeyW', label: 'W', x: buttonSize + gap, y: buttonSize + gap },
            { key: 'KeyA', label: 'A', x: 0, y: 0 },
            { key: 'KeyS', label: 'S', x: buttonSize + gap, y: 0 },
            { key: 'KeyD', label: 'D', x: (buttonSize + gap) * 2, y: 0 },
            { key: 'Space', label: 'SPACE', x: (buttonSize + gap) * 3, y: 0 } // Space for clutch pop
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('div');
            button.className = 'virtual-button';
            button.innerHTML = btn.label;
            
            // Special styling for Space button
            const isSpaceButton = btn.key === 'Space';
            const buttonHeight = isSpaceButton ? buttonSize * 2 + gap : buttonSize;
            
            button.style.cssText = `
                position: absolute;
                width: ${buttonSize}px;
                height: ${buttonHeight}px;
                left: ${btn.x}px;
                bottom: ${btn.y}px;
                background: ${isSpaceButton ? 'rgba(255, 200, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
                border: 2px solid ${isSpaceButton ? 'rgba(255, 200, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)'};
                border-radius: 10px;
                color: ${isSpaceButton ? '#ffc800' : 'white'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${isSpaceButton ? Math.floor(buttonSize * 0.22) : Math.floor(buttonSize * 0.35)}px;
                font-weight: bold;
                font-family: monospace;
                cursor: pointer;
                transition: background 0.1s;
            `;

            // Store button reference
            this.buttons[btn.key] = button;
            
            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touches[btn.key] = true;
                if (isSpaceButton) {
                    button.style.background = 'rgba(255, 200, 0, 0.4)';
                    button.style.borderColor = 'rgba(255, 200, 0, 0.7)';
                } else {
                    button.style.background = 'rgba(255, 255, 255, 0.3)';
                    button.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                }
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touches[btn.key] = false;
                if (isSpaceButton) {
                    button.style.background = 'rgba(255, 200, 0, 0.1)';
                    button.style.borderColor = 'rgba(255, 200, 0, 0.4)';
                } else {
                    button.style.background = 'rgba(255, 255, 255, 0.1)';
                    button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }
            });
            
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.touches[btn.key] = false;
                if (isSpaceButton) {
                    button.style.background = 'rgba(255, 200, 0, 0.1)';
                    button.style.borderColor = 'rgba(255, 200, 0, 0.4)';
                } else {
                    button.style.background = 'rgba(255, 255, 255, 0.1)';
                    button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }
            });
            
            // Mouse events for testing
            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.touches[btn.key] = true;
                button.style.background = 'rgba(255, 255, 255, 0.3)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            });
            
            button.addEventListener('mouseup', (e) => {
                e.preventDefault();
                this.touches[btn.key] = false;
                button.style.background = 'rgba(255, 255, 255, 0.1)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            });
            
            button.addEventListener('mouseleave', (e) => {
                this.touches[btn.key] = false;
                button.style.background = 'rgba(255, 255, 255, 0.1)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            });
            
            container.appendChild(button);
        });
        
        // Camera button (Z) - position it above the reset button
        const cameraButtonSize = isMobileLandscape ? 60 : Math.min(80, viewportHeight * 0.09);
        const cameraButton = document.createElement('div');
        cameraButton.className = 'virtual-button-camera';
        cameraButton.innerHTML = 'Z';
        cameraButton.style.cssText = `
            position: fixed;
            bottom: ${bottomPosition + cameraButtonSize + 10}px;
            right: ${safeBottomMargin}px;
            width: ${cameraButtonSize}px;
            height: ${cameraButtonSize}px;
            background: rgba(100, 200, 255, 0.2);
            border: 2px solid rgba(100, 200, 255, 0.4);
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.floor(cameraButtonSize * 0.35)}px;
            font-weight: bold;
            font-family: monospace;
            z-index: 1000;
            cursor: pointer;
            touch-action: none;
            user-select: none;
            transition: background 0.1s;
        `;

        // Store camera button reference
        this.buttons['KeyZ'] = cameraButton;
        
        cameraButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touches['KeyZ'] = true;
            cameraButton.style.background = 'rgba(100, 200, 255, 0.5)';
            cameraButton.style.borderColor = 'rgba(100, 200, 255, 0.7)';
        });
        
        cameraButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            setTimeout(() => {
                this.touches['KeyZ'] = false;
                cameraButton.style.background = 'rgba(100, 200, 255, 0.2)';
                cameraButton.style.borderColor = 'rgba(100, 200, 255, 0.4)';
            }, 100);
        });
        
        cameraButton.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.touches['KeyZ'] = false;
            cameraButton.style.background = 'rgba(100, 200, 255, 0.2)';
            cameraButton.style.borderColor = 'rgba(100, 200, 255, 0.4)';
        });
        
        // Mouse events for testing
        cameraButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.touches['KeyZ'] = true;
            cameraButton.style.background = 'rgba(100, 200, 255, 0.5)';
            cameraButton.style.borderColor = 'rgba(100, 200, 255, 0.7)';
        });
        
        cameraButton.addEventListener('mouseup', (e) => {
            e.preventDefault();
            setTimeout(() => {
                this.touches['KeyZ'] = false;
                cameraButton.style.background = 'rgba(100, 200, 255, 0.2)';
                cameraButton.style.borderColor = 'rgba(100, 200, 255, 0.4)';
            }, 100);
        });

        // Reset button on the right
        const resetButtonSize = isMobileLandscape ? 60 : Math.min(80, viewportHeight * 0.09);
        const resetButton = document.createElement('div');
        resetButton.className = 'virtual-button-reset';
        resetButton.innerHTML = 'R';
        resetButton.style.cssText = `
            position: fixed;
            bottom: ${bottomPosition}px;
            right: ${safeBottomMargin}px;
            width: ${resetButtonSize}px;
            height: ${resetButtonSize}px;
            background: rgba(255, 100, 100, 0.2);
            border: 2px solid rgba(255, 100, 100, 0.4);
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.floor(resetButtonSize * 0.35)}px;
            font-weight: bold;
            font-family: monospace;
            z-index: 1000;
            cursor: pointer;
            touch-action: none;
            user-select: none;
            transition: background 0.1s;
        `;

        // Store reset button reference
        this.buttons['KeyR'] = resetButton;
        
        resetButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touches['KeyR'] = true;
            resetButton.style.background = 'rgba(255, 100, 100, 0.5)';
            resetButton.style.borderColor = 'rgba(255, 100, 100, 0.7)';
        });
        
        resetButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            setTimeout(() => {
                this.touches['KeyR'] = false;
                resetButton.style.background = 'rgba(255, 100, 100, 0.2)';
                resetButton.style.borderColor = 'rgba(255, 100, 100, 0.4)';
            }, 100);
        });
        
        resetButton.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.touches['KeyR'] = false;
            resetButton.style.background = 'rgba(255, 100, 100, 0.2)';
            resetButton.style.borderColor = 'rgba(255, 100, 100, 0.4)';
        });
        
        // Mouse events for testing
        resetButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.touches['KeyR'] = true;
            resetButton.style.background = 'rgba(255, 100, 100, 0.5)';
            resetButton.style.borderColor = 'rgba(255, 100, 100, 0.7)';
        });
        
        resetButton.addEventListener('mouseup', (e) => {
            e.preventDefault();
            setTimeout(() => {
                this.touches['KeyR'] = false;
                resetButton.style.background = 'rgba(255, 100, 100, 0.2)';
                resetButton.style.borderColor = 'rgba(255, 100, 100, 0.4)';
            }, 100);
        });
        
        document.body.appendChild(container);
        document.body.appendChild(cameraButton);
        document.body.appendChild(resetButton);
        
        // Instructions - position above controls
        const instructionsBottom = bottomPosition + controlsHeight + 10;
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: ${Math.min(instructionsBottom, viewportHeight - 50)}px;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.6);
            font-size: ${isMobileLandscape ? '10px' : '12px'};
            text-align: center;
            z-index: 999;
            font-family: monospace;
            pointer-events: none;
        `;
        instructions.innerHTML = 'W: Throttle | S: Brake<br>A/D: Steering | R: Reset | Z: Camera';
        document.body.appendChild(instructions);
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.destroy();
                this.createControls();
            }, 100);
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.destroy();
                this.createControls();
            }, 250);
        });
    }
    
    getKey(keyCode) {
        return this.touches[keyCode] || false;
    }

    highlightKey(keyCode, active) {
        const button = this.buttons[keyCode];
        if (button) {
            if (active) {
                button.style.background = keyCode === 'KeyR' ? 'rgba(255, 100, 100, 0.5)' : 'rgba(255, 255, 255, 0.3)';
                button.style.borderColor = keyCode === 'KeyR' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(255, 255, 255, 0.6)';
            } else {
                button.style.background = keyCode === 'KeyR' ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 255, 255, 0.1)';
                button.style.borderColor = keyCode === 'KeyR' ? 'rgba(255, 100, 100, 0.4)' : 'rgba(255, 255, 255, 0.3)';
            }
        }
    }
    
    destroy() {
        const controls = document.querySelector('.virtual-controls');
        const reset = document.querySelector('.virtual-button-reset');
        const instructions = document.querySelector('[style*="Throttle"]');
        if (controls) controls.remove();
        if (reset) reset.remove();
        if (instructions) instructions.remove();
        
        // Clean up event listeners
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleResize);
        clearTimeout(this.resizeTimeout);
    }
}