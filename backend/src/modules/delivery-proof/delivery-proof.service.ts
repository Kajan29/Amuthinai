import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { SubmitProofDto } from './dto/submit-proof.dto';
import {
  DeliveryProof,
  DeliveryProofDocument,
  type ProofStage,
} from './schemas/delivery-proof.schema';

@Injectable()
export class DeliveryProofService {
  constructor(@InjectModel(DeliveryProof.name) private readonly model: Model<DeliveryProof>) {}

  /** FR9 — `capturedAt` comes from the server clock, so a tampered device cannot backdate it. */
  async record(
    assignmentId: string,
    stage: ProofStage,
    dto: Partial<SubmitProofDto>,
    pinVerified: boolean,
    recordedBy: 'volunteer' | 'donor' | 'admin' = 'volunteer',
  ): Promise<DeliveryProofDocument> {
    const existing = await this.model.exists({ assignmentId, stage });
    if (existing) throw new ConflictException(`${stage} proof was already submitted`);

    return this.model.create({
      assignmentId: new Types.ObjectId(assignmentId),
      stage,
      photoUrl: dto.photoUrl,
      location: dto.location,
      pinVerified,
      quantityConfirmed: dto.quantityConfirmed,
      note: dto.note,
      recordedBy,
    });
  }

  findByAssignment(assignmentId: string) {
    return this.model
      .find({ assignmentId: new Types.ObjectId(assignmentId) })
      .sort({ capturedAt: 1 })
      .exec();
  }

  findByAssignments(assignmentIds: string[]) {
    if (assignmentIds.length === 0) return Promise.resolve([]);
    return this.model
      .find({ assignmentId: { $in: assignmentIds.map((id) => new Types.ObjectId(id)) } })
      .sort({ capturedAt: 1 })
      .exec();
  }

  async findOne(assignmentId: string, stage: ProofStage): Promise<DeliveryProofDocument> {
    const proof = await this.model.findOne({ assignmentId, stage }).exec();
    if (!proof) throw new NotFoundException(`No ${stage} proof for this assignment`);
    return proof;
  }
}
