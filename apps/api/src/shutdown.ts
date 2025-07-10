import { Server } from 'http';
import { closeEmailProducer } from './producers/emailProducer';
import logger from './logger';
import db from './db';
import pulsarCLient from './pulsar';
import { extractError } from 'utils-node/logger';

export default function registerShutdownHooks(server?: Server): void {
    const closeServer = async (exitCode: number = 0) => {
        await closeEmailProducer();
    
        logger.info('Email producer closed successfully.');
    
        await pulsarCLient.close();
    
        logger.info('Pulsar client closed successfully.');
    
        await db.close();
        
        logger.info('Database pool closed successfully.');
        logger.info('Server shutted down.');
    
        process.exit(exitCode);
    }
    
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception', { error: extractError(err) });
        closeServer(1);
    });
    
    process.on('unhandledRejection', (err) => {
        logger.error('Unhandled Rejection', { error: extractError(err) });
        closeServer(1);
    });
    
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT. Shutting down gracefully...');
    
        if (server) {
            server.close(async () => {
                await closeServer();
            });
        } else {
            await closeServer();
        }
    });
      
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM. Shutting down gracefully...');
    
        if (server) {
            server.close(async () => {
                await closeServer();
            });
        } else {
            await closeServer();
        }
    });
}
