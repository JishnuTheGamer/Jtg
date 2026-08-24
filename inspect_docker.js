const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function run() {
  const containers = await docker.listContainers();
  if (containers.length > 0) {
    const container = docker.getContainer(containers[0].Id);
    const inspect = await container.inspect();
    console.log(inspect.Config.Env);
  }
}
run();
