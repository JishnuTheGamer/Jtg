import {
  createServerContainer,
  startContainer,
  stopContainer,
  restartContainer,
  deleteContainer,
  getContainerStatus,
  getContainerStats,
  getContainerLogs,
  attachContainerSocket,
  sendContainerCommand
} from "./docker.js";

import {
  createLocalServer,
  startLocalServer,
  stopLocalServer,
  restartLocalServer,
  deleteLocalServer,
  getLocalServerStatus,
  getLocalServerStats,
  getLocalServerLogs,
  attachLocalServerSocket,
  sendLocalServerCommand
} from "./local.js";

export const createServerRuntime = async (serverData: any, nodeId?: string) => {
  if (serverData.runtimeType === "local") {
    return await createLocalServer(serverData);
  }
  return await createServerContainer(serverData, nodeId);
};

export const startServerRuntime = async (server: any) => {
  if (server.runtimeType === "local") {
    return await startLocalServer(server.id, server);
  }
  return await startContainer(server.containerId, server.nodeId);
};

export const stopServerRuntime = async (server: any) => {
  if (server.runtimeType === "local") {
    return await stopLocalServer(server.id);
  }
  return await stopContainer(server.containerId, server.nodeId);
};

export const restartServerRuntime = async (server: any) => {
  if (server.runtimeType === "local") {
    return await restartLocalServer(server.id, server);
  }
  return await restartContainer(server.containerId, server.nodeId);
};

export const deleteServerRuntime = async (server: any) => {
  if (server.runtimeType === "local") {
    return await deleteLocalServer(server.id);
  }
  return await deleteContainer(server.containerId, server.nodeId);
};

export const getServerRuntimeStatus = async (server: any) => {
  if (server.runtimeType === "local") {
    return await getLocalServerStatus(server.id);
  }
  return await getContainerStatus(server.containerId, server.nodeId);
};

export const getServerRuntimeStats = async (server: any) => {
  if (server.runtimeType === "local") {
    return await getLocalServerStats(server.id);
  }
  return await getContainerStats(server.containerId, server.nodeId);
};

export const getServerRuntimeLogs = async (server: any) => {
  if (server.runtimeType === "local") {
    return await getLocalServerLogs(server.id);
  }
  return await getContainerLogs(server.containerId, server.nodeId);
};

export const attachServerRuntimeSocket = async (server: any, serverId: string) => {
  if (server.runtimeType === "local") {
    return attachLocalServerSocket(server.id, serverId);
  }
  return await attachContainerSocket(server.containerId, serverId, server.nodeId);
};

export const sendServerRuntimeCommand = async (server: any, command: string) => {
  if (server.runtimeType === "local") {
    return await sendLocalServerCommand(server.id, command);
  }
  return await sendContainerCommand(server.containerId, command, server.nodeId);
};
