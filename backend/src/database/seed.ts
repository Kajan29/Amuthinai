import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../app.module';
import { configureDNS } from '../config/dns.config';
import { FoodType } from '../common/enums/food-type.enum';
import { Role } from '../common/enums/role.enum';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { DonationsService } from '../modules/donations/donations.service';
import { FoodRequestsService } from '../modules/food-requests/food-requests.service';
import { NgosService } from '../modules/ngos/ngos.service';
import { UsersService } from '../modules/users/users.service';

/**
 * Creates one account per role plus a sample donation, so the app is explorable right after
 * `docker compose up`. Safe to re-run: existing emails are skipped.
 *
 *   npm run seed
 */

const COLOMBO: [number, number] = [79.8612, 6.9271];
const DEHIWALA: [number, number] = [79.8656, 6.8511];
const NALLUR: [number, number] = [80.0298, 9.674];
const TEMPLE: [number, number] = [80.0255, 9.6615];
const PALALY: [number, number] = [80.017, 9.748];

const PASSWORD = 'amuthinai123';

async function seed() {
  configureDNS();
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error', 'log'] });

  const usersService = app.get(UsersService);
  const donationsService = app.get(DonationsService);
  const foodRequestsService = app.get(FoodRequestsService);
  const ngosService = app.get(NgosService);

  const accounts = [
    { name: 'Amuthinai Admin', email: 'admin@amuthinai.lk', phone: '0770000001', role: Role.Admin },
    { name: 'Hotel Saffron', email: 'donor@amuthinai.lk', phone: '0770000002', role: Role.Donor },
    {
      name: 'Nimal Perera',
      email: 'volunteer@amuthinai.lk',
      phone: '0770000003',
      role: Role.Volunteer,
    },
    {
      name: 'Hope Children Home',
      email: 'recipient@amuthinai.lk',
      phone: '0770000004',
      role: Role.Recipient,
    },
  ];

  const created: Record<string, string> = {};

  for (const account of accounts) {
    const existing = await usersService.findByEmailWithPassword(account.email);
    if (existing) {
      created[account.role] = existing.id as string;
      logger.log(`${account.email} already exists`);
      continue;
    }

    const user = await usersService.create({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password: PASSWORD,
      language: 'en',
    });

    await usersService.assignRole(user.id as string, account.role);
    created[account.role] = user.id as string;
    logger.log(`Created ${account.role}: ${account.email} / ${PASSWORD}`);
  }

  // FR7 — the volunteer needs a home base and radius before matching will consider them.
  const volunteerId = created[Role.Volunteer];
  if (volunteerId) {
    await usersService.updateVolunteerProfile(volunteerId, {
      vehicleType: VehicleType.Motorbike,
      travelRadiusKm: 10,
      address: {
        line1: '45 Galle Road',
        city: 'Dehiwala',
        district: 'Colombo',
        location: { type: 'Point', coordinates: DEHIWALA },
      },
    });
    await usersService.verify(volunteerId);
  }

  const donorId = created[Role.Donor];
  if (donorId) {
    const alreadyPosted = await donationsService.listForDonor(donorId);
    if (alreadyPosted.length > 0) {
      logger.log('Sample donation already exists');
    } else {
      const cookedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      await donationsService.create(donorId, {
        title: 'Rice and curry, 30 portions',
        foodType: FoodType.Cooked,
        servings: 30,
        description: 'Vegetarian, packed in sealed containers. Ask for the kitchen entrance.',
        photoUrls: [],
        cookedAt,
        safeForHours: 6,
        pickupAddress: {
          line1: '12 Union Place',
          city: 'Colombo',
          district: 'Colombo',
          location: { type: 'Point', coordinates: COLOMBO },
        },
      });
      logger.log('Created a sample donation awaiting approval');
    }
  }

  const sampleRequests = [
    {
      name: 'Hope Children Home',
      email: 'recipient@amuthinai.lk',
      phone: '0770000004',
      servingsNeeded: 40,
      hoursAhead: 4,
      notes: 'Dinner for the children. Vegetarian if possible.',
      line1: '42 Temple Road, Nallur',
      city: 'Jaffna',
      district: 'Nallur',
      coordinates: NALLUR,
    },
    {
      name: 'Jaffna Elders Home',
      email: 'elders@amuthinai.lk',
      phone: '0770000005',
      servingsNeeded: 18,
      hoursAhead: 6,
      notes: 'Soft rice meals. Call at the side gate.',
      line1: '15 Kovil Road',
      city: 'Jaffna',
      district: 'Nallur',
      coordinates: TEMPLE,
    },
    {
      name: 'University Hostel',
      email: 'students@amuthinai.lk',
      phone: '0770000006',
      servingsNeeded: 25,
      hoursAhead: 20,
      notes: 'Lunch packs for students staying over the weekend.',
      line1: '8 Palaly Road',
      city: 'Jaffna',
      district: 'Kopay',
      coordinates: PALALY,
    },
  ];

  for (const sample of sampleRequests) {
    let recipient = await usersService.findByEmailWithPassword(sample.email);
    if (!recipient) {
      recipient = await usersService.create({
        name: sample.name,
        email: sample.email,
        phone: sample.phone,
        password: PASSWORD,
        language: 'en',
      });
      await usersService.assignRole(recipient.id as string, Role.Recipient);
      logger.log(`Created recipient ${sample.email}`);
    }

    try {
      await foodRequestsService.create(recipient.id as string, {
        servingsNeeded: sample.servingsNeeded,
        neededBy: new Date(Date.now() + sample.hoursAhead * 60 * 60 * 1000).toISOString(),
        notes: sample.notes,
        dropAddress: {
          line1: sample.line1,
          city: sample.city,
          district: sample.district,
          location: { type: 'Point', coordinates: sample.coordinates },
        },
      });
      logger.log(`Created request from ${sample.name}`);
    } catch (error) {
      logger.log(`Skipped request for ${sample.name}: ${(error as Error).message}`);
    }
  }

  // Seed Jaffna Volunteers and Donors
  const jaffnaAccounts = [
    {
      name: 'Nallur Temple Kitchen',
      email: 'nallur.kitchen@amuthinai.lk',
      phone: '+94 77 234 5678',
      role: Role.Donor,
    },
    {
      name: 'Kajan S.',
      email: 'kajan.volunteer@amuthinai.lk',
      phone: '+94 77 123 4567',
      role: Role.Volunteer,
      vehicle: VehicleType.Motorbike,
      radius: 15,
      isVerified: true,
      badge: 'Ready for Review',
      deliveries: 14,
      karma: 420,
    },
    {
      name: 'Priya T.',
      email: 'priya.volunteer@amuthinai.lk',
      phone: '+94 77 234 8901',
      role: Role.Volunteer,
      vehicle: VehicleType.Bicycle,
      radius: 5,
      isVerified: true,
      badge: 'Eco-Carrier',
      deliveries: 8,
      karma: 240,
    },
    {
      name: 'Murugan R.',
      email: 'murugan.volunteer@amuthinai.lk',
      phone: '+94 77 345 6789',
      role: Role.Volunteer,
      vehicle: VehicleType.Van,
      radius: 25,
      isVerified: true,
      badge: 'Bulk Cargo (150kg)',
      deliveries: 22,
      karma: 660,
    },
    {
      name: 'Shalini K.',
      email: 'shalini.volunteer@amuthinai.lk',
      phone: '+94 77 456 7890',
      role: Role.Volunteer,
      vehicle: VehicleType.Foot,
      radius: 2,
      isVerified: false,
      badge: '1km Radius',
      deliveries: 4,
      karma: 120,
    },
    {
      name: 'Karthik Rajan',
      email: 'karthik.volunteer@amuthinai.lk',
      phone: '+94 77 567 8901',
      role: Role.Volunteer,
      vehicle: VehicleType.Motorbike,
      radius: 10,
      isVerified: false,
      badge: 'Pending KYC',
      deliveries: 0,
      karma: 0,
    },
    {
      name: 'Grace Care Elderly Home',
      email: 'grace.elderly@amuthinai.lk',
      phone: '+94 21 222 3344',
      role: Role.Recipient,
    },
  ];

  const JAFFNA_CENTRAL: [number, number] = [80.0167, 9.6615];
  const NALLUR_COORD: [number, number] = [80.0286, 9.6744];

  for (const acc of jaffnaAccounts) {
    let user = await usersService.findByEmailWithPassword(acc.email);
    if (!user) {
      user = await usersService.create({
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        password: PASSWORD,
        language: 'ta',
      });
      await usersService.assignRole(user.id as string, acc.role);
      logger.log(`Created Jaffna ${acc.role}: ${acc.email}`);
    }

    if (acc.role === Role.Volunteer) {
      await usersService.updateVolunteerProfile(user.id as string, {
        vehicleType: acc.vehicle ?? VehicleType.Motorbike,
        travelRadiusKm: acc.radius ?? 5,
        address: {
          line1: 'Point Pedro Road',
          city: 'Jaffna',
          district: 'Jaffna',
          location: { type: 'Point', coordinates: NALLUR_COORD },
        },
      });
      if (acc.isVerified) {
        await usersService.verify(user.id as string);
      }
    }
  }

  // Seed Nallur Kitchen Hot Meal Donation
  const nallurUser = await usersService.findByEmail('nallur.kitchen@amuthinai.lk');
  if (nallurUser) {
    const existing = await donationsService.findAll({ page: 1, pageSize: 1, skip: 0 }, { donorId: nallurUser.id as string });
    if (existing.total === 0) {
      const cookedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      await donationsService.create(nallurUser.id as string, {
        title: '50 Pkts Hot Vegetable Rice & Sambar',
        foodType: FoodType.Cooked,
        servings: 50,
        description: 'Cooked fresh in commercial food-grade kettle. Sealed in insulated eco containers.',
        photoUrls: [
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
        ],
        cookedAt,
        safeForHours: 4,
        pickupAddress: {
          line1: 'Nallur Kovil North Entrance, North Gate Bay 2',
          city: 'Jaffna',
          district: 'Jaffna',
          location: { type: 'Point', coordinates: NALLUR_COORD },
        },
      });
      logger.log('Created Nallur Temple Kitchen donation awaiting approval');
    }
  }

  await app.close();
}

void seed();
