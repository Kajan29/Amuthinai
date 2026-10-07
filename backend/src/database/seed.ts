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

  const ngos = await ngosService.findAll({ page: 1, pageSize: 1, skip: 0 });
  if (ngos.total === 0) {
    await ngosService.create({
      name: 'Sarvodaya Shramadana',
      registrationNo: 'NGO-1958-001',
      contactPhone: '0112647159',
      address: {
        line1: '98 Rawatawatte Road',
        city: 'Moratuwa',
        district: 'Colombo',
        location: { type: 'Point', coordinates: [79.8816, 6.773] },
      },
    });
    logger.log('Created a sample NGO');
  }

  await app.close();
}

void seed();
