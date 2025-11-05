import { z } from "zod";

// Authentication schemas
export const AuthConfigSchema = z.object({
  url: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional(),
  apiKey: z.string().optional(),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// Monitor type enum matching uptime-kuma types
export const MonitorTypeSchema = z.enum([
  "http",
  "port",
  "ping",
  "keyword",
  "grpc-keyword",
  "json-query",
  "dns",
  "docker",
  "push",
  "steam",
  "mqtt",
  "kafka-producer",
  "sqlserver",
  "postgres",
  "mysql",
  "mongodb",
  "radius",
  "redis",
  "group",
  "gamedig",
  "tailscale-ping",
]);

export type MonitorType = z.infer<typeof MonitorTypeSchema>;

// Monitor configuration schema
export const MonitorConfigSchema = z.object({
  name: z.string(),
  type: MonitorTypeSchema,
  url: z.string().optional(),
  hostname: z.string().optional(),
  port: z.number().optional(),
  interval: z.number().default(60),
  retryInterval: z.number().optional(),
  maxretries: z.number().optional(),
  notificationIDList: z.array(z.number()).optional(),
  active: z.boolean().default(true),
  timeout: z.number().optional(),
  method: z.string().optional(),
  headers: z.string().optional(),
  body: z.string().optional(),
  keyword: z.string().optional(),
  invertKeyword: z.boolean().optional(),
  expectedStatusCode: z.string().optional(),
  ignoreTls: z.boolean().optional(),
  upsideDown: z.boolean().optional(),
  maxredirects: z.number().optional(),
  acceptedStatusCodes: z.array(z.string()).optional(),
  proxyId: z.number().optional(),
  dns_resolve_server: z.string().optional(),
  dns_resolve_type: z.string().optional(),
  description: z.string().optional(),
  parent: z.number().optional(),
  pathName: z.string().optional(),
});

export type MonitorConfig = z.infer<typeof MonitorConfigSchema>;

// Tool input schemas
export const AddMonitorInputSchema = MonitorConfigSchema;

export const UpdateMonitorInputSchema = z.object({
  id: z.number(),
  ...MonitorConfigSchema.partial().shape,
});

export const RemoveMonitorInputSchema = z.object({
  id: z.number(),
});

export const PauseMonitorInputSchema = z.object({
  id: z.number(),
});

export const ResumeMonitorInputSchema = z.object({
  id: z.number(),
});

export const GetMonitorInputSchema = z.object({
  id: z.number(),
});

export const ListMonitorsInputSchema = z.object({});

export type AddMonitorInput = z.infer<typeof AddMonitorInputSchema>;
export type UpdateMonitorInput = z.infer<typeof UpdateMonitorInputSchema>;
export type RemoveMonitorInput = z.infer<typeof RemoveMonitorInputSchema>;
export type PauseMonitorInput = z.infer<typeof PauseMonitorInputSchema>;
export type ResumeMonitorInput = z.infer<typeof ResumeMonitorInputSchema>;
export type GetMonitorInput = z.infer<typeof GetMonitorInputSchema>;
export type ListMonitorsInput = z.infer<typeof ListMonitorsInputSchema>;
