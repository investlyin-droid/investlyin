import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminAllowlistGuard } from '../auth/guards/admin-allowlist.guard';

@Controller('chat')
export class ChatController {
    constructor(private chatService: ChatService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('messages/:userId')
    async getMessages(@Param('userId') userId: string, @Request() req: any) {
        // If user is not admin and trying to access another user's messages
        if (!req.user.isAdmin && req.user.userId !== userId) {
            throw new Error('Unauthorized');
        }
        return this.chatService.getUserMessages(userId);
    }

    @UseGuards(AuthGuard('jwt'), AdminAllowlistGuard)
    @Get('recent-chats')
    async getRecentChats() {
        return this.chatService.getAdminRecentChats();
    }
}
