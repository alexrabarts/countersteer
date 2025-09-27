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
            { segments: 6, turnRate: 0.12 },      // Right turn 1 - hairpin
            { segments: 4, turnRate: 0 },         // Short straight
            { segments: 8, turnRate: 0.14 },      // Right turn 2 - extreme hairpin
            { segments: 3, turnRate: 0 },         // Very short straight
            { segments: 10, turnRate: 0.11 },     // Right turn 3 - long sharp
            { segments: 5, turnRate: 0 },         // Straight
            { segments: 6, turnRate: 0.13 },      // Right turn 4 - hairpin
            { segments: 4, turnRate: 0 },         // Short straight
            { segments: 5, turnRate: 0.15 },      // Right turn 5 - switchback
            { segments: 6, turnRate: 0 },         // Straight
            { segments: 6, turnRate: -0.16 },     // Left turn 1 - extreme switchback
            { segments: 3, turnRate: 0 },         // Short straight
            { segments: 6, turnRate: -0.12 },     // Left turn 2 - hairpin
            { segments: 8, turnRate: 0 },         // Final straight back to start area
        ];
        
        // First, build the road path
        let segmentIndex = 0;
        courseLayout.forEach(section => {
            for (let i = 0; i < section.segments; i++) {
                // Calculate center position for this segment
                const centerX = currentX + (segmentLength/2) * Math.sin(currentHeading);
                const centerZ = currentZ + (segmentLength/2) * Math.cos(currentHeading);
                
                // Calculate elevation with smooth continuous function - ensure it stays above ground
                const elevation = Math.sin(segmentIndex * 0.05) * 8 + Math.cos(segmentIndex * 0.03) * 6 + 10;
                
                // Store path point with elevation
                this.roadPath.push({
                    x: centerX,
                    z: centerZ,
                    y: elevation,
                    heading: currentHeading
                });
                
                // Update position for next segment
                currentX += segmentLength * Math.sin(currentHeading);
                currentZ += segmentLength * Math.cos(currentHeading);
                
                // Update heading for next segment
                currentHeading += section.turnRate;
                segmentIndex++;
            }
        });
        
        // Create continuous road surface
        this.createContinuousRoad(roadMaterial);
        
        console.log('Course created with', this.roadPath.length, 'segments');
        console.log('Start position:', this.roadPath[0]);
    }
    
    createContinuousRoad(roadMaterial) {
        const roadWidth = 16;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const uvs = [];
        
        // Create vertices for continuous road surface
        for (let i = 0; i < this.roadPath.length; i++) {
            const point = this.roadPath[i];
            const nextPoint = i < this.roadPath.length - 1 ? this.roadPath[i + 1] : point;
            
            // Smoothly interpolate elevation between points
            const y = point.y;
            const nextY = nextPoint.y;
            
            // Calculate perpendicular to road direction
            const perpX = Math.cos(point.heading) * roadWidth / 2;
            const perpZ = -Math.sin(point.heading) * roadWidth / 2;
            
            // Add vertices for left and right edge of road
            vertices.push(
                point.x - perpX, y, point.z - perpZ,  // Left edge
                point.x + perpX, y, point.z + perpZ   // Right edge
            );
            
            // Add UV coordinates
            uvs.push(0, i * 0.1, 1, i * 0.1);
        }
        
        // Create triangles connecting the vertices
        for (let i = 0; i < this.roadPath.length - 1; i++) {
            const baseIndex = i * 2;
            // Two triangles per road segment
            indices.push(
                baseIndex, baseIndex + 2, baseIndex + 1,
                baseIndex + 1, baseIndex + 2, baseIndex + 3
            );
        }
        
        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Create the road mesh
        const roadMesh = new THREE.Mesh(geometry, roadMaterial);
        roadMesh.receiveShadow = true;
        roadMesh.castShadow = true;
        this.scene.add(roadMesh);
        
        console.log('Created continuous road with', vertices.length / 3, 'vertices');
    }
    
    addRockFormations() {
        // Create rock materials with variation
        const rockMaterials = [
            new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.95, metalness: 0.0 }),
            new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95, metalness: 0.0 }),
            new THREE.MeshStandardMaterial({ color: 0x5c5c5c, roughness: 0.95, metalness: 0.0 })
        ];
        
        // Large cliff rocks on elevated side
        this.roadPath.forEach((point, index) => {
            if (index % 7 === 0) { // Every 7th segment for spacing
                // Left side cliff rocks (elevated side)
                const cliffX = point.x - (20 + Math.random() * 15) * Math.cos(point.heading);
                const cliffZ = point.z + (20 + Math.random() * 15) * Math.sin(point.heading);
                const cliffY = point.y + 5 + Math.random() * 10;
                
                // Create irregular rock shape using multiple merged geometries
                const rockGroup = new THREE.Group();
                
                // Main rock body
                const mainRockGeometry = new THREE.DodecahedronGeometry(3 + Math.random() * 4, 0);
                const mainRock = new THREE.Mesh(
                    mainRockGeometry, 
                    rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                );
                mainRock.position.set(0, 0, 0);
                mainRock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                mainRock.scale.set(
                    1 + Math.random() * 0.5,
                    0.7 + Math.random() * 0.6,
                    1 + Math.random() * 0.5
                );
                mainRock.castShadow = true;
                mainRock.receiveShadow = true;
                rockGroup.add(mainRock);
                
                // Additional rock chunks for detail
                for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
                    const chunkGeometry = new THREE.TetrahedronGeometry(1 + Math.random() * 2, 0);
                    const chunk = new THREE.Mesh(
                        chunkGeometry,
                        rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                    );
                    chunk.position.set(
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 4
                    );
                    chunk.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );
                    chunk.castShadow = true;
                    chunk.receiveShadow = true;
                    rockGroup.add(chunk);
                }
                
                rockGroup.position.set(cliffX, cliffY, cliffZ);
                this.scene.add(rockGroup);
            }
            
            // Smaller rocks and boulders scattered around
            if (index % 4 === 0 && Math.random() > 0.5) {
                const side = Math.random() > 0.5 ? 1 : -1;
                const boulderX = point.x + side * (12 + Math.random() * 8) * Math.cos(point.heading);
                const boulderZ = point.z - side * (12 + Math.random() * 8) * Math.sin(point.heading);
                const boulderY = point.y + Math.random() * 2;
                
                const boulderGeometry = new THREE.SphereGeometry(
                    0.5 + Math.random() * 1.5,
                    6 + Math.floor(Math.random() * 3),
                    5 + Math.floor(Math.random() * 3)
                );
                const boulder = new THREE.Mesh(
                    boulderGeometry,
                    rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                );
                boulder.position.set(boulderX, boulderY, boulderZ);
                boulder.scale.set(
                    1 + Math.random() * 0.3,
                    0.7 + Math.random() * 0.4,
                    1 + Math.random() * 0.3
                );
                boulder.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                boulder.castShadow = true;
                boulder.receiveShadow = true;
                this.scene.add(boulder);
            }
        });
        
        // Rock face walls for dramatic cliff sections
        for (let i = 0; i < this.roadPath.length - 10; i += 10) {
            if (Math.abs(this.roadPath[i].y) > 8) { // Only on high elevation sections
                const wallLength = 10;
                const wallGeometry = new THREE.PlaneGeometry(wallLength * 2, 25);
                
                // Displace vertices for rough rock face appearance
                const positions = wallGeometry.attributes.position;
                for (let j = 0; j < positions.count; j++) {
                    const x = positions.getX(j);
                    const y = positions.getY(j);
                    const z = positions.getZ(j) + Math.random() * 2 - 1;
                    positions.setZ(j, z);
                }
                wallGeometry.computeVertexNormals();
                
                const rockWall = new THREE.Mesh(
                    wallGeometry,
                    rockMaterials[0]
                );
                
                // Position wall along road
                const avgX = (this.roadPath[i].x + this.roadPath[i + 5].x) / 2;
                const avgZ = (this.roadPath[i].z + this.roadPath[i + 5].z) / 2;
                const avgY = (this.roadPath[i].y + this.roadPath[i + 5].y) / 2;
                const avgHeading = (this.roadPath[i].heading + this.roadPath[i + 5].heading) / 2;
                
                rockWall.position.set(
                    avgX - 25 * Math.cos(avgHeading),
                    avgY + 10,
                    avgZ + 25 * Math.sin(avgHeading)
                );
                rockWall.rotation.y = avgHeading + Math.PI / 2;
                rockWall.castShadow = true;
                rockWall.receiveShadow = true;
                this.scene.add(rockWall);
            }
        }
    }
    
    createGuardRails() {
        // Create metal guard rails for dangerous sections
        const railHeight = 0.8;
        const postSpacing = 4; // meters between posts
        
        // Metal rail material
        const railMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            roughness: 0.6,
            metalness: 0.8
        });
        
        // Post material
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.6
        });
        
        // Create continuous rail sections
        for (let i = 0; i < this.roadPath.length - 1; i++) {
            const point = this.roadPath[i];
            const nextPoint = this.roadPath[i + 1];
            
            // Determine if this section needs guard rails based on elevation drop
            const elevationDrop = Math.abs(point.y);
            const nextIndex = Math.min(i + 1, this.roadPath.length - 1);
            const headingChange = Math.abs(this.roadPath[nextIndex].heading - point.heading);
            
            // Add rails on curves and high elevation sections
            if (elevationDrop > 5 || headingChange > 0.02) {
                // Determine which side needs rails (outside of curves or both on dangerous sections)
                const railSide = headingChange > 0.02 ? (headingChange > 0 ? -1 : 1) : 0;
                
                if (railSide <= 0) {
                    // Left side rail - create as vertical cylindrical rail
                    const railGeometry = new THREE.CylinderGeometry(0.05, 0.05, 
                        Math.sqrt(Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.z - point.z, 2)),
                        8
                    );
                    const rail = new THREE.Mesh(railGeometry, railMaterial);
                    
                    const perpX = Math.cos(point.heading) * 8.2;
                    const perpZ = -Math.sin(point.heading) * 8.2;
                    
                    // Position and rotate properly
                    rail.position.set(
                        (point.x + nextPoint.x) / 2 - perpX,
                        (point.y + nextPoint.y) / 2 + railHeight,
                        (point.z + nextPoint.z) / 2 - perpZ
                    );
                    rail.rotation.z = Math.PI / 2; // Rotate to horizontal
                    rail.rotation.y = point.heading;
                    rail.castShadow = true;
                    rail.receiveShadow = true;
                    this.scene.add(rail);
                }
                
                if (railSide >= 0 || elevationDrop > 10) {
                    // Right side rail - create as vertical cylindrical rail
                    const railGeometry = new THREE.CylinderGeometry(0.05, 0.05,
                        Math.sqrt(Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.z - point.z, 2)),
                        8
                    );
                    const rail = new THREE.Mesh(railGeometry, railMaterial);
                    
                    const perpX = Math.cos(point.heading) * 8.2;
                    const perpZ = -Math.sin(point.heading) * 8.2;
                    
                    // Position and rotate properly
                    rail.position.set(
                        (point.x + nextPoint.x) / 2 + perpX,
                        (point.y + nextPoint.y) / 2 + railHeight,
                        (point.z + nextPoint.z) / 2 + perpZ
                    );
                    rail.rotation.z = Math.PI / 2; // Rotate to horizontal
                    rail.rotation.y = point.heading;
                    rail.castShadow = true;
                    rail.receiveShadow = true;
                    this.scene.add(rail);
                }
                
                // Add posts every few segments
                if (i % 2 === 0) {
                    const postGeometry = new THREE.BoxGeometry(0.1, railHeight + 0.2, 0.1);
                    
                    if (railSide <= 0) {
                        // Left post
                        const perpX = Math.cos(point.heading) * 8.2;
                        const perpZ = -Math.sin(point.heading) * 8.2;
                        const post = new THREE.Mesh(postGeometry, postMaterial);
                        post.position.set(
                            point.x - perpX,
                            point.y + (railHeight + 0.2) / 2,
                            point.z - perpZ
                        );
                        post.castShadow = true;
                        post.receiveShadow = true;
                        this.scene.add(post);
                    }
                    
                    if (railSide >= 0 || elevationDrop > 10) {
                        // Right post
                        const perpX = Math.cos(point.heading) * 8.2;
                        const perpZ = -Math.sin(point.heading) * 8.2;
                        const post = new THREE.Mesh(postGeometry, postMaterial);
                        post.position.set(
                            point.x + perpX,
                            point.y + (railHeight + 0.2) / 2,
                            point.z + perpZ
                        );
                        post.castShadow = true;
                        post.receiveShadow = true;
                        this.scene.add(post);
                    }
                }
            }
        }
    }
    
    createRoadWalls() {
        // Create detailed rocky cliff walls along the road edges
        const createDetailedCliff = (side, height, isDropOff) => {
            const group = new THREE.Group();
            
            // Rock material with vertex colors for variation
            const cliffMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x7a6b5d,
                vertexColors: true,
                roughness: 0.95, 
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            
            // Create main cliff face with displacement
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            const colors = [];
            const uvs = [];
            
            // Higher resolution for more detail
            const verticalSegments = 6;
            
            // Create vertices with displacement for rocky appearance
            for (let i = 0; i < this.roadPath.length; i++) {
                const point = this.roadPath[i];
                const roadY = point.y || 0;
                
                // Calculate perpendicular offset for road edge
                const perpX = Math.cos(point.heading) * 8 * side;
                const perpZ = -Math.sin(point.heading) * 8 * side;
                
                // Create multiple vertices vertically for each point
                for (let j = 0; j <= verticalSegments; j++) {
                    const verticalProgress = j / verticalSegments;
                    const currentHeight = height * verticalProgress;
                    
                    // Add subtle displacement for rocky texture (reduced for continuity)
                    const displacement = Math.sin(i * 0.2 + j * 0.4) * 0.3 + 
                                       Math.cos(i * 0.5 - j * 0.2) * 0.2;
                    
                    // Vary the wall distance slightly for more natural look
                    const wallOffset = displacement * 0.5;
                    
                    vertices.push(
                        point.x + perpX + wallOffset * Math.cos(point.heading),
                        roadY + currentHeight,
                        point.z + perpZ - wallOffset * Math.sin(point.heading)
                    );
                    
                    // Color variation for rock layers
                    const colorVariation = 0.7 + Math.random() * 0.3;
                    const layerTint = 0.9 + verticalProgress * 0.1;
                    colors.push(
                        colorVariation * layerTint,
                        colorVariation * layerTint * 0.9,
                        colorVariation * layerTint * 0.8
                    );
                    
                    // UV coordinates
                    uvs.push(i * 0.1, verticalProgress);
                }
            }
            
            // Create triangles for the continuous wall
            for (let i = 0; i < this.roadPath.length - 1; i++) {
                for (let j = 0; j < verticalSegments; j++) {
                    const baseIndex = i * (verticalSegments + 1) + j;
                    const nextBaseIndex = (i + 1) * (verticalSegments + 1) + j;
                    
                    // Two triangles per segment
                    indices.push(
                        baseIndex, nextBaseIndex, baseIndex + 1,
                        baseIndex + 1, nextBaseIndex, nextBaseIndex + 1
                    );
                }
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            // Main continuous cliff face
            const mainCliff = new THREE.Mesh(geometry, cliffMaterial);
            mainCliff.receiveShadow = true;
            mainCliff.castShadow = true;
            group.add(mainCliff);
            
            // Add many rocky outcroppings and boulders for detail
            const rockMaterials = [
                new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95, metalness: 0.0 }),
                new THREE.MeshStandardMaterial({ color: 0x5c5c5c, roughness: 0.9, metalness: 0.0 }),
                new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85, metalness: 0.0 }),
                new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.92, metalness: 0.0 }),
                new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.88, metalness: 0.0 })
            ];
            
            // Main large boulders embedded in cliff
            for (let i = 0; i < this.roadPath.length; i += 2) { // Much more frequent
                const point = this.roadPath[i];
                
                // Large protruding rocks
                if (Math.random() > 0.3) { // 70% chance
                    const rockSize = 1.2 + Math.random() * 2.5;
                    const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
                    const rock = new THREE.Mesh(
                        rockGeometry, 
                        rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                    );
                    
                    // Vary the distance from wall center for depth
                    const depthVariation = (Math.random() - 0.3) * 1.5;
                    const perpX = Math.cos(point.heading) * (8 + depthVariation) * side;
                    const perpZ = -Math.sin(point.heading) * (8 + depthVariation) * side;
                    
                    // Vary height across the cliff face
                    const heightPosition = 0.2 + Math.random() * 0.6;
                    
                    rock.position.set(
                        point.x + perpX,
                        (point.y || 0) + height * heightPosition,
                        point.z + perpZ
                    );
                    
                    rock.rotation.set(
                        Math.random() * Math.PI,
                        Math.random() * Math.PI,
                        Math.random() * Math.PI
                    );
                    
                    // Elongated shapes for more natural look
                    rock.scale.set(
                        1.5 + Math.random() * 0.5,
                        0.7 + Math.random() * 0.5,
                        1 + Math.random() * 0.5
                    );
                    
                    rock.castShadow = true;
                    rock.receiveShadow = true;
                    group.add(rock);
                }
                
                // Medium sized rocks
                if (Math.random() > 0.2) { // 80% chance
                    for (let j = 0; j < 1 + Math.floor(Math.random() * 2); j++) {
                        const mediumRockSize = 0.8 + Math.random() * 1.2;
                        const mediumRockGeometry = new THREE.TetrahedronGeometry(mediumRockSize, 0);
                        const mediumRock = new THREE.Mesh(
                            mediumRockGeometry,
                            rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                        );
                        
                        const offset = Math.random() * 2 - 1;
                        const perpX = Math.cos(point.heading) * (8 + offset) * side;
                        const perpZ = -Math.sin(point.heading) * (8 + offset) * side;
                        
                        mediumRock.position.set(
                            point.x + perpX + (Math.random() - 0.5) * 2,
                            (point.y || 0) + height * (0.1 + Math.random() * 0.8),
                            point.z + perpZ + (Math.random() - 0.5) * 2
                        );
                        
                        mediumRock.rotation.set(
                            Math.random() * Math.PI * 2,
                            Math.random() * Math.PI * 2,
                            Math.random() * Math.PI * 2
                        );
                        
                        mediumRock.scale.set(
                            1 + Math.random() * 0.4,
                            0.8 + Math.random() * 0.4,
                            1 + Math.random() * 0.4
                        );
                        
                        mediumRock.castShadow = true;
                        mediumRock.receiveShadow = true;
                        group.add(mediumRock);
                    }
                }
                
                // Small detail rocks
                if (i % 3 === 0) {
                    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
                        const smallRockSize = 0.3 + Math.random() * 0.5;
                        const smallRockGeometry = new THREE.SphereGeometry(smallRockSize, 5, 4);
                        const smallRock = new THREE.Mesh(
                            smallRockGeometry,
                            rockMaterials[Math.floor(Math.random() * rockMaterials.length)]
                        );
                        
                        const perpX = Math.cos(point.heading) * (8 + Math.random() * 0.5) * side;
                        const perpZ = -Math.sin(point.heading) * (8 + Math.random() * 0.5) * side;
                        
                        smallRock.position.set(
                            point.x + perpX + (Math.random() - 0.5) * 3,
                            (point.y || 0) + height * Math.random(),
                            point.z + perpZ + (Math.random() - 0.5) * 3
                        );
                        
                        smallRock.scale.set(
                            1 + Math.random() * 0.3,
                            0.7 + Math.random() * 0.3,
                            1 + Math.random() * 0.3
                        );
                        
                        smallRock.castShadow = true;
                        smallRock.receiveShadow = true;
                        group.add(smallRock);
                    }
                }
            }
            
            // Add sparse vegetation on upper cliff (if going up)
            if (height > 0) {
                const bushGeometry = new THREE.SphereGeometry(0.8, 5, 4);
                const bushMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x2d4a2b,
                    roughness: 0.9,
                    metalness: 0.0
                });
                
                for (let i = 0; i < this.roadPath.length; i += 10) { // Less frequent
                    if (Math.random() > 0.5) {
                        const point = this.roadPath[i];
                        const bush = new THREE.Mesh(bushGeometry, bushMaterial);
                        
                        const perpX = Math.cos(point.heading) * 8.5 * side;
                        const perpZ = -Math.sin(point.heading) * 8.5 * side;
                        
                        bush.position.set(
                            point.x + perpX,
                            (point.y || 0) + height - 0.5,
                            point.z + perpZ
                        );
                        
                        bush.scale.set(
                            1 + Math.random() * 0.5,
                            0.8 + Math.random() * 0.4,
                            1 + Math.random() * 0.5
                        );
                        
                        bush.castShadow = true;
                        bush.receiveShadow = true;
                        group.add(bush);
                    }
                }
            }
            
            return group;
        };
        
        // Left cliff wall (elevated terrain)
        const leftCliff = createDetailedCliff(-1, 15, false);
        this.scene.add(leftCliff);
        
        // Right cliff wall (drop-off)
        const rightCliff = createDetailedCliff(1, -30, true);
        this.scene.add(rightCliff);
    }
    
    createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Asphalt base
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texture variation
        for (let i = 0; i < 300; i++) {
            const gray = Math.random() * 20 + 40;
            ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.5)`;
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 
                        Math.random() * 3 + 1, Math.random() * 3 + 1);
        }
        
        // Tire tracks and wear marks
        ctx.globalAlpha = 0.3;
        
        // Left tire track
        const leftTrackX = canvas.width * 0.35;
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(leftTrackX, 0);
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.lineTo(leftTrackX + Math.sin(y * 0.02) * 3, y);
        }
        ctx.stroke();
        
        // Right tire track
        const rightTrackX = canvas.width * 0.65;
        ctx.beginPath();
        ctx.moveTo(rightTrackX, 0);
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.lineTo(rightTrackX + Math.sin(y * 0.02 + 1) * 3, y);
        }
        ctx.stroke();
        
        // Center wear (from motorcycles)
        ctx.strokeStyle = '#323232';
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        for (let y = 0; y < canvas.height; y += 30) {
            ctx.lineTo(canvas.width / 2 + Math.sin(y * 0.03) * 2, y);
        }
        ctx.stroke();
        
        // Oil stains and patches
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 10 + Math.random() * 20;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(20, 20, 20, 0.5)');
            gradient.addColorStop(1, 'rgba(20, 20, 20, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Cracks and repairs
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.moveTo(startX, startY);
            
            for (let j = 0; j < 3; j++) {
                ctx.lineTo(
                    startX + (Math.random() - 0.5) * 30,
                    startY + Math.random() * 40
                );
            }
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
        
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
        
        // Edge line wear
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2;
        for (let y = 0; y < canvas.height; y += 30 + Math.random() * 20) {
            ctx.beginPath();
            ctx.moveTo(8, y);
            ctx.lineTo(12, y + 10);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(canvas.width - 12, y);
            ctx.lineTo(canvas.width - 8, y + 10);
            ctx.stroke();
        }
        
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
        grass.receiveShadow = true;
        this.scene.add(grass);

        // Create continuous terrain strips along the road
        const createTerrainStrip = (side, offset, dropAmount, color) => {
            const points = [];
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const indices = [];
            
            // Create vertices for terrain strip
            for (let i = 0; i < this.roadPath.length - 1; i++) {
                const point = this.roadPath[i];
                const nextPoint = this.roadPath[i + 1];
                const roadY = point.y !== undefined ? point.y : 0;
                const nextRoadY = nextPoint.y !== undefined ? nextPoint.y : 0;
                
                // Calculate perpendicular offset
                const perpX = Math.cos(point.heading) * offset * side;
                const perpZ = -Math.sin(point.heading) * offset * side;
                const nextPerpX = Math.cos(nextPoint.heading) * offset * side;
                const nextPerpZ = -Math.sin(nextPoint.heading) * offset * side;
                
                // Inner edge (closer to road)
                vertices.push(
                    point.x + perpX, roadY + dropAmount, point.z + perpZ,
                    nextPoint.x + nextPerpX, nextRoadY + dropAmount, nextPoint.z + nextPerpZ
                );
                
                // Outer edge (further from road)
                vertices.push(
                    point.x + perpX * 3, roadY + dropAmount * 1.5, point.z + perpZ * 3,
                    nextPoint.x + nextPerpX * 3, nextRoadY + dropAmount * 1.5, nextPoint.z + nextPerpZ * 3
                );
            }
            
            // Create triangles
            for (let i = 0; i < this.roadPath.length - 1; i++) {
                const baseIndex = i * 4;
                // Two triangles per segment
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex + 1, baseIndex + 3, baseIndex + 2
                );
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.95,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            return mesh;
        };
        
        // Create left side elevated terrain
        const leftTerrain = createTerrainStrip(-1, 12, 2, 0x3a5f3a);
        this.scene.add(leftTerrain);
        
        // Create right side drop-off terrain
        const rightTerrain = createTerrainStrip(1, 12, -10, 0x2a4f2a);
        this.scene.add(rightTerrain);
        
        // Create far right deep drop-off
        const deepDropTerrain = createTerrainStrip(1, 36, -20, 0x1a3f1a);
        this.scene.add(deepDropTerrain);
        
        // Add vertical walls connecting road to terrain
        this.createRoadWalls();
        
        // Guard rails commented out due to rendering issues
        // this.createGuardRails();
        
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
            patch.receiveShadow = true;
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
                const dashY = point.y !== undefined ? point.y + 0.02 : 0.02;
                dash.position.set(point.x, dashY, point.z);
                dash.receiveShadow = true;
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
            const startY = this.roadPath[5].y !== undefined ? this.roadPath[5].y + 0.03 : 0.03;
            startLine.position.set(this.roadPath[5].x, startY, this.roadPath[5].z);
            startLine.receiveShadow = true;
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
            const finishY = this.roadPath[lastSegments].y !== undefined ? this.roadPath[lastSegments].y + 0.03 : 0.03;
            finishLine.position.set(this.roadPath[lastSegments].x, finishY, this.roadPath[lastSegments].z);
            finishLine.receiveShadow = true;
            this.scene.add(finishLine);
        }
    }
    
    addEnvironmentalDetails() {
        // Rock formations and cliff details
        this.addRockFormations();
        
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
                    leftTrunk.castShadow = true;
                    leftTrunk.receiveShadow = true;
                    this.scene.add(leftTrunk);

                    const leftFoliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                    leftFoliage.position.set(leftX, 5.5, leftZ);
                    leftFoliage.castShadow = true;
                    leftFoliage.receiveShadow = true;
                    this.scene.add(leftFoliage);
                } else {
                    // Right side tree
                    const rightX = point.x + treeDistance * Math.sin(point.heading + Math.PI/2);
                    const rightZ = point.z + treeDistance * Math.cos(point.heading + Math.PI/2);
                    
                    const rightTrunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                    rightTrunk.position.set(rightX, 2, rightZ);
                    rightTrunk.castShadow = true;
                    rightTrunk.receiveShadow = true;
                    this.scene.add(rightTrunk);

                    const rightFoliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                    rightFoliage.position.set(rightX, 5.5, rightZ);
                    rightFoliage.castShadow = true;
                    rightFoliage.receiveShadow = true;
                    this.scene.add(rightFoliage);
                }
            }
        });

        // Bushes along the trackside for detail
        const bushGeometry = new THREE.SphereGeometry(1, 6, 4);
        const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016, roughness: 0.9, metalness: 0.0 });
        this.roadPath.forEach((point, index) => {
            if (index % 4 === 0) { // Every 4th segment
                // Left bush
                const leftBush = new THREE.Mesh(bushGeometry, bushMaterial);
                leftBush.position.set(point.x - 35 + Math.random() * 10, 0.5, point.z + Math.random() * 20 - 10);
                leftBush.castShadow = true;
                leftBush.receiveShadow = true;
                this.scene.add(leftBush);

                // Right bush
                const rightBush = new THREE.Mesh(bushGeometry, bushMaterial);
                rightBush.position.set(point.x + 35 + Math.random() * 10, 0.5, point.z + Math.random() * 20 - 10);
                rightBush.castShadow = true;
                rightBush.receiveShadow = true;
                this.scene.add(rightBush);
            }
        });

        // Small cones for track detail (not guard rails)
        const coneGeometry = new THREE.ConeGeometry(0.15, 0.5, 8);
        const coneMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500, roughness: 0.8, metalness: 0.0 });
        this.roadPath.forEach((point, index) => {
            if (index % 8 === 0 && index > 5 && index < this.roadPath.length - 5) { // Sparse placement
                const coneY = point.y !== undefined ? point.y + 0.25 : 0.25;
                
                // Only on straights
                const nextIndex = Math.min(index + 1, this.roadPath.length - 1);
                const headingChange = Math.abs(this.roadPath[nextIndex].heading - point.heading);
                
                if (headingChange < 0.01) {
                    // Left side cone
                    const leftX = point.x - 8.5 * Math.cos(point.heading);
                    const leftZ = point.z + 8.5 * Math.sin(point.heading);
                    const leftCone = new THREE.Mesh(coneGeometry, coneMaterial);
                    leftCone.position.set(leftX, coneY, leftZ);
                    leftCone.castShadow = true;
                    leftCone.receiveShadow = true;
                    this.scene.add(leftCone);

                    // Right side cone
                    const rightX = point.x + 8.5 * Math.cos(point.heading);
                    const rightZ = point.z - 8.5 * Math.sin(point.heading);
                    const rightCone = new THREE.Mesh(coneGeometry, coneMaterial);
                    rightCone.position.set(rightX, coneY, rightZ);
                    rightCone.castShadow = true;
                    rightCone.receiveShadow = true;
                    this.scene.add(rightCone);
                }
            }
        });

        // Start sign
        const signPostGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const signPostMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.0 });
        const signPost = new THREE.Mesh(signPostGeometry, signPostMaterial);
        signPost.position.set(-5, 1, 10);
        signPost.castShadow = true;
        signPost.receiveShadow = true;
        this.scene.add(signPost);

        const signGeometry = new THREE.PlaneGeometry(2, 1);
        const signMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(-5, 2, 10);
        sign.castShadow = true;
        sign.receiveShadow = true;
        this.scene.add(sign);

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
                    leftPost.castShadow = true;
                    leftPost.receiveShadow = true;
                    this.scene.add(leftPost);
                    
                    // Right post
                    const rightX = point.x + 9 * Math.sin(point.heading + Math.PI/2);
                    const rightZ = point.z + 9 * Math.cos(point.heading + Math.PI/2);
                    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
                    rightPost.position.set(rightX, 0.75, rightZ);
                    rightPost.castShadow = true;
                    rightPost.receiveShadow = true;
                    this.scene.add(rightPost);
                } else {
                    // Curve - post on outside only
                    const side = headingChange > 0 ? -1 : 1; // Outside of curve
                    const postX = point.x + side * 9 * Math.sin(point.heading + Math.PI/2);
                    const postZ = point.z + side * 9 * Math.cos(point.heading + Math.PI/2);
                    const post = new THREE.Mesh(postGeometry, postMaterial);
                    post.position.set(postX, 0.75, postZ);
                    post.castShadow = true;
                    post.receiveShadow = true;
                    this.scene.add(post);

                    // Add reflector
                    const reflector = new THREE.Mesh(reflectorGeometry, reflectorMaterial);
                    reflector.position.set(postX, 1.2, postZ);
                    reflector.rotation.y = point.heading;
                    reflector.castShadow = true;
                    reflector.receiveShadow = true;
                    this.scene.add(reflector);
                }
            }
        });
    }
}