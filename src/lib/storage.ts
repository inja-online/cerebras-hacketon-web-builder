import Dexie, { type Table } from 'dexie';
import type { ChatEvent, Project } from './types';

export const apiKeyStorageKey = "openrouter_api_key";
export const selectedModelKey = "selected_model";
export const selectedProviderKey = "selected_provider";


// Setting interface
export interface Setting {
  key: string; // Primary key
  value: any;
}

// Database interface
interface AppDatabase extends Dexie {
  chatEvents: Table<ChatEvent>;
  projects: Table<Project>;
  settings: Table<Setting, string>; // string is the type of the primary key 'key'
}

// Database instance
class AppDB extends Dexie implements AppDatabase {
  chatEvents!: Table<ChatEvent>;
  projects!: Table<Project>;
  settings!: Table<Setting, string>;

  constructor() {
    super('AppDatabase');
    this.version(1).stores({
      chatEvents: 'id, type, timestamp, userId, projectId, [projectId+timestamp]',
      projects: 'id, name, createdAt, updatedAt, isPrivate'
    });
    // Add a new version for the settings table
    // All existing stores must be repeated in the new version schema.
    this.version(2).stores({
      chatEvents: 'id, type, timestamp, userId, projectId, [projectId+timestamp]',
      projects: 'id, name, createdAt, updatedAt, isPrivate',
      settings: '&key' // '&key' makes 'key' the primary key and ensures it's unique.
    });
    // Add new version for model and provider in chatEvents
    this.version(3).stores({
      chatEvents: 'id, type, timestamp, userId, projectId, [projectId+timestamp], model, provider', // Added model and provider
      projects: 'id, name, createdAt, updatedAt, isPrivate',
      settings: '&key'
    });
  }
}

export const db = new AppDB();

// Chat Events Storage Functions
export const chatEventStorage = {
  async store(event: ChatEvent, projectId?: string): Promise<void> {
    const eventWithProject = { ...event, projectId };
    await db.chatEvents.add(eventWithProject);
  },

  async get(id: string): Promise<ChatEvent | undefined> {
    return await db.chatEvents.get(id);
  },

  async getByProject(projectId: string): Promise<ChatEvent[]> {
    // Use the compound index for efficient querying and ordering
    return await db.chatEvents
      .where('[projectId+timestamp]')
      .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey])
      .toArray();
    // Alternative if not using compound index, but less efficient:
    // return await db.chatEvents.where('projectId').equals(projectId).sortBy('timestamp');
  },

  async getAll(): Promise<ChatEvent[]> {
    return await db.chatEvents.orderBy('timestamp').toArray();
  },

  async update(id: string, changes: Partial<ChatEvent>): Promise<void> {
    await db.chatEvents.update(id, { ...changes, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    await db.chatEvents.delete(id);
  },

  async deleteByProject(projectId: string): Promise<void> {
    await db.chatEvents.where('projectId').equals(projectId).delete();
  },

  async clear(): Promise<void> {
    await db.chatEvents.clear();
  }
};

// Projects Storage Functions
export const projectStorage = {
  async store(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    await db.projects.add(newProject);
    return newProject.id;
  },

  async get(id: string): Promise<Project | undefined> {
    return await db.projects.get(id);
  },

  async getAll(): Promise<Project[]> {
    return await db.projects.orderBy('updatedAt').reverse().toArray();
  },

  async getRecent(limit: number = 5): Promise<Project[]> {
    return await db.projects.orderBy('updatedAt').reverse().limit(limit).toArray();
  },

  async update(id: string, changes: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    await db.projects.update(id, { ...changes, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    // Delete associated chat events first
    await chatEventStorage.deleteByProject(id);
    // Delete the project
    await db.projects.delete(id);
  },

  async clear(): Promise<void> {
    await db.projects.clear();
    await chatEventStorage.clear();
  },

  async search(query: string): Promise<Project[]> {
    return await db.projects
      .filter(project => 
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        project.description.toLowerCase().includes(query.toLowerCase())
      )
      .toArray();
  }
};

// Utility function to format time ago
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
}

// Settings Storage Functions
export const settingsStorage = {
  async setSetting(key: string, value: any): Promise<void> {
    try {
      await db.settings.put({ key, value });
    } catch (error) {
      console.error(`Failed to set setting '${key}':`, error);
      throw error;
    }
  },

  async getSetting<T = any>(key: string): Promise<T | undefined> {
    try {
      const setting = await db.settings.get(key);
      return setting?.value as T | undefined;
    } catch (error) {
      console.error(`Failed to get setting '${key}':`, error);
      // Optionally return a default value or rethrow
      return undefined;
    }
  },

  async deleteSetting(key: string): Promise<void> {
    try {
      await db.settings.delete(key);
    } catch (error) {
      console.error(`Failed to delete setting '${key}':`, error);
      throw error;
    }
  }
};
