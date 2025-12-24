const WebSocket = require('ws');
const { EventEmitter } = require('events');
const winston = require('winston');

class WebSocketServer extends EventEmitter {
  constructor(server, logger) {
    super();
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.logger = logger || winston.createLogger({ silent: true });
    this.clients = new Map();
    this.rooms = new Map();
    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;
      
      this.clients.set(clientId, {
        ws,
        id: clientId,
        ip: clientIp,
        connectedAt: new Date(),
        rooms: new Set(),
        metadata: {}
      });

      this.logger.info(`WebSocket client connected: ${clientId} from ${clientIp}`);
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to Free API Hub WebSocket'
      });

      // Setup message handler
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          this.logger.error(`Invalid message from ${clientId}:`, error);
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Invalid JSON message'
          });
        }
      });

      // Setup close handler
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Setup error handler
      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for ${clientId}:`, error);
      });

      // Emit connection event
      this.emit('connection', { clientId, ip: clientIp });
    });

    // Heartbeat to detect dead connections
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  handleMessage(clientId, message) {
    const { type, data } = message;

    switch (type) {
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;

      case 'join_room':
        this.joinRoom(clientId, data.room);
        break;

      case 'leave_room':
        this.leaveRoom(clientId, data.room);
        break;

      case 'broadcast':
        this.broadcastToRoom(data.room, {
          type: 'message',
          from: clientId,
          data: data.message,
          timestamp: new Date().toISOString()
        }, clientId);
        break;

      case 'direct_message':
        this.sendToClient(data.to, {
          type: 'direct_message',
          from: clientId,
          data: data.message,
          timestamp: new Date().toISOString()
        });
        break;

      case 'subscribe':
        this.subscribe(clientId, data.channel);
        break;

      case 'unsubscribe':
        this.unsubscribe(clientId, data.channel);
        break;

      default:
        this.emit('message', { clientId, message });
    }
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    client.rooms.forEach(room => {
      this.leaveRoom(clientId, room);
    });

    this.clients.delete(clientId);
    this.logger.info(`WebSocket client disconnected: ${clientId}`);
    this.emit('disconnect', { clientId });
  }

  joinRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }

    this.rooms.get(roomName).add(clientId);
    client.rooms.add(roomName);

    this.sendToClient(clientId, {
      type: 'room_joined',
      room: roomName,
      members: Array.from(this.rooms.get(roomName))
    });

    this.broadcastToRoom(roomName, {
      type: 'user_joined',
      clientId,
      room: roomName
    }, clientId);

    this.logger.info(`Client ${clientId} joined room ${roomName}`);
  }

  leaveRoom(clientId, roomName) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const room = this.rooms.get(roomName);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomName);
      } else {
        this.broadcastToRoom(roomName, {
          type: 'user_left',
          clientId,
          room: roomName
        });
      }
    }

    client.rooms.delete(roomName);
    this.logger.info(`Client ${clientId} left room ${roomName}`);
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return false;

    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      this.logger.error(`Failed to send to ${clientId}:`, error);
      return false;
    }
  }

  broadcastToRoom(roomName, data, excludeClientId = null) {
    const room = this.rooms.get(roomName);
    if (!room) return 0;

    let sentCount = 0;
    room.forEach(clientId => {
      if (clientId !== excludeClientId) {
        if (this.sendToClient(clientId, data)) {
          sentCount++;
        }
      }
    });

    return sentCount;
  }

  broadcast(data, excludeClientId = null) {
    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(data));
          sentCount++;
        } catch (error) {
          this.logger.error(`Broadcast failed to ${clientId}:`, error);
        }
      }
    });
    return sentCount;
  }

  subscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!client.metadata.subscriptions) {
      client.metadata.subscriptions = new Set();
    }

    client.metadata.subscriptions.add(channel);
    this.sendToClient(clientId, {
      type: 'subscribed',
      channel
    });
  }

  unsubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client || !client.metadata.subscriptions) return;

    client.metadata.subscriptions.delete(channel);
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel
    });
  }

  publishToChannel(channel, data) {
    let sentCount = 0;
    this.clients.forEach((client, clientId) => {
      if (client.metadata.subscriptions && client.metadata.subscriptions.has(channel)) {
        if (this.sendToClient(clientId, {
          type: 'channel_message',
          channel,
          data,
          timestamp: new Date().toISOString()
        })) {
          sentCount++;
        }
      }
    });
    return sentCount;
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([name, members]) => ({
        name,
        members: members.size
      })),
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        ip: client.ip,
        connectedAt: client.connectedAt,
        rooms: Array.from(client.rooms),
        subscriptions: client.metadata.subscriptions ? Array.from(client.metadata.subscriptions) : []
      }))
    };
  }

  close() {
    this.wss.clients.forEach(ws => ws.close());
    this.wss.close();
  }
}

module.exports = WebSocketServer;
