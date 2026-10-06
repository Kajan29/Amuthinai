import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FilterQuery, Model } from 'mongoose';

import { paginate, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';
import { nearSphere } from 'src/common/utils/geo.util';

import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateVolunteerProfileDto } from './dto/update-volunteer-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    language: 'en' | 'ta' | 'si';
    role?: Role;
  }): Promise<UserDocument> {
    const existing = await this.userModel.exists({ email: input.email.toLowerCase() });
    if (existing) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    return this.userModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      language: input.language,
      passwordHash,
      role: input.role,
      // Donors and recipients are usable immediately; volunteers need vetting.
      isVerified: input.role && input.role !== Role.Volunteer ? true : false,
    });
  }

  /** Includes the password hash, which is `select: false` on the schema. */
  findByEmailWithPassword(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').exec();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async createGoogleUser(input: {
    name: string;
    email: string;
    googleId: string;
    role?: Role;
  }): Promise<UserDocument> {
    const existing = await this.userModel.exists({ email: input.email.toLowerCase() });
    if (existing) throw new ConflictException('An account with this email already exists');

    return this.userModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      googleId: input.googleId,
      role: input.role,
      isVerified: input.role ? input.role !== Role.Volunteer : false,
      // No password hash for Google users
    });
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findManyByIds(ids: string[]): Promise<UserDocument[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.userModel.find({ _id: { $in: ids } }).exec();
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedDto<UserDocument>> {
    const filter: FilterQuery<User> = {};
    if (query.role) filter.role = query.role;
    if (query.isVerified !== undefined) filter.isVerified = query.isVerified;

    const [items, total] = await Promise.all([
      this.userModel.find(filter).skip(query.skip).limit(query.pageSize).sort({ createdAt: -1 }),
      this.userModel.countDocuments(filter),
    ]);

    return paginate(items, total, query);
  }

  /** FR1 — a role is chosen once and then only an admin can change it. */
  async assignRole(id: string, role: Role): Promise<UserDocument> {
    const user = await this.findById(id);
    if (user.role && user.role !== role) {
      throw new ConflictException('Contact an admin to change your role');
    }

    user.role = role;
    // Donors and recipients are usable immediately; volunteers need vetting.
    user.isVerified = role !== Role.Volunteer;
    return user.save();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return user.save();
  }

  /** FR7 */
  async updateVolunteerProfile(id: string, dto: UpdateVolunteerProfileDto): Promise<UserDocument> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return user.save();
  }

  async verify(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    user.isVerified = true;
    return user.save();
  }

  /** FR6, FR7 — verified volunteers whose home base is within `radiusKm` of the pickup. */
  findVolunteersNear(coordinates: [number, number], radiusKm: number) {
    return this.userModel
      .find({
        role: Role.Volunteer,
        isVerified: true,
        'address.location': nearSphere(coordinates, radiusKm),
      })
      .limit(25)
      .exec();
  }

  /** FR10 — called by the points module; never decrements below zero. */
  async addKarmaPoints(id: string, points: number): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $inc: { karmaPoints: points } }).exec();
  }

  async getPushTokens(ids: string[]): Promise<string[]> {
    const users = await this.userModel
      .find({ _id: { $in: ids }, pushToken: { $exists: true, $ne: null } })
      .select('+pushToken')
      .exec();

    return users.map((user) => user.pushToken).filter((token): token is string => Boolean(token));
  }

  comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
