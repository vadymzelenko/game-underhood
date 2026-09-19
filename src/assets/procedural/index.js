import { TreeGenerator } from './TreeGenerator.js';
import { FernGenerator } from './FernGenerator.js';
import { BushGenerator } from './BushGenerator.js';
import { FlowerGenerator } from './FlowerGenerator.js';
import { MushroomGenerator } from './MushroomGenerator.js';
import { StumpGenerator } from './StumpGenerator.js';
import { PebblesGenerator } from './PebblesGenerator.js';
import { MossGenerator } from './MossGenerator.js';
import { RockGenerator } from './RockGenerator.js';
import { FormationGenerator } from './FormationGenerator.js';
import { LogGenerator } from './LogGenerator.js';
import { FogGenerator } from './FogGenerator.js';

export { FogGenerator };

export function makeOakTree(seed, size = 'medium', variant = 'green') {
    return new TreeGenerator(64, 64, seed).generate('oak', size, variant);
}
export function makePineTree(seed, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('pine', size, 'green');
}
export function makeSpruceTree(seed, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('spruce', size, 'green');
}
export function makeBirchTree(seed, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('birch', size, 'green');
}
export function makeDeadTree(seed, size = 'medium') {
    return new TreeGenerator(64, 64, seed).generate('deadtree', size, 'dead');
}

export function makeFern(seed, size = 'medium', variant = 'green') {
    return new FernGenerator(64, 64, seed).generate(size, variant);
}
export function makeBush(seed, size = 'medium', variant = 'green') {
    return new BushGenerator(64, 64, seed).generate(size, variant);
}
export function makeFlower(seed, size = 'medium', variant = 'daisy') {
    return new FlowerGenerator(64, 64, seed).generate(size, variant);
}
export function makeMushroom(seed, size = 'medium', variant = 'boletus') {
    return new MushroomGenerator(64, 64, seed).generate(size, variant);
}
export function makeStump(seed, size = 'medium', variant = 'plain') {
    return new StumpGenerator(64, 64, seed).generate(size, variant);
}
export function makePebbles(seed, size = 'medium', variant = 'scatter') {
    return new PebblesGenerator(64, 64, seed).generate(size, variant);
}
export function makeMoss(seed, size = 'medium', variant = 'flat') {
    return new MossGenerator(64, 64, seed).generate(size, variant);
}
export function makeRock(seed, size = 'medium') {
    return new RockGenerator(64, 64, seed).generate(size);
}
export function makeFormation(seed, size = 'peak') {
    return new FormationGenerator(64, 64, seed).generate(size);
}
export function makeLog(seed, size = 'medium', variant = 'straight') {
    return new LogGenerator(64, 64, seed).generate(size, variant);
}