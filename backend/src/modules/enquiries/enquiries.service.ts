import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';

import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { Enquiry, EnquiryDocument, type EnquiryStatus } from './schemas/enquiry.schema';

@Injectable()
export class EnquiriesService {
  constructor(@InjectModel(Enquiry.name) private readonly model: Model<Enquiry>) {}

  create(raisedBy: string, dto: CreateEnquiryDto): Promise<EnquiryDocument> {
    return this.model.create({
      raisedBy: new Types.ObjectId(raisedBy),
      donationId: dto.donationId ? new Types.ObjectId(dto.donationId) : undefined,
      subject: dto.subject,
      body: dto.body,
    });
  }

  async findAll(
    query: PaginationQueryDto,
    scope?: { raisedBy?: string; status?: EnquiryStatus },
  ): Promise<PaginatedDto<EnquiryDocument>> {
    const filter: FilterQuery<Enquiry> = {};
    if (scope?.raisedBy) filter.raisedBy = new Types.ObjectId(scope.raisedBy);
    if (scope?.status) filter.status = scope.status;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  async resolve(id: string, adminId: string, resolution: string): Promise<EnquiryDocument> {
    const enquiry = await this.model.findById(id).exec();
    if (!enquiry) throw new NotFoundException('Enquiry not found');

    enquiry.status = 'resolved';
    enquiry.resolution = resolution;
    enquiry.resolvedBy = new Types.ObjectId(adminId);
    enquiry.resolvedAt = new Date();
    return enquiry.save();
  }

  countOpen() {
    return this.model.countDocuments({ status: { $ne: 'resolved' } }).exec();
  }
}
