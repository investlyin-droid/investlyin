import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('support')
export class PublicSupportController {
    constructor(private adminService: AdminService) { }

    @Get('config')
    async getConfig() {
        try {
            const config = await this.adminService.getSupportConfig();
            if (!config.isEnabled) {
                return { isEnabled: false };
            }
            return config;
        } catch (error: any) {
            throw new HttpException(
                error.message || 'Failed to load support config',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
