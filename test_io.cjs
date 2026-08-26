const tsNode = require('tsx/cjs');
const docker = require('./src/server/services/docker.ts');
console.log("io in docker.ts is:", typeof docker.io !== 'undefined' ? docker.io : "not exported but we can't tell");
