import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminKeyGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // health check للـ admin key
  @Get('ping')
  ping(@Headers('x-admin-key') key?: string) {
    return {
      received: key ?? null,
      expectedExists: !!process.env.ADMIN_KEY,
    };
  }

  // ✅ NEW: list users (latest 20)
  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  // approve user
  @Post('users/:id/approve')
  approve(@Param('id') id: string) {
    return this.admin.approveUser(id);
  }

  // Create conversation + members
  @Post('conversations')
  createConversation(
    @Body()
    body: {
      type?: 'DM' | 'GROUP';
      title?: string;
      memberIds: string[];
    },
  ) {
    return this.admin.createConversation(body);
  }

  // Add member to existing conversation
  @Post('conversations/:id/members')
  addMember(
    @Param('id') conversationId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.admin.addMember(conversationId, body);
  }
}
