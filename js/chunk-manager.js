/**
 * ChunkManager - Dynamic terrain streaming system
 * Loads and unloads track geometry chunks as the player progresses
 */
class ChunkManager {
    constructor(scene, environment) {
        this.scene = scene;
        this.environment = environment;

        // Chunk configuration
        this.chunkSize = 50; // segments per chunk
        this.totalSegments = environment.roadPath.length;
        this.totalChunks = Math.ceil(this.totalSegments / this.chunkSize);

        // Loaded chunks: Map<chunkIndex, chunkData>
        this.loadedChunks = new Map();

        // Current player state
        this.currentChunkIndex = -1;
        this.lastUpdateSegment = -1;

        // Configuration
        this.chunksAhead = 2; // Load 2 chunks ahead
        this.chunksBehind = 1; // Keep 1 chunk behind
        this.loadTriggerDistance = 10; // Load next chunk when within 10 segments

        console.log(`ChunkManager initialized: ${this.totalChunks} chunks (${this.chunkSize} segments each)`);
    }

    /**
     * Update based on vehicle's current road segment
     * @param {number} vehicleSegment - Current segment index
     * @param {boolean} forceUpdate - Force update even if position hasn't changed much
     */
    update(vehicleSegment, forceUpdate = false) {
        // Avoid unnecessary updates (unless forced for initialization)
        if (!forceUpdate && Math.abs(vehicleSegment - this.lastUpdateSegment) < 5) {
            return;
        }
        this.lastUpdateSegment = vehicleSegment;

        const newChunkIndex = Math.floor(vehicleSegment / this.chunkSize);

        // Check if we've moved to a new chunk
        if (newChunkIndex !== this.currentChunkIndex) {
            console.log(`Player entered chunk ${newChunkIndex} (segment ${vehicleSegment})`);
            this.currentChunkIndex = newChunkIndex;
        }

        // Determine which chunks should be loaded
        const chunksToKeep = new Set();
        for (let i = -this.chunksBehind; i <= this.chunksAhead; i++) {
            const chunkIndex = this.currentChunkIndex + i;
            if (chunkIndex >= 0 && chunkIndex < this.totalChunks) {
                chunksToKeep.add(chunkIndex);
            }
        }

        // Unload chunks that are too far away
        for (const [chunkIndex, chunkData] of this.loadedChunks) {
            if (!chunksToKeep.has(chunkIndex)) {
                this.unloadChunk(chunkIndex);
            }
        }

        // Load chunks that should be present
        for (const chunkIndex of chunksToKeep) {
            if (!this.loadedChunks.has(chunkIndex)) {
                this.loadChunk(chunkIndex);
            }
        }
    }

    /**
     * Load a chunk's geometry
     * @param {number} chunkIndex - Chunk index to load
     */
    loadChunk(chunkIndex) {
        if (this.loadedChunks.has(chunkIndex)) {
            return; // Already loaded
        }

        const startSegment = chunkIndex * this.chunkSize;
        const endSegment = Math.min(startSegment + this.chunkSize - 1, this.totalSegments - 1);

        console.log(`Loading chunk ${chunkIndex}: segments ${startSegment}-${endSegment}`);

        // Create chunk data container
        const chunkData = {
            index: chunkIndex,
            startSegment,
            endSegment,
            meshes: [], // All THREE.js meshes created for this chunk
            groups: []  // All THREE.js groups created for this chunk
        };

        // Generate geometry for this chunk using Environment methods
        // We'll create chunk-specific generation methods
        this.generateChunkGeometry(chunkData);

        // Store loaded chunk
        this.loadedChunks.set(chunkIndex, chunkData);

        console.log(`Chunk ${chunkIndex} loaded with ${chunkData.meshes.length} meshes`);
    }

    /**
     * Unload a chunk and dispose its geometry
     * @param {number} chunkIndex - Chunk index to unload
     */
    unloadChunk(chunkIndex) {
        const chunkData = this.loadedChunks.get(chunkIndex);
        if (!chunkData) {
            return; // Not loaded
        }

        console.log(`Unloading chunk ${chunkIndex}...`);

        // Dispose all meshes
        for (const mesh of chunkData.meshes) {
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            this.scene.remove(mesh);
        }

        // Dispose all groups
        for (const group of chunkData.groups) {
            // Recursively dispose children
            group.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(group);
        }

        // Remove from loaded chunks
        this.loadedChunks.delete(chunkIndex);

        console.log(`Chunk ${chunkIndex} unloaded`);
    }

    /**
     * Generate all geometry for a chunk
     * @param {Object} chunkData - Chunk data container
     */
    generateChunkGeometry(chunkData) {
        const { startSegment, endSegment } = chunkData;

        // Create cliff walls for this chunk
        const cliffGroup = this.environment.createCliffWallsForChunk(startSegment, endSegment);
        if (cliffGroup) {
            chunkData.groups.push(cliffGroup);
        }

        // Create ground strip for this chunk
        const groundStripMesh = this.environment.createGroundStripForChunk(startSegment, endSegment);
        if (groundStripMesh) {
            chunkData.meshes.push(groundStripMesh);
        }

        // Create boulders for this chunk
        const boulderGroup = this.environment.createBouldersForChunk(startSegment, endSegment);
        if (boulderGroup) {
            chunkData.groups.push(boulderGroup);
        }

        // Create terrain strips for this chunk
        const terrainMeshes = this.environment.createTerrainStripsForChunk(startSegment, endSegment);
        if (terrainMeshes) {
            chunkData.meshes.push(...terrainMeshes);
        }

        // Create road markings for this chunk
        const roadMarkingMesh = this.environment.createRoadMarkingsForChunk(startSegment, endSegment);
        if (roadMarkingMesh) {
            chunkData.meshes.push(roadMarkingMesh);
        }
    }

    /**
     * Initialize chunks for a specific leg
     * @param {number} legStartSegment - Leg's start segment
     * @param {number} legEndSegment - Leg's end segment
     */
    initializeForLeg(legStartSegment, legEndSegment) {
        // Clear all loaded chunks
        for (const chunkIndex of this.loadedChunks.keys()) {
            this.unloadChunk(chunkIndex);
        }

        // Load initial chunks for the leg
        const startChunk = Math.floor(legStartSegment / this.chunkSize);
        this.currentChunkIndex = startChunk;
        this.lastUpdateSegment = -999; // Force initial load

        // Load initial chunks immediately (force update)
        this.update(legStartSegment, true);

        console.log(`ChunkManager initialized for leg starting at segment ${legStartSegment}`);
    }

    /**
     * Clean up all chunks (called when switching legs or resetting)
     */
    cleanup() {
        console.log('ChunkManager cleanup: unloading all chunks');
        for (const chunkIndex of Array.from(this.loadedChunks.keys())) {
            this.unloadChunk(chunkIndex);
        }
        this.currentChunkIndex = -1;
        this.lastUpdateSegment = -1;
    }
}
