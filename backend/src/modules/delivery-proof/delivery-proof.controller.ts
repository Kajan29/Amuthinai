import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

import { DeliveryProofService } from './delivery-proof.service';

/** Proof is submitted through the assignments routes; this exposes it for review. */
@ApiTags('delivery-proof')
@ApiBearerAuth()
@Controller('delivery-proof')
export class DeliveryProofController {
  constructor(private readonly deliveryProofService: DeliveryProofService) {}

  @Get(':assignmentId')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR9 — pickup and delivery evidence for one assignment' })
  findByAssignment(@Param('assignmentId') assignmentId: string) {
    return this.deliveryProofService.findByAssignment(assignmentId);
  }
}
