import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

import { AppModule } from '../app.module';
import { configureDNS } from '../config/dns.config';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  DeliveryMethod,
  DietaryTag,
  HandlingInstruction,
  PickupSource,
  QuantityUnit,
} from '../common/enums/donation-details.enum';
import { FoodType } from '../common/enums/food-type.enum';
import { Role } from '../common/enums/role.enum';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { AssignmentsService } from '../modules/assignments/assignments.service';
import { Assignment } from '../modules/assignments/schemas/assignment.schema';
import { ChatService } from '../modules/chat/chat.service';
import { DonationsService } from '../modules/donations/donations.service';
import { EnquiriesService } from '../modules/enquiries/enquiries.service';
import { FoodRequestsService } from '../modules/food-requests/food-requests.service';
import { NgosService } from '../modules/ngos/ngos.service';
import { UsersService } from '../modules/users/users.service';
import { User } from '../modules/users/schemas/user.schema';

/**
 * Keeps every user account, wipes operational collections, then seeds fresh test data
 * (with real food photos) so every role can exercise the app.
 *
 *   npm run seed
 */

const PASSWORD = 'amuthinai123';

const IMG = {
  riceCurry:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
  riceBowl:
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
  biryani:
    'https://images.unsplash.com/photo-1563379091339-03b21cf4ee7c?auto=format&fit=crop&w=800&q=80',
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
  dosa: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80',
  hoppers:
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
  kottu:
    'https://images.unsplash.com/photo-1701579231305-d84d90cf55d3?auto=format&fit=crop&w=800&q=80',
  paneer:
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
  samosa:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  bakery:
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80',
  groceries:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  vegetables:
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  fruit: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
  packed:
    'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
  handover:
    'https://images.unsplash.com/photo-1576866209830-589e1bfbaa4d?auto=format&fit=crop&w=800&q=80',
};

const PLACE = {
  jaffnaTown: addr('12 Hospital Road', 'Jaffna', 'Jaffna', [80.0167, 9.6615]),
  nallurKovil: addr('Nallur Kovil North Gate, Bay 2', 'Jaffna', 'Nallur', [80.0286, 9.6744]),
  nallurHome: addr('42 Temple Road, Nallur', 'Jaffna', 'Nallur', [80.0298, 9.674]),
  templeRoad: addr('15 Kovil Road', 'Jaffna', 'Nallur', [80.0255, 9.6615]),
  palaly: addr('8 Palaly Road', 'Jaffna', 'Kopay', [80.017, 9.748]),
  chunnakam: addr('KKS Road, Chunnakam', 'Jaffna', 'Valikamam', [80.0089, 9.7417]),
  pointPedroRd: addr('45 Point Pedro Road', 'Jaffna', 'Jaffna', [80.021, 9.668]),
  colombo: addr('12 Union Place', 'Colombo', 'Colombo', [79.8612, 6.9271]),
};

function addr(
  line1: string,
  city: string,
  district: string,
  coordinates: [number, number],
) {
  return { line1, city, district, location: { type: 'Point' as const, coordinates } };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hoursAhead(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function asAuth(user: { id: unknown; email: string; role?: Role }): AuthUser {
  return { id: user.id as string, email: user.email, role: user.role ?? Role.Donor };
}

async function seed() {
  configureDNS();
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error', 'log'],
  });

  const connection = app.get<Connection>(getConnectionToken());
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const assignmentModel = app.get<Model<Assignment>>(getModelToken(Assignment.name));

  const usersService = app.get(UsersService);
  const donationsService = app.get(DonationsService);
  const foodRequestsService = app.get(FoodRequestsService);
  const assignmentsService = app.get(AssignmentsService);
  const ngosService = app.get(NgosService);
  const chatService = app.get(ChatService);
  const enquiriesService = app.get(EnquiriesService);

  await ensureDemoUsers(usersService, logger);
  await clearOperationalData(connection, userModel, logger);

  const users = await userModel.find().exec();
  const byRole = (role: Role) => users.filter((user) => user.role === role && user.isActive !== false);
  const prefer = (list: typeof users, emails: string[]) =>
    emails.map((email) => list.find((user) => user.email === email)).find(Boolean) ?? list[0];

  const admin = prefer(byRole(Role.Admin), ['admin@amuthinai.lk']);
  const donor = prefer(byRole(Role.Donor), ['donor@amuthinai.lk', 'nallur.kitchen@amuthinai.lk']);
  const donor2 =
    byRole(Role.Donor).find((user) => user.id !== donor?.id) ?? donor;
  const volunteer = prefer(
    byRole(Role.Volunteer).filter((user) => user.isVerified),
    ['volunteer@amuthinai.lk', 'kajan.volunteer@amuthinai.lk'],
  ) ?? prefer(byRole(Role.Volunteer), ['volunteer@amuthinai.lk']);
  const recipients = byRole(Role.Recipient);
  const recipient = prefer(recipients, ['recipient@amuthinai.lk', 'grace.elderly@amuthinai.lk']);
  const recipient2 =
    recipients.find((user) => user.id !== recipient?.id) ??
    (await ensureRecipient(usersService, 'elders@amuthinai.lk', 'Jaffna Elders Home', '0770000005'));
  const recipient3 =
    recipients.find((user) => user.id !== recipient?.id && user.id !== recipient2.id) ??
    (await ensureRecipient(usersService, 'students@amuthinai.lk', 'University Hostel', '0770000006'));

  if (!admin || !donor || !volunteer || !recipient) {
    throw new Error('Need at least one admin, donor, volunteer and recipient to seed test data');
  }

  await prepareVolunteer(usersService, volunteer, logger);

  const adminId = admin.id as string;
  const donorId = donor.id as string;
  const donor2Id = donor2.id as string;
  const volunteerId = volunteer.id as string;
  const recipientId = recipient.id as string;

  logger.log('Seeding partner NGOs');
  await ngosService.create({
    name: 'Jaffna Relief Hub',
    registrationNo: 'NGO-JAFFNA-001',
    contactPhone: '0212221100',
    contactEmail: 'hub@amuthinai.lk',
    address: PLACE.jaffnaTown,
  });
  await ngosService.create({
    name: 'Nallur Community Kitchen',
    registrationNo: 'NGO-NALLUR-002',
    contactPhone: '0212222200',
    contactEmail: 'nallur.hub@amuthinai.lk',
    address: PLACE.nallurKovil,
  });
  await ngosService.create({
    name: 'Chunnakam Food Bank',
    registrationNo: 'NGO-CHUN-003',
    contactPhone: '0212223300',
    contactEmail: 'chunnakam@amuthinai.lk',
    address: PLACE.chunnakam,
  });

  // 1. Full delivered journey — rewards, history, proofs
  logger.log('Seeding delivered donation');
  const deliveredRequest = await foodRequestsService.create(recipientId, {
    servingsNeeded: 40,
    familySize: 40,
    neededBy: hoursAhead(5),
    notes: 'Dinner for the children. Vegetarian if possible.',
    foodCategory: 'cooked meals',
    dietaryRequirements: ['vegetarian'],
    contactPreference: 'call',
    deliveryMethod: 'doorstep',
    contactPhone: recipient.phone,
    dropAddress: PLACE.nallurHome,
  });
  const deliveredDonation = await donationsService.create(donorId, {
    title: 'Rice and curry, 40 portions',
    foodType: FoodType.Cooked,
    servings: 40,
    quantityUnit: QuantityUnit.Portions,
    dietaryTags: [DietaryTag.PureVegetarian, DietaryTag.CookedToday, DietaryTag.HalalFriendly],
    foodSafetyVerified: true,
    description: 'Fresh vegetarian rice, dhal, and mixed vegetables packed in sealed boxes.',
    photoUrls: [IMG.riceCurry, IMG.riceBowl],
    pickupSource: PickupSource.Registered,
    handling: [HandlingInstruction.KeepWarm, HandlingInstruction.IndividuallyPacked],
    deliveryMethod: DeliveryMethod.VolunteerRider,
    handoverInstructions: 'Ask for the kitchen entrance on Hospital Road.',
    packagingType: 'Sealed eco boxes',
    contactPersonName: donor.name,
    contactPersonPhone: donor.phone,
    cookedAt: hoursAgo(2),
    safeForHours: 6,
    pickupAddress: PLACE.jaffnaTown,
  });
  await donationsService.approve(deliveredDonation.id as string, adminId);
  const deliveredAssignment = await assignmentsService.create(adminId, {
    donationId: deliveredDonation.id as string,
    volunteerId,
    requestId: deliveredRequest.id as string,
  });
  await assignmentsService.accept(deliveredAssignment.id as string, volunteerId);
  const deliveredPins = await pinsOf(assignmentModel, deliveredAssignment.id as string);
  await assignmentsService.confirmPickup(deliveredAssignment.id as string, volunteerId, {
    photoUrl: IMG.packed,
    location: PLACE.jaffnaTown.location,
    pin: deliveredPins.pickupPin,
    quantityConfirmed: 40,
    note: 'Collected warm from the kitchen.',
  });
  await assignmentsService.confirmDelivery(deliveredAssignment.id as string, volunteerId, {
    photoUrl: IMG.handover,
    location: PLACE.nallurHome.location,
    pin: deliveredPins.deliveryPin,
    quantityConfirmed: 40,
    note: 'Handed to the warden at the side gate.',
  });
  await chatService.send(deliveredDonation.id as string, asAuth(donor), 'Kitchen is ready. Use the side entrance.');
  await chatService.send(deliveredDonation.id as string, asAuth(volunteer), 'Collected. On the way to Nallur.');
  await chatService.send(deliveredDonation.id as string, asAuth(recipient), 'Received, thank you.');

  // 2. In transit — volunteer delivery screen + recipient tracking
  logger.log('Seeding in-transit donation');
  const transitRequest = await foodRequestsService.create(recipientId, {
    servingsNeeded: 30,
    familySize: 30,
    neededBy: hoursAhead(4),
    notes: 'Lunch packs. Soft food preferred.',
    foodCategory: 'cooked meals',
    dietaryRequirements: ['vegetarian', 'soft meals'],
    contactPreference: 'whatsapp',
    deliveryMethod: 'doorstep',
    contactPhone: recipient.phone,
    dropAddress: PLACE.nallurHome,
  });
  const transitDonation = await donationsService.create(donor2Id, {
    title: 'Idli and sambar, 30 packets',
    foodType: FoodType.Cooked,
    servings: 30,
    quantityUnit: QuantityUnit.Packets,
    dietaryTags: [DietaryTag.PureVegetarian, DietaryTag.CookedToday],
    foodSafetyVerified: true,
    description: 'Steamed idli with sambar in insulated packets. Cooked this morning.',
    photoUrls: [IMG.idli, IMG.riceBowl],
    pickupSource: PickupSource.Custom,
    handling: [HandlingInstruction.KeepWarm, HandlingInstruction.IndividuallyPacked],
    deliveryMethod: DeliveryMethod.VolunteerRider,
    handoverInstructions: 'North gate, bay 2. Call when you arrive.',
    packagingType: 'Insulated packets',
    contactPersonName: donor2.name,
    contactPersonPhone: donor2.phone,
    cookedAt: hoursAgo(1),
    safeForHours: 5,
    pickupAddress: PLACE.nallurKovil,
  });
  await donationsService.approve(transitDonation.id as string, adminId);
  const transitAssignment = await assignmentsService.create(adminId, {
    donationId: transitDonation.id as string,
    volunteerId,
    requestId: transitRequest.id as string,
  });
  await assignmentsService.accept(transitAssignment.id as string, volunteerId);
  const transitPins = await pinsOf(assignmentModel, transitAssignment.id as string);
  await assignmentsService.confirmPickup(transitAssignment.id as string, volunteerId, {
    photoUrl: IMG.packed,
    location: PLACE.nallurKovil.location,
    pin: transitPins.pickupPin,
    quantityConfirmed: 30,
    note: 'Packets counted and still warm.',
  });
  await chatService.send(transitDonation.id as string, asAuth(volunteer), 'Food collected. Heading to the home now.');

  // 3. Accepted, waiting for pickup — volunteer pickup + donor PIN
  logger.log('Seeding accepted pickup task');
  const pickupDonation = await donationsService.create(donorId, {
    title: 'Egg hoppers and curry, 20 portions',
    foodType: FoodType.Cooked,
    servings: 20,
    quantityUnit: QuantityUnit.Portions,
    dietaryTags: [DietaryTag.ContainsEggMeat, DietaryTag.CookedToday],
    foodSafetyVerified: true,
    description: 'Hoppers with onion sambol and potato curry. Keep upright.',
    photoUrls: [IMG.hoppers, IMG.dosa],
    handling: [HandlingInstruction.KeepWarm, HandlingInstruction.FragileLiquid],
    deliveryMethod: DeliveryMethod.VolunteerRider,
    handoverInstructions: 'Front counter. Show the pickup PIN.',
    packagingType: 'Stacked hopper boxes',
    cookedAt: hoursAgo(0.5),
    safeForHours: 4,
    pickupAddress: PLACE.jaffnaTown,
  });
  await donationsService.approve(pickupDonation.id as string, adminId);
  const pickupAssignment = await assignmentsService.create(adminId, {
    donationId: pickupDonation.id as string,
    volunteerId,
  });
  await assignmentsService.accept(pickupAssignment.id as string, volunteerId);
  const pickupPins = await pinsOf(assignmentModel, pickupAssignment.id as string);

  // 4. Offered — volunteer can accept or decline
  logger.log('Seeding offered assignment');
  const offeredDonation = await donationsService.create(donor2Id, {
    title: 'Vegetable kottu, 25 packs',
    foodType: FoodType.Cooked,
    servings: 25,
    quantityUnit: QuantityUnit.Packets,
    dietaryTags: [DietaryTag.PureVegetarian, DietaryTag.CookedToday, DietaryTag.NutFree],
    foodSafetyVerified: true,
    description: 'Godamba roti kottu with mixed vegetables. Packed hot.',
    photoUrls: [IMG.kottu],
    handling: [HandlingInstruction.KeepWarm],
    deliveryMethod: DeliveryMethod.VolunteerRider,
    handoverInstructions: 'Temple kitchen window.',
    cookedAt: hoursAgo(0.75),
    safeForHours: 5,
    pickupAddress: PLACE.nallurKovil,
  });
  await donationsService.approve(offeredDonation.id as string, adminId);
  const offeredAssignment = await assignmentsService.create(adminId, {
    donationId: offeredDonation.id as string,
    volunteerId,
  });

  // 5. Approved and unclaimed — volunteer nearby list + admin assign
  logger.log('Seeding approved unclaimed donations');
  await donationsService.approve(
    (
      await donationsService.create(donorId, {
        title: 'Chicken biryani, 35 packs',
        foodType: FoodType.Cooked,
        servings: 35,
        quantityUnit: QuantityUnit.Packets,
        dietaryTags: [DietaryTag.ContainsEggMeat, DietaryTag.HalalFriendly, DietaryTag.CookedToday],
        foodSafetyVerified: true,
        description: 'Festival biryani with raita. Sealed foil packs.',
        photoUrls: [IMG.biryani],
        handling: [HandlingInstruction.KeepWarm, HandlingInstruction.IndividuallyPacked],
        deliveryMethod: DeliveryMethod.VolunteerRider,
        cookedAt: hoursAgo(1.5),
        safeForHours: 6,
        pickupAddress: PLACE.jaffnaTown,
      })
    ).id as string,
    adminId,
  );
  await donationsService.approve(
    (
      await donationsService.create(donor2Id, {
        title: 'Paneer curry with rice, 18 portions',
        foodType: FoodType.Cooked,
        servings: 18,
        quantityUnit: QuantityUnit.Portions,
        dietaryTags: [DietaryTag.PureVegetarian, DietaryTag.CookedToday],
        foodSafetyVerified: true,
        description: 'Mild paneer gravy and steamed rice. Good for elders.',
        photoUrls: [IMG.paneer, IMG.riceBowl],
        handling: [HandlingInstruction.KeepWarm],
        deliveryMethod: DeliveryMethod.VolunteerRider,
        cookedAt: hoursAgo(1),
        safeForHours: 5,
        pickupAddress: PLACE.templeRoad,
      })
    ).id as string,
    adminId,
  );
  await donationsService.approve(
    (
      await donationsService.create(donorId, {
        title: 'Bakery leftover bread and buns',
        foodType: FoodType.Bakery,
        servings: 50,
        quantityUnit: QuantityUnit.Pieces,
        dietaryTags: [DietaryTag.NutFree],
        description: 'Yesterday evening bake. Packed in paper bags.',
        photoUrls: [IMG.bread, IMG.bakery],
        handling: [HandlingInstruction.IndividuallyPacked],
        deliveryMethod: DeliveryMethod.VolunteerRider,
        cookedAt: hoursAgo(8),
        safeForHours: 20,
        pickupAddress: PLACE.jaffnaTown,
      })
    ).id as string,
    adminId,
  );
  await donationsService.approve(
    (
      await donationsService.create(donor2Id, {
        title: 'Dry ration packs, 20 families',
        foodType: FoodType.Packaged,
        servings: 80,
        quantityUnit: QuantityUnit.Packets,
        dietaryTags: [DietaryTag.PureVegetarian, DietaryTag.NutFree],
        description: 'Rice, dhal, and coconut oil family packs. No cooking needed at pickup.',
        photoUrls: [IMG.groceries],
        handling: [HandlingInstruction.IndividuallyPacked],
        deliveryMethod: DeliveryMethod.VolunteerRider,
        cookedAt: hoursAgo(4),
        safeForHours: 48,
        pickupAddress: PLACE.chunnakam,
      })
    ).id as string,
    adminId,
  );
  await donationsService.approve(
    (
      await donationsService.create(donorId, {
        title: 'Fresh vegetables, 15 kg',
        foodType: FoodType.Raw,
        servings: 25,
        quantityUnit: QuantityUnit.Kilograms,
        dietaryTags: [DietaryTag.PureVegetarian],
        description: 'Market surplus: carrots, beans, and cabbage.',
        photoUrls: [IMG.vegetables, IMG.fruit],
        handling: [HandlingInstruction.RequiresRefrigeration],
        deliveryMethod: DeliveryMethod.VolunteerRider,
        cookedAt: hoursAgo(3),
        safeForHours: 18,
        pickupAddress: PLACE.pointPedroRd,
      })
    ).id as string,
    adminId,
  );

  // 6. Pending approval — admin approvals queue
  logger.log('Seeding pending and closed donations');
  await donationsService.create(donorId, {
    title: 'Samosa and tea snacks, 40 pieces',
    foodType: FoodType.Cooked,
    servings: 20,
    quantityUnit: QuantityUnit.Pieces,
    dietaryTags: [DietaryTag.PureVegetarian, DietaryTag.CookedToday],
    foodSafetyVerified: true,
    description: 'Evening snack leftover from a meeting. Still crisp.',
    photoUrls: [IMG.samosa],
    handling: [HandlingInstruction.IndividuallyPacked],
    deliveryMethod: DeliveryMethod.VolunteerRider,
    cookedAt: hoursAgo(0.4),
    safeForHours: 4,
    pickupAddress: PLACE.jaffnaTown,
  });
  await donationsService.create(donor2Id, {
    title: 'Fresh milk packets, 24 litres',
    foodType: FoodType.Dairy,
    servings: 24,
    quantityUnit: QuantityUnit.Litres,
    dietaryTags: [DietaryTag.NutFree],
    description: 'Chilled UHT milk. Needs a cooler bag.',
    photoUrls: [IMG.milk],
    handling: [HandlingInstruction.RequiresRefrigeration],
    deliveryMethod: DeliveryMethod.VolunteerRider,
    cookedAt: hoursAgo(2),
    safeForHours: 10,
    pickupAddress: PLACE.nallurKovil,
  });

  const rejected = await donationsService.create(donorId, {
    title: 'Unlabelled leftover curry',
    foodType: FoodType.Cooked,
    servings: 10,
    description: 'Mixed leftover from last night service.',
    photoUrls: [IMG.kottu],
    cookedAt: hoursAgo(5),
    safeForHours: 6,
    pickupAddress: PLACE.jaffnaTown,
  });
  await donationsService.reject(
    rejected.id as string,
    adminId,
    'Cook time is too old and packaging is not sealed. Please post only food cooked today.',
  );

  const cancelled = await donationsService.create(donor2Id, {
    title: 'String hoppers that were withdrawn',
    foodType: FoodType.Cooked,
    servings: 15,
    photoUrls: [IMG.hoppers],
    cookedAt: hoursAgo(0.3),
    safeForHours: 4,
    pickupAddress: PLACE.templeRoad,
  });
  await donationsService.cancel(cancelled.id as string, donor2Id);

  // 7. Open / cancelled requests — after live matched requests are in place
  logger.log('Seeding open food requests');
  await foodRequestsService.create(recipient2.id as string, {
    servingsNeeded: 18,
    familySize: 18,
    neededBy: hoursAhead(6),
    notes: 'Soft rice meals. Call at the side gate.',
    foodCategory: 'cooked meals',
    dietaryRequirements: ['soft meals', 'low spice'],
    contactPreference: 'call',
    deliveryMethod: 'doorstep',
    contactPhone: recipient2.phone,
    dropAddress: PLACE.templeRoad,
  });
  await foodRequestsService.create(recipient3.id as string, {
    servingsNeeded: 25,
    familySize: 25,
    neededBy: hoursAhead(20),
    notes: 'Lunch packs for students staying over the weekend.',
    foodCategory: 'cooked meals',
    dietaryRequirements: ['halal'],
    contactPreference: 'in_app',
    deliveryMethod: 'hub_pickup',
    contactPhone: recipient3.phone,
    dropAddress: PLACE.palaly,
  });

  const extraRecipient = await ensureRecipient(
    usersService,
    'grace.elderly@amuthinai.lk',
    'Grace Care Elderly Home',
    '0212223344',
  );
  const cancelledRequest = await foodRequestsService.create(extraRecipient.id as string, {
    servingsNeeded: 12,
    familySize: 12,
    neededBy: hoursAhead(8),
    notes: 'Need cancelled — family brought food.',
    foodCategory: 'cooked meals',
    dropAddress: PLACE.chunnakam,
  });
  await foodRequestsService.cancel(cancelledRequest.id as string, extraRecipient.id as string);

  // 8. Enquiries in every status
  logger.log('Seeding enquiries');
  const openEnquiry = await enquiriesService.create(asAuth(recipient), {
    requestId: transitRequest.id as string,
    category: 'late_delivery',
    subject: 'Volunteer is taking longer than expected',
    body: 'The rider collected the idli packs but has not arrived yet. Can someone check?',
  });
  await enquiriesService.respond(
    openEnquiry.id as string,
    asAuth(admin),
    'We can see the rider is in transit. Please keep the delivery PIN ready.',
  );

  const volunteerEnquiry = await enquiriesService.create(asAuth(volunteer), {
    assignmentId: pickupAssignment.id as string,
    category: 'wrong_location',
    subject: 'Pickup bay is not marked',
    body: 'Arrived at Hospital Road but the kitchen entrance is not obvious.',
  });
  await enquiriesService.setStatus(volunteerEnquiry.id as string, 'in_review');

  const resolvedEnquiry = await enquiriesService.create(asAuth(recipient), {
    donationId: deliveredDonation.id as string,
    category: 'food_quality',
    subject: 'Yesterday delivery was perfect',
    body: 'Just confirming the rice and curry arrived hot and complete.',
  });
  await enquiriesService.resolve(
    resolvedEnquiry.id as string,
    adminId,
    'Noted with thanks. Closing this as a positive report.',
  );

  logger.log('');
  logger.log('Users kept. Operational data reset and reseeded.');
  logger.log(`Admin      ${admin.email}`);
  logger.log(`Donor      ${donor.email}`);
  if (donor2.id !== donor.id) logger.log(`Donor 2    ${donor2.email}`);
  logger.log(`Volunteer  ${volunteer.email}`);
  logger.log(`Recipient  ${recipient.email}`);
  logger.log('');
  logger.log('Live PINs for testing pickup / delivery:');
  logger.log(`  In transit  pickup ${transitPins.pickupPin}  delivery ${transitPins.deliveryPin}`);
  logger.log(`  Awaiting pickup  pickup ${pickupPins.pickupPin}  delivery ${pickupPins.deliveryPin}`);
  logger.log(`Demo password (if you created the starter accounts): ${PASSWORD}`);

  await app.close();
}

async function clearOperationalData(
  connection: Connection,
  userModel: Model<User>,
  logger: Logger,
): Promise<void> {
  const db = connection.db;
  if (!db) throw new Error('MongoDB connection is not ready');

  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    if (collection.name === 'users' || collection.name.startsWith('system.')) continue;
    // Native driver — StatusEvent mongoose hooks block deleteMany.
    const result = await db.collection(collection.name).deleteMany({});
    logger.log(`Cleared ${collection.name} (${result.deletedCount})`);
  }

  await userModel.updateMany({}, { $set: { karmaPoints: 0, completedDeliveriesCount: 0 } });
  logger.log('Reset user karma and completed-delivery counters');
}

async function ensureDemoUsers(usersService: UsersService, logger: Logger): Promise<void> {
  const accounts: Array<{
    name: string;
    email: string;
    phone: string;
    role: Role;
    language: 'en' | 'ta';
  }> = [
    { name: 'Amuthinai Admin', email: 'admin@amuthinai.lk', phone: '0770000001', role: Role.Admin, language: 'en' },
    { name: 'Hotel Saffron', email: 'donor@amuthinai.lk', phone: '0770000002', role: Role.Donor, language: 'en' },
    { name: 'Nimal Perera', email: 'volunteer@amuthinai.lk', phone: '0770000003', role: Role.Volunteer, language: 'en' },
    {
      name: 'Hope Children Home',
      email: 'recipient@amuthinai.lk',
      phone: '0770000004',
      role: Role.Recipient,
      language: 'en',
    },
    {
      name: 'Nallur Temple Kitchen',
      email: 'nallur.kitchen@amuthinai.lk',
      phone: '0772345678',
      role: Role.Donor,
      language: 'ta',
    },
  ];

  for (const account of accounts) {
    const existing = await usersService.findByEmail(account.email);
    if (existing) {
      logger.log(`Kept user ${account.email}`);
      continue;
    }
    const user = await usersService.create({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password: PASSWORD,
      language: account.language,
    });
    await usersService.assignRole(user.id as string, account.role);
    logger.log(`Created missing ${account.role}: ${account.email} / ${PASSWORD}`);
  }
}

async function ensureRecipient(
  usersService: UsersService,
  email: string,
  name: string,
  phone: string,
) {
  const existing = await usersService.findByEmail(email);
  if (existing) return existing;
  const user = await usersService.create({
    name,
    email,
    phone,
    password: PASSWORD,
    language: 'en',
  });
  return usersService.assignRole(user.id as string, Role.Recipient);
}

async function prepareVolunteer(
  usersService: UsersService,
  volunteer: User & { id?: unknown },
  logger: Logger,
): Promise<void> {
  const id = volunteer.id as string;
  if (!volunteer.address?.location?.coordinates) {
    await usersService.updateVolunteerProfile(id, {
      vehicleType: volunteer.vehicleType ?? VehicleType.Motorbike,
      travelRadiusKm: volunteer.travelRadiusKm ?? 15,
      address: PLACE.pointPedroRd,
    });
    logger.log(`Set home base for volunteer ${volunteer.email}`);
  }
  if (!volunteer.isVerified) {
    await usersService.verify(id);
    logger.log(`Verified volunteer ${volunteer.email} so matching works`);
  }
  if (volunteer.isAvailable === false) {
    await usersService.updateVolunteerProfile(id, { isAvailable: true });
  }
}

async function pinsOf(model: Model<Assignment>, id: string) {
  const doc = await model.findById(id).select('+pickupPin +deliveryPin').exec();
  if (!doc?.pickupPin || !doc.deliveryPin) {
    throw new Error(`Assignment ${id} is missing PINs`);
  }
  return { pickupPin: doc.pickupPin, deliveryPin: doc.deliveryPin };
}

void seed();
