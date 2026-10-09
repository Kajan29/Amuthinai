import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import { ChatService } from 'src/modules/chat/chat.service';
import { DeliveryProofService } from 'src/modules/delivery-proof/delivery-proof.service';
import { DonationsService } from 'src/modules/donations/donations.service';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { UsersService } from 'src/modules/users/users.service';

import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { Enquiry, EnquiryDocument, type EnquiryStatus } from './schemas/enquiry.schema';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectModel(Enquiry.name) private readonly model: Model<Enquiry>,
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly donationsService: DonationsService,
    private readonly foodRequestsService: FoodRequestsService,
    private readonly deliveryProofService: DeliveryProofService,
    private readonly chatService: ChatService,
  ) {}

  async create(user: AuthUser, dto: CreateEnquiryDto): Promise<EnquiryDocument> {
    let { donationId, assignmentId } = dto;
    const { requestId } = dto;

    // Fill in the linked donation/assignment so the admin sees the full delivery trail.
    if (requestId) {
      const request = await this.foodRequestsService.findVisible(requestId, user);
      donationId ??= request.matchedDonationId?.toString();
    }
    if (assignmentId) {
      const assignment = await this.assignmentsService.findById(assignmentId);
      if (user.role === Role.Volunteer && assignment.volunteerId.toString() !== user.id) {
        throw new ForbiddenException('This order belongs to another volunteer');
      }
      donationId ??= assignment.donationId.toString();
    }

    const enquiry = await this.model.create({
      raisedBy: new Types.ObjectId(user.id),
      raisedByRole: user.role,
      donationId: donationId ? new Types.ObjectId(donationId) : undefined,
      assignmentId: assignmentId ? new Types.ObjectId(assignmentId) : undefined,
      requestId: requestId ? new Types.ObjectId(requestId) : undefined,
      category: dto.category,
      subject: dto.subject,
      body: dto.body,
    });

    await this.notifications.sendToAdmins({
      title: `New ${user.role} concern`,
      body: dto.subject,
      type: 'enquiry',
      data: { enquiryId: enquiry.id as string },
    });

    return enquiry;
  }

  async findAll(
    query: PaginationQueryDto,
    scope?: { raisedBy?: string; status?: EnquiryStatus },
  ) {
    const filter: FilterQuery<Enquiry> = {};
    if (scope?.raisedBy) filter.raisedBy = new Types.ObjectId(scope.raisedBy);
    if (scope?.status) filter.status = scope.status;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.pageSize),
      this.model.countDocuments(filter),
    ]);

    const raiserIds = [...new Set(items.map((item) => item.raisedBy.toString()))];
    const raisers = await this.usersService.findManyByIds(raiserIds);
    const raiserById = new Map(raisers.map((user) => [user.id as string, user]));

    const donationIds = [
      ...new Set(items.map((item) => item.donationId?.toString()).filter(Boolean) as string[]),
    ];
    const donations = await Promise.all(
      donationIds.map((id) => this.donationsService.findById(id).catch(() => null)),
    );
    const donationById = new Map(
      donations.filter(Boolean).map((donation) => [donation!.id as string, donation!]),
    );

    const enriched = items.map((item) => {
      const raiser = raiserById.get(item.raisedBy.toString());
      const donation = item.donationId ? donationById.get(item.donationId.toString()) : undefined;
      return {
        ...item.toJSON(),
        raiser: raiser
          ? { id: raiser.id as string, name: raiser.name, role: raiser.role, phone: raiser.phone ?? null }
          : null,
        donation: donation
          ? { id: donation.id as string, title: donation.title, status: donation.status, servings: donation.servings }
          : null,
      };
    });

    return paginate(enriched, total, query) as PaginatedDto<(typeof enriched)[number]>;
  }

  /** Admin investigation view: every record that can prove what happened. */
  async evidence(id: string) {
    const enquiry = await this.findById(id);
    const raiser = await this.usersService.findById(enquiry.raisedBy.toString()).catch(() => null);

    const donationId = enquiry.donationId?.toString();
    const [donation, timeline, messages] = donationId
      ? await Promise.all([
          this.donationsService.findById(donationId).catch(() => null),
          this.donationsService.timeline(donationId),
          this.chatService.findByDonation(donationId),
        ])
      : [null, [], []];

    let assignment = null;
    let proofs: Awaited<ReturnType<DeliveryProofService['findByAssignment']>> = [];
    let volunteer = null;
    if (enquiry.assignmentId) {
      assignment = await this.assignmentsService.findById(enquiry.assignmentId.toString()).catch(() => null);
    } else if (donationId) {
      const [found] = await this.assignmentsService.activityForDonations([donationId]);
      assignment = found ?? null;
    }
    if (assignment) {
      proofs = await this.deliveryProofService.findByAssignment(assignment.id as string);
      volunteer = await this.usersService.findById(assignment.volunteerId.toString()).catch(() => null);
    }

    const request = enquiry.requestId
      ? await this.foodRequestsService.findById(enquiry.requestId.toString()).catch(() => null)
      : null;

    return {
      enquiry,
      raiser: raiser
        ? { id: raiser.id as string, name: raiser.name, role: raiser.role, phone: raiser.phone ?? null, email: raiser.email }
        : null,
      donation,
      request,
      assignment,
      volunteer: volunteer
        ? { id: volunteer.id as string, name: volunteer.name, phone: volunteer.phone ?? null, vehicleType: volunteer.vehicleType ?? null }
        : null,
      proofs,
      timeline,
      messages,
    };
  }

  async findVisible(id: string, user: AuthUser): Promise<EnquiryDocument> {
    const enquiry = await this.findById(id);
    if (user.role !== Role.Admin && enquiry.raisedBy.toString() !== user.id) {
      throw new ForbiddenException('This enquiry belongs to another user');
    }
    return enquiry;
  }

  /** Adds a reply to the thread. An admin reply moves an open enquiry into review. */
  async respond(id: string, user: AuthUser, message: string): Promise<EnquiryDocument> {
    const enquiry = await this.findVisible(id, user);
    const author = await this.usersService.findById(user.id);

    enquiry.responses.push({
      authorId: new Types.ObjectId(user.id),
      authorName: author.name,
      authorRole: user.role,
      message,
      createdAt: new Date(),
    });
    if (user.role === Role.Admin && enquiry.status === 'open') enquiry.status = 'in_review';
    const saved = await enquiry.save();

    if (user.role === Role.Admin) {
      await this.notifications.sendToUsers([enquiry.raisedBy.toString()], {
        title: 'Reply to your concern',
        body: message,
        type: 'enquiry',
        data: { enquiryId: id },
      });
    } else {
      await this.notifications.sendToAdmins({
        title: 'New reply on a concern',
        body: `${author.name}: ${message}`,
        type: 'enquiry',
        data: { enquiryId: id },
      });
    }

    return saved;
  }

  async setStatus(id: string, status: EnquiryStatus): Promise<EnquiryDocument> {
    const enquiry = await this.findById(id);
    enquiry.status = status;
    return enquiry.save();
  }

  async resolve(id: string, adminId: string, resolution: string): Promise<EnquiryDocument> {
    const enquiry = await this.findById(id);

    enquiry.status = 'resolved';
    enquiry.resolution = resolution;
    enquiry.resolvedBy = new Types.ObjectId(adminId);
    enquiry.resolvedAt = new Date();
    const saved = await enquiry.save();

    await this.notifications.sendToUsers([enquiry.raisedBy.toString()], {
      title: 'Your concern was resolved',
      body: resolution,
      type: 'enquiry',
      data: { enquiryId: id },
    });

    return saved;
  }

  countOpen() {
    return this.model.countDocuments({ status: { $ne: 'resolved' } }).exec();
  }

  private async findById(id: string): Promise<EnquiryDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Enquiry not found');
    const enquiry = await this.model.findById(id).exec();
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    return enquiry;
  }
}
