import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { nearSphere } from 'src/common/utils/geo.util';

import { CreateNgoDto, UpdateNgoDto } from './dto/create-ngo.dto';
import { Ngo, NgoDocument } from './schemas/ngo.schema';

@Injectable()
export class NgosService {
  constructor(@InjectModel(Ngo.name) private readonly model: Model<Ngo>) {}

  create(dto: CreateNgoDto): Promise<NgoDocument> {
    return this.model.create(dto);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedDto<NgoDocument>> {
    const filter = { isActive: true };

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ name: 1 }).skip(query.skip).limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  async findById(id: string): Promise<NgoDocument> {
    const ngo = await this.model.findById(id).exec();
    if (!ngo) throw new NotFoundException('NGO not found');
    return ngo;
  }

  async update(id: string, dto: UpdateNgoDto): Promise<NgoDocument> {
    const ngo = await this.findById(id);
    Object.assign(ngo, dto);
    return ngo.save();
  }

  async deactivate(id: string): Promise<NgoDocument> {
    const ngo = await this.findById(id);
    ngo.isActive = false;
    return ngo.save();
  }

  /** Partner organisations that could absorb a surplus donation nearby. */
  findNear(coordinates: [number, number], radiusKm: number) {
    return this.model
      .find({ isActive: true, 'address.location': nearSphere(coordinates, radiusKm) })
      .limit(10)
      .exec();
  }
}
