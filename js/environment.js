class Environment {
    constructor(scene) {
        this.scene = scene;
        this.roadPath = []; // Store the path for other uses
        this.createRoad();
        this.createGrass();
        this.createRoadMarkings();
        this.addEnvironmentalDetails();
    }
    
    createRoad() {
        // Create road texture
        const roadTexture = this.createRoadTexture();
        const roadMaterial = new THREE.MeshStandardMaterial({
            map: roadTexture,
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const roadWidth = 16;
        const segmentLength = 20; // Shorter segments for smoother curves
        
        // Track position and heading as we build the road
        let currentX = 0;
        let currentZ = 0;
        let currentHeading = 0; // Current direction in radians (0 = north/+Z)
        
        // Define the course as a series of straights and turns
        // Each element defines how many segments and the turn rate per segment
        const courseLayout = [
            { segments: 10, turnRate: 0 },        // Start straight - 200m
            { segments: 8, turnRate: 0.04 },      // Right turn 1 - gentle
            { segments: 8, turnRate: 0 },         // Straight
            { segments: 10, turnRate: 0.05 },     // Right turn 2 - medium
            { segments: 6, turnRate: 0 },         // Short straight
            { segments: 12, turnRate: 0.04 },     // Right turn 3 - long gentle
            { segments: 10, turnRate: 0 },        // Straight
            { segments: 8, turnRate: 0.045 },     // Right turn 4 - back to start
            { segments: 8, turnRate: 0 },         // Straight
            { segments: 6, turnRate: 0.05 },      // Right turn 5 
            { segments: 10, turnRate: 0 },        // Long straight
            { segments: 8, turnRate: -0.06 },     // Left turn 1 - sharper
            { segments: 6, turnRate: 0 },         // Straight
            { segments: 8, turnRate: -0.04 },     // Left turn 2 - gentle
            { segments: 12, turnRate: 0 },        // Final straight back to start area
        ];
        
        // Build the road segments based on the layout
        courseLayout.forEach(section => {
            for (let i = 0; i < section.segments; i++) {
                // Calculate center position for this segment
                const centerX = currentX + (segmentLength/2) * Math.sin(currentHeading);
                const centerZ = currentZ + (segmentLength/2) * Math.cos(currentHeading);
                
                // Create road segment
                const roadGeometry = new THREE.PlaneGeometry(roadWidth, segmentLength * 1.05); // Slight overlap
                const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
                
                // Position segment
                roadMesh.position.set(centerX, 0.01, centerZ);
                
                // Rotate segment - first lay it flat, then rotate to match heading
                roadMesh.rotation.x = -Math.PI / 2;  // Lay flat
                roadMesh.rotation.z = currentHeading; // Rotate to match road direction
                
                this.scene.add(roadMesh);
                
                // Store path point
                this.roadPath.push({
                    x: centerX,
                    z: centerZ,
                    heading: currentHeading
                });
                
                // Update position for next segment
                currentX += segmentLength * Math.sin(currentHeading);
                currentZ += segmentLength * Math.cos(currentHeading);
                
                // Update heading for next segment
                currentHeading += section.turnRate;
            }
        });
        
        console.log('Course created with', this.roadPath.length, 'segments');
        console.log('Start position:', this.roadPath[0]);
        console.log('End position:', { x: currentX, z: currentZ });
        console.log('Total rotation:', (currentHeading * 180 / Math.PI).toFixed(1), 'degrees');
    }
    
    createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Asphalt
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texture variation
        for (let i = 0; i < 300; i++) {
            const gray = Math.random() * 20 + 40;
            ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.5)`;
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 
                        Math.random() * 3 + 1, Math.random() * 3 + 1);
        }
        
        // White edge lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(10, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(canvas.width - 10, 0);
        ctx.lineTo(canvas.width - 10, canvas.height);
        ctx.stroke();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
    
    createGrass() {
        // Larger grass area for the loop course
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a5f3a,
            side: THREE.DoubleSide,
            roughness: 0.95,
            metalness: 0.0
        });
        
        const grassGeometry = new THREE.PlaneGeometry(2000, 2000);
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(0, -0.01, 0);
        this.scene.add(grass);
        
        // Add some texture variation with darker patches
        for (let i = 0; i < 20; i++) {
            const patchSize = 50 + Math.random() * 100;
            const patchGeometry = new THREE.PlaneGeometry(patchSize, patchSize);
            const patchMaterial = new THREE.MeshStandardMaterial({
                color: 0x2a4f2a,
                side: THREE.DoubleSide,
                roughness: 0.95,
                metalness: 0.0
            });
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(
                (Math.random() - 0.5) * 1500,
                -0.005,
                (Math.random() - 0.5) * 1500
            );
            this.scene.add(patch);
        }
    }
    
    createRoadMarkings() {
        // Yellow center line dashes
        const dashMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.1,
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Place dashes along the road path
        this.roadPath.forEach((point, index) => {
            if (index % 2 === 0) { // Every other segment
                const dashGeometry = new THREE.PlaneGeometry(0.2, 4);
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                dash.rotation.z = point.heading;
                dash.position.set(point.x, 0.02, point.z);
                this.scene.add(dash);
            }
        });
        
        // Add start/finish line
        if (this.roadPath.length > 0) {
            const startGeometry = new THREE.PlaneGeometry(16, 2);
            const startMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.6,
                roughness: 0.7,
                metalness: 0.0
            });
            const startLine = new THREE.Mesh(startGeometry, startMaterial);
            startLine.rotation.x = -Math.PI / 2;
            startLine.position.set(this.roadPath[5].x, 0.03, this.roadPath[5].z);
            this.scene.add(startLine);
            
            // Checkered pattern for finish (near the start)
            const finishMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6,
                roughness: 0.7,
                metalness: 0.0
            });
            const lastSegments = this.roadPath.length - 5;
            const finishLine = new THREE.Mesh(startGeometry, finishMaterial);
            finishLine.rotation.x = -Math.PI / 2;
            finishLine.rotation.z = this.roadPath[lastSegments].heading;
            finishLine.position.set(this.roadPath[lastSegments].x, 0.03, this.roadPath[lastSegments].z);
            this.scene.add(finishLine);
        }
    }
    
    addEnvironmentalDetails() {
        // Trees along the roadside - more sparse for visibility
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.6, 4);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
        const foliageGeometry = new THREE.SphereGeometry(3, 6, 5);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.95, metalness: 0.0 });
        
        // Place trees along road path
        this.roadPath.forEach((point, index) => {
            if (index % 5 === 0) { // Every 5th segment (100m spacing)
                // Vary the distance from road
                const treeDistance = 25 + Math.random() * 15;
                
                // Randomly choose side
                if (Math.random() > 0.5) {
                    // Left side tree
                    const leftX = point.x - treeDistance * Math.sin(point.heading + Math.PI/2);
                    const leftZ = point.z - treeDistance * Math.cos(point.heading + Math.PI/2);
                    
                    const leftTrunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                    leftTrunk.position.set(leftX, 2, leftZ);
                    this.scene.add(leftTrunk);
                    
                    const leftFoliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                    leftFoliage.position.set(leftX, 5.5, leftZ);
                    this.scene.add(leftFoliage);
                } else {
                    // Right side tree
                    const rightX = point.x + treeDistance * Math.sin(point.heading + Math.PI/2);
                    const rightZ = point.z + treeDistance * Math.cos(point.heading + Math.PI/2);
                    
                    const rightTrunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                    rightTrunk.position.set(rightX, 2, rightZ);
                    this.scene.add(rightTrunk);
                    
                    const rightFoliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                    rightFoliage.position.set(rightX, 5.5, rightZ);
                    this.scene.add(rightFoliage);
                }
            }
        });
        
        // Posts along the road - especially on curves
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, emissive: 0x222222, emissiveIntensity: 0.05 });
        const reflectorGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.05);
        const reflectorMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.2,
            roughness: 0.5,
            metalness: 0.0
        });
        
        this.roadPath.forEach((point, index) => {
            if (index % 3 === 0) { // Every 3rd segment (60m spacing)
                // Posts on outside of curves, both sides on straights
                const nextIndex = Math.min(index + 1, this.roadPath.length - 1);
                const headingChange = this.roadPath[nextIndex].heading - point.heading;
                
                if (Math.abs(headingChange) < 0.01) {
                    // Straight section - posts on both sides
                    // Left post
                    const leftX = point.x - 9 * Math.sin(point.heading + Math.PI/2);
                    const leftZ = point.z - 9 * Math.cos(point.heading + Math.PI/2);
                    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
                    leftPost.position.set(leftX, 0.75, leftZ);
                    this.scene.add(leftPost);

                    // Left post light
                    const leftLight = new THREE.PointLight(0xffffff, 0.3, 15);
                    leftLight.position.set(leftX, 1.5, leftZ);
                    this.scene.add(leftLight);

                    // Right post
                    const rightX = point.x + 9 * Math.sin(point.heading + Math.PI/2);
                    const rightZ = point.z + 9 * Math.cos(point.heading + Math.PI/2);
                    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
                    rightPost.position.set(rightX, 0.75, rightZ);
                    this.scene.add(rightPost);

                    // Right post light
                    const rightLight = new THREE.PointLight(0xffffff, 0.3, 15);
                    rightLight.position.set(rightX, 1.5, rightZ);
                    this.scene.add(rightLight);
                } else {
                    // Curve - post on outside only
                    const side = headingChange > 0 ? -1 : 1; // Outside of curve
                    const postX = point.x + side * 9 * Math.sin(point.heading + Math.PI/2);
                    const postZ = point.z + side * 9 * Math.cos(point.heading + Math.PI/2);
                    const post = new THREE.Mesh(postGeometry, postMaterial);
                    post.position.set(postX, 0.75, postZ);
                    this.scene.add(post);

                    // Post light
                    const postLight = new THREE.PointLight(0xffffff, 0.3, 15);
                    postLight.position.set(postX, 1.5, postZ);
                    this.scene.add(postLight);

                    // Add reflector
                    const reflector = new THREE.Mesh(reflectorGeometry, reflectorMaterial);
                    reflector.position.set(postX, 1.2, postZ);
                    reflector.rotation.y = point.heading;
                    this.scene.add(reflector);
                }
            }
        });
    }
}