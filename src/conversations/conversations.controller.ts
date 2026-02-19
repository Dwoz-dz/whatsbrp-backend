import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly convs: ConversationsService) {}

  @Get()
  async listMine(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing user in request');
    return this.convs.listMyConversations(userId);
  }

  @Get(':id/messages')
  async listMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Missing user in request');

    const take = limit ? Number(limit) : 30;
    return this.convs.listMessages(conversationId, userId, take, cursor);
  }
}
