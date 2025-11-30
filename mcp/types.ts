// MCP Protocol v1.0 TypeScript Definitions
import { JSONRPCRequest, JSONRPCResponse } from '@modelcontextprotocol/sdk';

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: ServerCapabilities;
  tools: ToolDefinition[];
}

export interface ServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required?: string[];
  };
}

export interface SchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: SchemaProperty;
}

export interface ToolCallRequest extends JSONRPCRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface ToolCallResponse extends JSONRPCResponse {
  result: {
    content: Array<{
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
    }>;
    isError?: boolean;
  };
}

export interface GitHubToolParams {
  action: 'push' | 'pr' | 'issue' | 'read';
  repo: string;
  branch?: string;
  files?: Array<{ path: string; content: string }>;
  title?: string;
  body?: string;
  labels?: string[];
}

export interface NotionToolParams {
  action: 'create' | 'update' | 'query';
  database_id?: string;
  page_id?: string;
  properties?: Record<string, any>;
  content?: any[];
}

export interface SlackToolParams {
  action: 'message' | 'alert' | 'metric';
  channel: string;
  text: string;
  attachments?: any[];
  thread_ts?: string;
}

export interface EmailToolParams {
  action: 'send' | 'template';
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

export interface MCPError extends Error {
  code: number;
  data?: any;
}

export interface RetryConfig {
  maxRetries: number;
  backoff: 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

export interface SecurityConfig {
  apiKeyRotationDays: number;
  tokenRefreshMinutes: number;
  allowedOrigins: string[];
  requireAuth: boolean;
}
