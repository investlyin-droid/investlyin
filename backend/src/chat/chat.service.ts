import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(ChatMessage.name)
        private chatMessageModel: Model<ChatMessageDocument>,
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
        // Get distinct userIds who chatted with ADMIN
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
                $addFields: {
                    userIdObj: {
                        $cond: [
                            { $strcasecmp: ["$_id", "ADMIN"] }, // Check if not 'ADMIN'
                            { $toObjectId: "$_id" },
                            null
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIdObj',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
            },
            {
                $addFields: {
                    userEmail: '$user.email',
                    userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                },
            },
            {
                $project: { user: 0, userIdObj: 0 },
            },
            {
                $sort: { lastTimestamp: -1 },
            },
        ]);
        return recentMessages;
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
