const WebSocket = require('ws');
const { EventEmitter } = require('events');
const logger = require('winston');

class WebSocketServer extends EventEmitter {
  constructor(server) {
    super();
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map();
    this.rooms = new Map();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0
    };
    
    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;
      
      const client = {
        id: clientId,
        ws,
        ip: clientIp,
        connectedAt: new Date(),
        subscriptions: new Set(),
        metadata: {}
      };
      
      this.clients.set(clientId, client);
      this.stats.totalConnections++;
      this.stats.activeConnections++;
      
      logger.info(`WebSocket client connected: ${clientId} from ${clientIp}`);
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'welcome',
        clientId,
        timestamp: new Date().toISOString(),
        stats: this.getStats()
      });
      
      // Handle messages
      ws.on('message', (data) => this.handleMessage(clientId, data));
      
      // Handle close
      ws.on('close', () => this.handleDisconnect(clientId));
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
      });
      
      // Heartbeat
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });
    
    // Heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data.toString());
      this.stats.messagesReceived++;
      this.stats.bytesTransferred += data.length;
      
      logger.info(`Message from ${clientId}:`, message.type);
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message.channel);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.channel);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        case 'broadcast':
          this.broadcast(message.data, clientId);
          break;
        case 'room_join':
          this.joinRoom(clientId, message.room);
          break;
        case 'room_leave':
          this.leaveRoom(clientId, message.room);
          break;
        case 'room_message':
          this.sendToRoom(message.room, message.data, clientId);
          break;
        default:
          this.emit('message', { clientId, message });
      }
    } catch (error) {
      logger.error(`Failed to parse message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  handleSubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(channel);
      this.sendToClient(clientId, {
        type: 'subscribed',
        channel,
        timestamp: new Date().toISOString()
      });
      logger.info(`Client ${clientId} subscribed to ${channel}`);
    }
  }

  handleUnsubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(channel);
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        channel,
        timestamp: new Date().toISOString()
      });
      logger.info(`Client ${clientId} unsubscribed from ${channel}`);
    }
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all rooms
      this.rooms.forEach((members, room) => {
        if (members.has(clientId)) {
          this.leaveRoom(clientId, room);
        }
      });
      
      this.clients.delete(clientId);
      this.stats.activeConnections--;
      logger.info(`Client ${clientId} disconnected`);
    }
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      client.ws.send(message);
      this.stats.messagesSent++;
      this.stats.bytesTransferred += message.length;
      return true;
    }
    return false;
  }

  broadcast(data, excludeClientId = null) {
    let sent = 0;
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        if (this.sendToClient(clientId, data)) {
          sent++;
        }
      }
    });
    return sent;
  }

  publishToChannel(channel, data) {
    let sent = 0;
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        if (this.sendToClient(clientId, { type: 'channel_message', channel, data })) {
          sent++;
        }
      }
    });
    return sent;
  }

  joinRoom(clientId, room) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(clientId);
    
    this.sendToClient(clientId, {
      type: 'room_joined',
      room,
      members: this.rooms.get(room).size,
      timestamp: new Date().toISOString()
    });
    
    // Notify others in room
    this.sendToRoom(room, {
      type: 'room_member_joined',
      clientId,
      members: this.rooms.get(room).size
    }, clientId);
    
    logger.info(`Client ${clientId} joined room ${room}`);
  }

  leaveRoom(clientId, room) {
    const roomMembers = this.rooms.get(room);
    if (roomMembers) {
      roomMembers.delete(clientId);
      
      this.sendToClient(clientId, {
        type: 'room_left',
        room,
        timestamp: new Date().toISOString()
      });
      
      // Notify others
      this.sendToRoom(room, {
        type: 'room_member_left',
        clientId,
        members: roomMembers.size
      }, clientId);
      
      // Clean up empty rooms
      if (roomMembers.size === 0) {
        this.rooms.delete(room);
      }
      
      logger.info(`Client ${clientId} left room ${room}`);
    }
  }

  sendToRoom(room, data, excludeClientId = null) {
    const members = this.rooms.get(room);
    if (!members) return 0;
    
    let sent = 0;
    members.forEach(clientId => {
      if (clientId !== excludeClientId) {
        if (this.sendToClient(clientId, data)) {
          sent++;
        }
      }
    });
    return sent;
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      ...this.stats,
      activeConnections: this.clients.size,
      activeRooms: this.rooms.size,
      timestamp: new Date().toISOString()
    };
  }

  getClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      ip: client.ip,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscriptions),
      uptime: Date.now() - client.connectedAt.getTime()
    }));
  }

  getRooms() {
    return Array.from(this.rooms.entries()).map(([room, members]) => ({
      room,
      members: members.size,
      clients: Array.from(members)
    }));
  }

  close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}

module.exports = WebSocketServer;
