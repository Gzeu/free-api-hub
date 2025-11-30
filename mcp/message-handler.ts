// MCP Message Router with Retry Logic
import { Logger } from 'winston';
import { MCPError, RetryConfig } from './types.js';

export class MessageHandler {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 10000
  };

  constructor(private logger: Logger) {}

  async routeToolCall(
    toolName: string,
    args: Record<string, any>,
    servers: Record<string, any>
  ): Promise<any> {
    const [serverName, methodName] = toolName.split('_');
    
    if (!servers[serverName]) {
      throw this.createError(`Unknown server: ${serverName}`, -32601);
    }

    const server = servers[serverName];
    const method = server[methodName];

    if (typeof method !== 'function') {
      throw this.createError(`Unknown method: ${methodName}`, -32601);
    }

    return await this.executeWithRetry(
      () => method.call(server, args),
      toolName
    );
  }

  private async executeWithRetry(
    fn: () => Promise<any>,
    toolName: string,
    attempt: number = 1
  ): Promise<any> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= this.retryConfig.maxRetries) {
        this.logger.error(`Max retries reached for ${toolName}`, {
          attempt,
          error: error.message
        });
        throw error;
      }

      const delay = this.calculateDelay(attempt);
      this.logger.warn(`Retry ${attempt}/${this.retryConfig.maxRetries} for ${toolName} in ${delay}ms`, {
        error: error.message
      });

      await this.sleep(delay);
      return this.executeWithRetry(fn, toolName, attempt + 1);
    }
  }

  private calculateDelay(attempt: number): number {
    if (this.retryConfig.backoff === 'exponential') {
      const delay = this.retryConfig.initialDelay * Math.pow(2, attempt - 1);
      return Math.min(delay, this.retryConfig.maxDelay);
    }
    return Math.min(
      this.retryConfig.initialDelay * attempt,
      this.retryConfig.maxDelay
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createError(message: string, code: number): MCPError {
    const error = new Error(message) as MCPError;
    error.code = code;
    return error;
  }
}
