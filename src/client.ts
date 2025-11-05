import { type Socket, io } from "socket.io-client";
import type { AddMonitorInput, AuthConfig, MonitorConfig, UpdateMonitorInput } from "./schemas.js";

interface Monitor extends MonitorConfig {
  id: number;
}

interface LoginResponse {
  ok: boolean;
  token?: string;
  msg?: string;
}

export class UptimeKumaClient {
  private socket: Socket | null = null;
  private config: AuthConfig;
  private authenticated = false;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
      });

      this.socket.on("connect", () => {
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on("disconnect", () => {
        this.authenticated = false;
      });
    });
  }

  async authenticate(): Promise<void> {
    if (!this.socket) {
      await this.connect();
    }

    if (this.authenticated) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      if (this.config.apiKey) {
        // Authenticate with API key
        this.socket.emit("loginByToken", this.config.apiKey, (response: LoginResponse) => {
          if (response.ok) {
            this.authenticated = true;
            resolve();
          } else {
            reject(new Error(`Authentication failed: ${response.msg || "Unknown error"}`));
          }
        });
      } else if (this.config.username && this.config.password) {
        // Authenticate with username/password
        this.socket.emit(
          "login",
          {
            username: this.config.username,
            password: this.config.password,
          },
          (response: LoginResponse) => {
            if (response.ok) {
              this.authenticated = true;
              resolve();
            } else {
              reject(new Error(`Authentication failed: ${response.msg || "Unknown error"}`));
            }
          },
        );
      } else {
        reject(new Error("No authentication credentials provided"));
      }
    });
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      await this.authenticate();
    }
  }

  async addMonitor(monitor: AddMonitorInput): Promise<Monitor> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit(
        "add",
        monitor,
        (response: { ok: boolean; msg?: string; monitorID?: number }) => {
          if (response.ok && response.monitorID) {
            resolve({ ...monitor, id: response.monitorID });
          } else {
            reject(new Error(`Failed to add monitor: ${response.msg || "Unknown error"}`));
          }
        },
      );
    });
  }

  async updateMonitor(input: UpdateMonitorInput): Promise<Monitor> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit("editMonitor", input, async (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          // Fetch the updated monitor to return complete data
          try {
            const monitor = await this.getMonitor(input.id);
            resolve(monitor);
          } catch (error) {
            // If fetching fails, return the input data with id
            // This is a fallback to ensure the function still works
            resolve({ ...input, id: input.id } as Monitor);
          }
        } else {
          reject(new Error(`Failed to update monitor: ${response.msg || "Unknown error"}`));
        }
      });
    });
  }

  async removeMonitor(id: number): Promise<void> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit("deleteMonitor", id, (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          resolve();
        } else {
          reject(new Error(`Failed to remove monitor: ${response.msg || "Unknown error"}`));
        }
      });
    });
  }

  async pauseMonitor(id: number): Promise<void> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit("pauseMonitor", id, (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          resolve();
        } else {
          reject(new Error(`Failed to pause monitor: ${response.msg || "Unknown error"}`));
        }
      });
    });
  }

  async resumeMonitor(id: number): Promise<void> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit("resumeMonitor", id, (response: { ok: boolean; msg?: string }) => {
        if (response.ok) {
          resolve();
        } else {
          reject(new Error(`Failed to resume monitor: ${response.msg || "Unknown error"}`));
        }
      });
    });
  }

  async getMonitor(id: number): Promise<Monitor> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit(
        "getMonitor",
        id,
        (response: { ok: boolean; monitor?: Monitor; msg?: string }) => {
          if (response.ok && response.monitor) {
            resolve(response.monitor);
          } else {
            reject(new Error(`Failed to get monitor: ${response.msg || "Unknown error"}`));
          }
        },
      );
    });
  }

  async listMonitors(): Promise<Monitor[]> {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit(
        "getMonitorList",
        (response: { ok: boolean; monitors?: Record<string, Monitor>; msg?: string }) => {
          if (response.ok && response.monitors) {
            resolve(Object.values(response.monitors));
          } else {
            reject(new Error(`Failed to list monitors: ${response.msg || "Unknown error"}`));
          }
        },
      );
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.authenticated = false;
    }
  }
}
