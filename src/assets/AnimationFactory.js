export function buildCharacterAnimations(scene, registry) {
    for (const [charKey, def] of Object.entries(registry.characters || {})) {
        const dirs = def.directions || ['down', 'up', 'left', 'right'];
        const framesPerDir = def.walkFramesPerDirection || 4;
        const idleFrame = def.idleFrame ?? 0;
        const walkRate = def.walkRate ?? 8;
        const idleRate = def.idleRate ?? 1;

        dirs.forEach((dir, row) => {
            const baseFrame = row * framesPerDir;

            const idleKey = `${charKey}_idle_${dir}`;
            if (!scene.anims.exists(idleKey)) {
                scene.anims.create({
                    key: idleKey,
                    frames: [{ key: def.texture, frame: baseFrame + idleFrame }],
                    frameRate: idleRate,
                    repeat: -1,
                });
            }

            const walkKey = `${charKey}_walk_${dir}`;
            if (!scene.anims.exists(walkKey)) {
                const frames = [];
                for (let i = 0; i < framesPerDir; i++) {
                    frames.push({ key: def.texture, frame: baseFrame + i });
                }
                scene.anims.create({
                    key: walkKey,
                    frames,
                    frameRate: walkRate,
                    repeat: -1,
                });
            }
        });
    }
}