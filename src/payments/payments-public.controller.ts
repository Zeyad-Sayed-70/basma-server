import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Res,
  Query,
  HttpCode,
  Redirect,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymobWebhookDto } from './dto/paymob-webhook.dto';
import { WebhookResponseDto } from './dto/payment-response.dto';

@ApiTags('Payments — Public (Webhook & Redirect)')
@Controller('payments')
export class PaymentsPublicController {
  private readonly logger = new Logger(PaymentsPublicController.name);
  private readonly frontendBaseUrl: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    configService: ConfigService,
  ) {
    this.frontendBaseUrl =
      configService.get<string>('FRONTEND_BASE_URL') ?? 'http://localhost:3000';
  }

  @Post('webhook/paymob/:instanceId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paymob processed callback webhook (signed, HMAC-verified)',
    description:
      '**This is the source of truth for payment status.**\n\n' +
      'Paymob calls this endpoint after a transaction completes (success, failure, refund, void). ' +
      "The request body is HMAC-SHA512 signed using the instance's HMAC secret.\n\n" +
      '**Security:**\n' +
      '- The endpoint is public (no JWT) — security relies entirely on HMAC verification\n' +
      '- If HMAC is invalid, the request is rejected with 401\n' +
      '- The webhook is idempotent — replaying the same payload does not double-process\n\n' +
      '**How to test:**\n' +
      '1. Expose your local server via ngrok: `ngrok http 3000`\n' +
      '2. Set `PAYMOB_WEBHOOK_BASE_URL` to your ngrok URL\n' +
      "3. Configure the instance's `notification_url` per-intention (done automatically)\n" +
      '4. Complete a test payment — Paymob will POST to this endpoint\n\n' +
      "Alternatively, use Paymob's Webhook Testing Tool in the dashboard to simulate callbacks.",
  })
  @ApiParam({
    name: 'instanceId',
    description:
      'Instance ID — used to look up the correct HMAC secret for verification. Extracted from the JWT claim when the intention was created.',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @ApiBody({
    description:
      'Paymob callback JSON payload. The `hmac` field is the HMAC-SHA512 signature to verify.',
    type: PaymobWebhookDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Webhook received and processed. Always returns 200 to acknowledge receipt (even if HMAC fails — in that case an exception is thrown).',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      "HMAC verification failed — signature does not match the instance's HMAC secret.",
  })
  async handlePaymobWebhook(
    @Param('instanceId') instanceId: string,
    @Body() body: Record<string, unknown>,
    @Query('hmac') queryHmac: string | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(
      `Webhook received for instance ${instanceId} (content-type: ${req.headers['content-type']})`,
    );
    return this.paymentsService.handleWebhook(instanceId, body, queryHmac);
  }

  @Get('return')
  @HttpCode(302)
  @ApiOperation({
    summary: 'Redirect URL after Paymob checkout (UX only)',
    description:
      "Paymob redirects the student's browser here after the checkout flow completes. " +
      '**This is NOT the source of truth for payment status.**\n\n' +
      'The redirect contains query params (paymentId, success) that are purely for UX. ' +
      'The actual payment status is confirmed via the POST webhook at /payments/webhook/paymob/:instanceId.\n\n' +
      'The student is redirected to the frontend with the status in the URL.',
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirects to frontend: {FRONTEND_BASE_URL}/payments/{paymentId}/result?status={success|pending}',
  })
  async handleReturn(
    @Query('paymentId') paymentId: string,
    @Query('success') success: string,
    @Res() res: Response,
  ) {
    const status = success === 'true' ? 'success' : 'pending';
    const redirectUrl = `${this.frontendBaseUrl}/payments/${paymentId}/result?status=${status}`;
    return res.redirect(redirectUrl);
  }
}
