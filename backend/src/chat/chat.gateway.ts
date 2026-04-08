import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private chatService: ChatService) { }

    async handleConnection(client: Socket) {
        // Basic connection handling
    }

    handleDisconnect(client: Socket) {
        // Basic disconnection handling
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('join_chat')
    async handleJoinChat(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string, isAdmin?: boolean }) {
        if (data.isAdmin) {
            client.join('admin_support_room');
        } else {
            client.join(`chat_room_${data.userId}`);
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('send_message')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string; content: string; isAdmin?: boolean, targetUserId?: string },
    ) {
        const senderId = data.isAdmin ? 'ADMIN' : data.userId;
        const receiverId = data.isAdmin ? (data.targetUserId || '') : 'ADMIN';

        const message = await this.chatService.saveMessage(senderId, receiverId, data.content, data.isAdmin);

        if (data.isAdmin) {
            // Send to specific user
            this.server.to(`chat_room_${receiverId}`).emit('new_message', message);
            // Also send back to admin to update UI across admin tabs
            this.server.to('admin_support_room').emit('new_message', message);
        } else {
            // Send to admin room
            this.server.to('admin_support_room').emit('new_message', message);
            // Send to user room (for multi-device sync)
            this.server.to(`chat_room_${senderId}`).emit('new_message', message);
        }

        return message;
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('mark_read')
    async handleMarkRead(@MessageBody() data: { userId: string, readerType: 'ADMIN' | 'USER' }) {
        await this.chatService.markAsRead(data.userId, data.readerType);
        this.server.to('admin_support_room').emit('messages_read', { userId: data.userId, readerType: data.readerType });
        this.server.to(`chat_room_${data.userId}`).emit('messages_read', { userId: data.userId, readerType: data.readerType });
    }
}
