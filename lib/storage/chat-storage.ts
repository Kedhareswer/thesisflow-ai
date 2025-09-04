import { openDB } from 'idb';
import type { Message, User, Conversation } from '@/lib/supabase';

// Simplified storage without complex typing for now

class ChatStorage {
    private db: any = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.initDB();
        return this.initPromise;
    }

    private async initDB(): Promise<void> {
        this.db = await openDB('chat-storage', 1, {
            upgrade(db) {
                // Conversations store
                const conversationsStore = db.createObjectStore('conversations', {
                    keyPath: 'id'
                });
                conversationsStore.createIndex('by-updated', 'updated_at');

                // Messages store
                const messagesStore = db.createObjectStore('messages', {
                    keyPath: 'id'
                });
                messagesStore.createIndex('by-conversation', 'conversation_id');
                messagesStore.createIndex('by-conversation-date', ['conversation_id', 'created_at']);
                messagesStore.createIndex('by-temp-id', 'temp_id');

                // Users store
                const usersStore = db.createObjectStore('users', {
                    keyPath: 'id'
                });
                usersStore.createIndex('by-username', 'username');

                // Sync metadata store
                db.createObjectStore('sync_metadata', {
                    keyPath: 'type'
                });
            }
        });
    }

    // Conversations
    async saveConversations(conversations: Conversation[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        const tx = this.db.transaction('conversations', 'readwrite');
        const now = new Date().toISOString();

        await Promise.all(
            conversations.map(conv =>
                tx.store.put({
                    ...conv,
                    last_sync: now
                })
            )
        );

        await tx.done;
    }

    async getConversations(): Promise<Conversation[]> {
        await this.init();
        if (!this.db) return [];

        const conversations = await this.db.getAll('conversations');
        return conversations.map((conv: any) => {
            const { last_sync, ...cleanConv } = conv;
            return cleanConv;
        });
    }

    async getConversation(id: string): Promise<Conversation | null> {
        await this.init();
        if (!this.db) return null;

        const conversation = await this.db.get('conversations', id);
        if (!conversation) return null;

        const { last_sync, ...conv } = conversation;
        return conv as Conversation;
    }

    // Messages
    async saveMessages(messages: Message[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        const tx = this.db.transaction('messages', 'readwrite');
        const now = new Date().toISOString();

        await Promise.all(
            messages.map(msg =>
                tx.store.put({
                    ...msg,
                    last_sync: now
                })
            )
        );

        await tx.done;
    }

    async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
        await this.init();
        if (!this.db) return [];

        const tx = this.db.transaction('messages', 'readonly');
        const index = tx.store.index('by-conversation-date');

        let cursor = await index.openCursor(
            IDBKeyRange.bound([conversationId, ''], [conversationId, '\uffff']),
            'prev'
        );

        const messages: Message[] = [];
        let count = 0;

        while (cursor && count < limit) {
            const { last_sync, temp_id, ...msg } = cursor.value;
            messages.push(msg as Message);
            cursor = await cursor.continue();
            count++;
        }

        return messages.reverse(); // Return in chronological order
    }

    async saveMessage(message: Message, tempId?: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        await this.db.put('messages', {
            ...message,
            temp_id: tempId,
            last_sync: new Date().toISOString()
        });
    }

    async getMessageByTempId(tempId: string): Promise<Message | null> {
        await this.init();
        if (!this.db) return null;

        const tx = this.db.transaction('messages', 'readonly');
        const index = tx.store.index('by-temp-id');
        const message = await index.get(tempId);

        if (!message) return null;

        const { last_sync, temp_id, ...msg } = message;
        return msg as Message;
    }

    async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
        await this.init();
        if (!this.db) return;

        const existing = await this.db.get('messages', messageId);
        if (!existing) return;

        await this.db.put('messages', {
            ...existing,
            ...updates,
            last_sync: new Date().toISOString()
        });
    }

    async deleteMessage(messageId: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        await this.db.delete('messages', messageId);
    }

    // Users
    async saveUsers(users: User[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        const tx = this.db.transaction('users', 'readwrite');
        const now = new Date().toISOString();

        await Promise.all(
            users.map(user =>
                tx.store.put({
                    ...user,
                    last_sync: now
                })
            )
        );

        await tx.done;
    }

    async getUsers(): Promise<User[]> {
        await this.init();
        if (!this.db) return [];

        const users = await this.db.getAll('users');
        return users.map((user: any) => {
            const { last_sync, ...cleanUser } = user;
            return cleanUser;
        });
    }

    async getUser(id: string): Promise<User | null> {
        await this.init();
        if (!this.db) return null;

        const user = await this.db.get('users', id);
        if (!user) return null;

        const { last_sync, ...userData } = user;
        return userData as User;
    }

    // Sync metadata
    async getLastSync(type: 'conversations' | 'messages' | 'users'): Promise<string | null> {
        await this.init();
        if (!this.db) return null;

        const metadata = await this.db.get('sync_metadata', type);
        return metadata?.last_sync || null;
    }

    async setLastSync(type: 'conversations' | 'messages' | 'users', timestamp: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        await this.db.put('sync_metadata', {
            type,
            last_sync: timestamp
        });
    }

    // Utility methods
    async clear(): Promise<void> {
        await this.init();
        if (!this.db) return;

        const tx = this.db.transaction(['conversations', 'messages', 'users', 'sync_metadata'], 'readwrite');

        await tx.objectStore('conversations').clear();
        await tx.objectStore('messages').clear();
        await tx.objectStore('users').clear();
        await tx.objectStore('sync_metadata').clear();

        await tx.done;
    }

    // Additional methods needed by use-chat-socket
    async addMessage(message: Message): Promise<void> {
        return this.saveMessage(message);
    }

    async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
        await this.init();
        if (!this.db) return;

        const existing = await this.db.get('conversations', conversationId);
        if (!existing) return;

        await this.db.put('conversations', {
            ...existing,
            ...updates,
            last_sync: new Date().toISOString()
        });
    }

    async confirmOptimisticMessage(tempId: string, serverMessage: Message): Promise<void> {
        await this.init();
        if (!this.db) return;

        // Find and remove the optimistic message
        const tx = this.db.transaction('messages', 'readwrite');
        const index = tx.store.index('by-temp-id');
        const cursor = await index.openCursor(tempId);

        if (cursor) {
            await cursor.delete();
        }

        // Add the server message
        await this.saveMessage(serverMessage);
    }

    async addOptimisticMessage(
        conversationId: string,
        tempId: string,
        content: string,
        userId: string,
        messageType: 'text' | 'image' | 'file' = 'text'
    ): Promise<Message> {
        const optimisticMessage: Message = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: userId,
            content,
            message_type: messageType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            delivery_status: 'sent',
            reply_to_message_id: undefined
        };

        await this.saveMessage(optimisticMessage, tempId);
        return optimisticMessage;
    }

    async updateUserStatus(
        userId: string,
        status: 'online' | 'offline' | 'away',
        isOnline: boolean
    ): Promise<void> {
        await this.init();
        if (!this.db) return;

        const existing = await this.db.get('users', userId);
        if (!existing) return;

        await this.db.put('users', {
            ...existing,
            status,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
            last_sync: new Date().toISOString()
        });
    }

    async getStorageStats(): Promise<{
        conversations: number;
        messages: number;
        users: number;
        totalSize: number;
    }> {
        await this.init();
        if (!this.db) return { conversations: 0, messages: 0, users: 0, totalSize: 0 };

        const [conversations, messages, users] = await Promise.all([
            this.db.count('conversations'),
            this.db.count('messages'),
            this.db.count('users')
        ]);

        const totalSize = (conversations * 1000) + (messages * 500) + (users * 200);

        return {
            conversations,
            messages,
            users,
            totalSize
        };
    }
}

export const chatStorage = new ChatStorage();