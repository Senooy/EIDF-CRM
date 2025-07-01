import amqp from 'amqplib';
import { logger } from './logger';

export class MessageQueue {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private url: string;
  public isConnected: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      
      logger.info('Connected to RabbitMQ');
      
      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, message: any) {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: true,
        timestamp: Date.now(),
      });
      
      logger.debug(`Message published to ${exchange}/${routingKey}`, message);
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async subscribe(
    exchange: string,
    pattern: string = '#',
    handler: (message: any) => Promise<void>
  ) {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      
      const q = await this.channel.assertQueue('', { exclusive: true });
      await this.channel.bindQueue(q.queue, exchange, pattern);
      
      await this.channel.consume(q.queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug(`Received message from ${exchange}:`, content);
            
            await handler(content);
            this.channel!.ack(msg);
          } catch (error) {
            logger.error('Error processing message:', error);
            // Reject and requeue the message
            this.channel!.nack(msg, false, true);
          }
        }
      });
      
      logger.info(`Subscribed to ${exchange}/${pattern}`);
    } catch (error) {
      logger.error('Failed to subscribe:', error);
      throw error;
    }
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    this.isConnected = false;
  }
}