import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { FirestoreUsersService } from '../users/firestore-users.service';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(ChatMessage.name)
        private chatMessageModel: Model<ChatMessageDocument>,
        private usersService: FirestoreUsersService,
    ) { }

    async saveMessage(senderId: string, receiverId: string, content: string, isAdmin = false) {
        const newMessage = new this.chatMessageModel({
            senderId,
            receiverId,
            content,
            isAdmin,
        });
        return newMessage.save();
    }

    async getUserMessages(userId: string) {
        // Both messages sent by user and to user
        return this.chatMessageModel
            .find({
                $or: [
                    { senderId: userId, receiverId: 'ADMIN' },
                    { senderId: 'ADMIN', receiverId: userId },
                ],
            })
            .sort({ createdAt: 1 })
            .exec();
    }

    async getAdminRecentChats() {
        // Get distinct userIds who chatted with ADMIN from MongoDB
        const recentMessages = await this.chatMessageModel.aggregate([
            {
                $match: {
                    $or: [{ receiverId: 'ADMIN' }, { senderId: 'ADMIN' }],
                },
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', 'ADMIN'] },
                            '$receiverId',
                            '$senderId',
                        ],
                    },
                    lastMessage: { $first: '$content' },
                    lastTimestamp: { $first: '$createdAt' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiverId', 'ADMIN'] },
                                        { $eq: ['$isRead', false] },
                                    ],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $sort: { lastTimestamp: -1 },
            },
        ]);

        // Augment each chat entry with Firestore profile data
        const enriched = await Promise.all(
            recentMessages.map(async (chat) => {
                if (!chat._id || chat._id === 'ADMIN') return chat;
                try {
                    const user = await this.usersService.findById(chat._id);
                    return {
                        ...chat,
                        userName: user ? `${user.firstName} ${user.lastName}` : 'User ' + chat._id.slice(-4),
                        userEmail: user?.email || '',
                    };
                } catch (err) {
                    console.error('Failed to fetch user from Firestore', chat._id, err);
                    return chat;
                }
            })
        );

        return enriched;
    }

    async markAsRead(userId: string, readerType: 'ADMIN' | 'USER') {
        if (readerType === 'ADMIN') {
            await this.chatMessageModel.updateMany(
                { senderId: userId, receiverId: 'ADMIN', isRead: false },
                { isRead: true },
            );
        } else {
            await this.chatMessageModel.updateMany(
                { senderId: 'ADMIN', receiverId: userId, isRead: false },
                { isRead: true },
            );
        }
    }
}
