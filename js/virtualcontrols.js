class VirtualControls {
    constructor() {
        this.touches = {
            KeyW: false,
            KeyA: false,
            KeyS: false,
            KeyD: false,
            KeyR: false
        };
        
        this.createControls();
    }
    
    createControls() {
        // Create container for controls
        const container = document.createElement('div');
        container.className = 'virtual-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            touch-action: none;
            user-select: none;
        `;
        
        // WASD layout positions
        const buttonSize = 70;
        const gap = 5;
        const buttons = [
            { key: 'KeyW', label: 'W', x: buttonSize + gap, y: 0 },
            { key: 'KeyA', label: 'A', x: 0, y: buttonSize + gap },
            { key: 'KeyS', label: 'S', x: buttonSize + gap, y: buttonSize + gap },
            { key: 'KeyD', label: 'D', x: (buttonSize + gap) * 2, y: buttonSize + gap }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('div');
            button.className = 'virtual-button';
            button.innerHTML = btn.label;
            button.style.cssText = `
                position: absolute;
                width: ${buttonSize}px;
                height: ${buttonSize}px;
                left: ${btn.x}px;
                top: ${btn.y}px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                font-family: monospace;
                cursor: pointer;
                transition: background 0.1s;
            `;
            
            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touches[btn.key] = true;
                button.style.background = 'rgba(255, 255, 255, 0.3)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touches[btn.key] = false;
                button.style.background = 'rgba(255, 255, 255, 0.1)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            });
            
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.touches[btn.key] = false;
                button.style.background = 'rgba(255, 255, 255, 0.1)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.3)';
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
        
        // Reset button on the right
        const resetButton = document.createElement('div');
        resetButton.className = 'virtual-button-reset';
        resetButton.innerHTML = 'R';
        resetButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 80px;
            height: 80px;
            background: rgba(255, 100, 100, 0.2);
            border: 2px solid rgba(255, 100, 100, 0.4);
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            font-family: monospace;
            z-index: 1000;
            cursor: pointer;
            touch-action: none;
            user-select: none;
            transition: background 0.1s;
        `;
        
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
        document.body.appendChild(resetButton);
        
        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 180px;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            text-align: center;
            z-index: 999;
            font-family: monospace;
        `;
        instructions.innerHTML = 'W: Throttle | S: Brake<br>A/D: Steering | R: Reset';
        document.body.appendChild(instructions);
    }
    
    getKey(keyCode) {
        return this.touches[keyCode] || false;
    }
    
    destroy() {
        const controls = document.querySelector('.virtual-controls');
        const reset = document.querySelector('.virtual-button-reset');
        if (controls) controls.remove();
        if (reset) reset.remove();
    }
}