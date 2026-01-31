/**
 * Service initialization and dependency injection container
 */

import { AuthService } from '../../application/services/AuthService';
import { UserService } from '../../application/services/UserService';
import { PostService } from '../../application/services/PostService';
import { MessageService } from '../../application/services/MessageService';
import { NotificationService } from '../../application/services/NotificationService';

// Service container
interface ServiceContainer {
  authService: AuthService;
  userService: UserService;
  postService: PostService;
  messageService: MessageService;
  notificationService: NotificationService;
}

let serviceContainer: ServiceContainer | null = null;

/**
 * Initialize all core services
 */
export async function initializeServices(): Promise<void> {
  try {
    // Initialize services in dependency order
    const authService = new AuthService();
    await authService.initialize();
    
    const userService = new UserService();
    const postService = new PostService();
    const messageService = new MessageService();
    const notificationService = new NotificationService();
    
    // Create service container
    serviceContainer = {
      authService,
      userService,
      postService,
      messageService,
      notificationService
    };
    
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Get service container instance
 */
export function getServiceContainer(): ServiceContainer {
  if (!serviceContainer) {
    throw new Error('Services not initialized. Call initializeServices() first.');
  }
  return serviceContainer;
}

/**
 * Get specific service instance
 */
export function getAuthService(): AuthService {
  return getServiceContainer().authService;
}

export function getUserService(): UserService {
  return getServiceContainer().userService;
}

export function getPostService(): PostService {
  return getServiceContainer().postService;
}

export function getMessageService(): MessageService {
  return getServiceContainer().messageService;
}

export function getNotificationService(): NotificationService {
  return getServiceContainer().notificationService;
}