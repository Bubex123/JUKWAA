import 'dotenv/config';
import { Pool } from 'pg';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL before seeding');
const pool = new Pool({ connectionString });

const samples = [
  ['bongo-flava', 'Muziki', 'Bongo Flava Honors S04 ft 20 Percent', 'Usiku wa Bongo Flava Honors ukiwa na 20 Percent na wasanii wengine.', '2026-10-30T20:00:00+03:00', 'The Super Dome TZ, Dar es Salaam', 50000, 'Inapendwa', 'photo-1506157786151-b8491531f063'],
  ['otaku-night-halloween', 'Burudani', 'Otaku Night - Halloween Edition', 'Usiku wa anime, cosplay na burudani ya Halloween.', '2026-10-31T18:00:00+03:00', 'Bahari Japan Restaurant, Dar es Salaam, Tanzania', 30000, null, 'photo-1524368535928-5b5e00ddc76b'],
  ['women-energy-forum-2026', 'Kongamano', 'Women in Energy Forum', 'Jukwaa la wanawake na wataalamu wa nishati kujadili uvumbuzi na mustakabali wa nishati Tanzania.', '2026-11-10T09:00:00+03:00', 'New Library (UDSM), Dar es Salaam, Tanzania', 100000, null, 'photo-1540575467063-178a50c2df87'],
  ['swkc-reloaded-tanzanite', 'Burudani', 'SWKC reloaded ft Tanzanite festival', 'Tamasha la vichekesho na burudani ya Kiswahili.', '2026-11-14T18:00:00+03:00', 'Alliance Française, Dar es Salaam, Tanzania', 5000, null, 'photo-1501386761578-eac5c94b800a'],
  ['africhina-capital-connect', 'Kongamano', 'Africhina Capital Connect', 'Mkutano wa kuunganisha wawekezaji na fursa za biashara kati ya Afrika na China.', '2026-11-26T09:00:00+03:00', 'Julius Nyerere International Convention Centre (JNICC), Dar es Salaam', 80000, null, 'photo-1511578314322-379afb476865'],
  ['skill-sprint-impact-lab', 'Kongamano', 'Skill Sprint By The Impact Lab', 'Mafunzo na mazungumzo ya kukuza ujuzi na ubunifu.', '2026-11-28T09:00:00+03:00', 'Hyatt Regency Dar es Salaam, The Kilimanjaro', 45000, null, 'photo-1523580494863-6f3031224c94'],
  ['ucc-utamaduni-day', 'Sherehe', 'UCC Utamaduni Day', 'Siku ya utamaduni, sanaa na burudani ya wanafunzi wa UDSM.', '2026-11-28T10:00:00+03:00', 'UDSM Campus 1 Grounds, Dar es Salaam, Tanzania', 10000, null, 'photo-1492684223066-81342ee5ff30'],
  ['bagamoyo-heritage-run', 'Michezo', 'Bagamoyo Heritage Run', 'Mbio za urithi katika mji wa kihistoria wa Bagamoyo.', '2026-11-29T06:00:00+03:00', 'Old German Boma, Bagamoyo, Pwani', 20000, null, 'photo-1552674605-db6ffd4facb5'],
  ['raising-purpose-generation', 'Kongamano', 'Raising a Purpose-Driven Generation (Young Visionary) (Ages 10–19)', 'Kikao cha kuhamasisha vijana kujenga maono na malengo.', '2026-12-09T10:00:00+03:00', 'Mamiwata, Coco Beach, Dar es Salaam, Tanzania', 25000, null, 'photo-1511632765486-a01980e01a18'],
  ['customer-service-agents-dinner', 'Sherehe', 'Customer Service Agents Dinner', 'Jioni ya chakula cha pamoja na mitandao kwa wataalamu wa huduma kwa wateja.', '2026-12-18T18:00:00+03:00', 'Serena Hotel, Dar es Salaam, Tanzania', 75000, null, 'photo-1511795409834-ef04bbd61622'],
  ['run-4-autism-half-marathon-2027', 'Michezo', 'Run 4 Autism Tanzania Half Marathon 2027', 'Mbio za hisani kuhamasisha uelewa na msaada kwa watu wenye autism.', '2027-04-03T06:00:00+03:00', 'The Oysterbay Primary School Grounds, Dar es Salaam, Tanzania', 30000, null, 'photo-1552674605-db6ffd4facb5'],
  ['abel-memorial-career-day', 'Kongamano', 'Abel Memorial Pre and Primary School Career Day', 'Siku ya taaluma kwa wanafunzi na jamii ya shule.', '2026-10-24T09:00:00+03:00', 'Abel Memorial Pre and Primary School, Bunju Mianzini, Tanzania', 10000, null, 'photo-1523580494863-6f3031224c94'],
  ['lets-talk-finance', 'Kongamano', "Let's Talk Finance: Pathways to Wealth and Financial Freedom", 'Mazungumzo kuhusu mipango ya fedha na uhuru wa kifedha.', '2026-10-24T10:00:00+03:00', 'UDSM, New Library, Dar es Salaam', 20000, null, 'photo-1554224155-6726b3ff858f'],
  ['startup-week-2026', 'Kongamano', 'Startup Week 2026', 'Wiki ya mafunzo, maonesho na mitandao kwa waanzilishi wa biashara changa.', '2026-10-19T09:00:00+03:00', 'JNICC, Dar es Salaam, Tanzania', 60000, null, 'photo-1511578314322-379afb476865'],
  ['mindful-leadership-training', 'Kongamano', 'Mindful Leadership Training', 'Mafunzo ya uongozi wenye umakini na ushirikiano.', '2026-10-17T09:00:00+03:00', 'CRDB Bank - Azikiwe Branch, Dar es Salaam', 40000, null, 'photo-1521737711867-e3b97375f902'],
  ['executive-visit-oct', 'Kongamano', 'Executive Visit', 'Ziara na mazungumzo ya viongozi wa biashara.', '2026-10-14T10:00:00+03:00', 'Hyatt Regency, The Kilimanjaro, Dar es Salaam', 50000, null, 'photo-1511578314322-379afb476865'],
  ['sahara-sparks-2026', 'Muziki', 'Sahara Sparks 2026', 'Tamasha la muziki na burudani Zanzibar.', '2026-10-10T18:00:00+03:00', 'Golden Tulip Airport Zanzibar, Zanzibar West, Tanzania', 50000, null, 'photo-1506157786151-b8491531f063'],
  ['simba-sports-club-marathon', 'Michezo', 'Simba Sports Club Marathon', 'Mbio za jamii kwa mashabiki wa michezo na afya.', '2026-10-04T06:00:00+03:00', 'Coco Beach, Dar es Salaam, Tanzania', 15000, null, 'photo-1552674605-db6ffd4facb5'],
  ['kili-country-fest', 'Muziki', 'Kili Country Fest - All roads lead to Kili', 'Tamasha la muziki na burudani Moshi.', '2026-10-03T17:00:00+03:00', 'Courage Cafe, Moshi', 30000, null, 'photo-1501386761578-eac5c94b800a'],
  ['miss-higher-learning-tanzania', 'Sherehe', 'Miss Higher Learning Tanzania - Registration Form', 'Usajili na shughuli za shindano la Miss Higher Learning Tanzania.', '2026-10-03T10:00:00+03:00', 'Tanzania', 20000, null, 'photo-1529139574466-a303027c1d8b'],
  ['music-therapy-2026', 'Burudani', 'Music Therapy', 'Tukio la muziki na ustawi wa jamii.', '2026-10-01T16:00:00+03:00', 'New Library, University of Dar es Salaam, Tanzania', 15000, null, 'photo-1506157786151-b8491531f063'],
  ['public-health-palliative-congress', 'Kongamano', '4th Public Health Palliative Care Scientific Congress', 'Kongamano la kisayansi kuhusu afya ya umma na huduma za tiba shufaa.', '2026-10-01T09:00:00+03:00', 'New Library, University of Dar es Salaam, Tanzania', 50000, null, 'photo-1540575467063-178a50c2df87'],
  ['tech-ai-international-expo-2026', 'Kongamano', 'Tech & AI International Expo 2026', 'Maonesho ya teknolojia, akili unde na ubunifu.', '2026-09-29T09:00:00+03:00', 'Golden Tulip Airport Hotel, Tanzania', 50000, null, 'photo-1485827404703-89b55fcc595e'],
  ['success-day-2026', 'Kongamano', 'Success Day 2026', 'Tukio la mafunzo na hamasa kuhusu mafanikio.', '2026-09-26T09:00:00+03:00', 'Mahali patatangazwa', 25000, null, 'photo-1523580494863-6f3031224c94'],
  ['otaku-night-september', 'Burudani', 'Otaku Night', 'Usiku wa anime, cosplay na burudani.', '2026-09-19T18:00:00+03:00', 'Bahari Japan Restaurant, Dar es Salaam, Tanzania', 30000, null, 'photo-1524368535928-5b5e00ddc76b'],
  ['amcham-family-charity-walk', 'Michezo', 'AMCHAM Family Charity Walk', 'Matembezi ya hisani kwa familia na jamii.', '2026-09-19T07:00:00+03:00', 'Bravo Coco Beach, Dar es Salaam, Tanzania', 15000, null, 'photo-1552674605-db6ffd4facb5'],
  ['rehabilitation-summit-2026', 'Kongamano', '4th Annual Rehabilitation Summit 2026', 'Mkutano wa wataalamu kuhusu huduma na maendeleo ya ukarabati wa afya.', '2026-09-16T09:00:00+03:00', 'Julius Nyerere International Convention Centre (JNICC), Dar es Salaam', 50000, null, 'photo-1540575467063-178a50c2df87'],
  ['unesco-africa-engineering-week', 'Kongamano', '12th UNESCO Africa Engineering Week & 10th African Engineering Conference', 'Wiki ya uhandisi Afrika pamoja na mkutano wa wahandisi.', '2026-09-14T09:00:00+03:00', 'JNICC, Dar es Salaam, Tanzania', 50000, null, 'photo-1485827404703-89b55fcc595e'],
  ['tedx-kivukoni-2026', 'Kongamano', 'TEDx Kivukoni', 'Mawazo mapya na mazungumzo yanayochochea mabadiliko.', '2026-09-13T10:00:00+03:00', 'Julius Nyerere International Convention Centre, Dar es Salaam, Tanzania', 40000, null, 'photo-1475721027785-f74eccf877e2'],
  ['captain-khalid-work-in-progress-arusha', 'Burudani', 'Captain Khalid “Work In Progress”: Arusha', 'Jioni ya vichekesho na burudani Arusha.', '2026-09-05T19:00:00+03:00', 'Alliance Française Arusha, Arusha, Tanzania', 25000, null, 'photo-1524368535928-5b5e00ddc76b'],
  ['serengeti-summit', 'Kongamano', 'Serengeti Business Summit', 'Jukwaa la viongozi na wabunifu kujadili mustakabali wa biashara Afrika Mashariki.', '2026-12-18T09:30:00+03:00', 'JNICC, Kivukoni, Dar es Salaam', 150000, 'Tiketi chache', 'photo-1540575467063-178a50c2df87'],
  ['zanzibar-beach', 'Sherehe', 'Zanzibar Beach Festival', 'Muziki wa ufukweni, machweo ya Zanzibar na siku tatu za furaha isiyo na kifani.', '2026-12-20T16:00:00+03:00', 'Kendwa Beach, Zanzibar', 80000, 'Mauzo yanaendelea', 'photo-1500375592092-40eb2168fd21'],
  ['comedy-night', 'Burudani', 'Kilimanjaro Comedy Night', 'Wachekeshaji wakuu wa Tanzania na wageni kutoka Uganda kwa usiku mmoja wa vicheko.', '2026-12-22T19:30:00+03:00', 'AICC, Njiro, Arusha', 35000, null, 'photo-1524368535928-5b5e00ddc76b'],
  ['gospel-night', 'Muziki', 'Mwanza Gospel Night', 'Kwaya, waimbaji wa injili na nyimbo za kusifu katika usiku wa kipekee.', '2026-12-27T18:00:00+03:00', 'Nyamagana Stadium, Mwanza', 25000, null, 'photo-1470229722913-7c0e2dbbafd3'],
  ['startup-forum', 'Kongamano', 'Dodoma Startup Forum', 'Wajasiriamali, wawekezaji na wataalamu wa teknolojia wakutana kujenga kesho.', '2026-12-30T08:00:00+03:00', 'Nyerere Square, Dodoma', 60000, null, 'photo-1511578314322-379afb476865'],
];

async function main() {
  const email = process.env.SEED_ORGANIZER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ORGANIZER_PASSWORD;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let organizerId;
    let result;
    if (email && password && password.length >= 12) {
      result = await client.query('SELECT "id" FROM "User" WHERE "email" = $1', [email]);
      organizerId = result.rows[0]?.id;
      if (!organizerId) {
        const salt = randomBytes(16).toString('hex');
        const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
        result = await client.query(
          'INSERT INTO "User" ("id", "name", "email", "passwordHash", "updatedAt") VALUES ($1, $2, $3, $4, NOW()) RETURNING "id"',
          [randomUUID(), 'Tukio Demo Organizer', email, passwordHash],
        );
        organizerId = result.rows[0].id;
      }
    } else {
      const existingDemoEvent = await client.query('SELECT "organizerId" FROM "Event" WHERE "slug" = $1', [samples[0][0]]);
      organizerId = existingDemoEvent.rows[0]?.organizerId;
      if (!organizerId) {
        throw new Error('Set SEED_ORGANIZER_EMAIL and SEED_ORGANIZER_PASSWORD (at least 12 characters) before creating demo events');
      }
    }

    for (const [slug, category, title, description, startsAt, venue, price, badge, imageId] of samples) {
      result = await client.query(
        `INSERT INTO "Event" ("id", "slug", "organizerId", "category", "title", "description", "startsAt", "venue", "image", "badge", "status", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PUBLISHED', NOW())
         ON CONFLICT ("slug") DO UPDATE SET "category" = EXCLUDED."category", "title" = EXCLUDED."title", "description" = EXCLUDED."description", "startsAt" = EXCLUDED."startsAt", "venue" = EXCLUDED."venue", "image" = EXCLUDED."image", "badge" = EXCLUDED."badge", "status" = 'PUBLISHED', "updatedAt" = NOW() RETURNING "id"`,
        [randomUUID(), slug, organizerId, category, title, description, startsAt, venue,
          `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1000&q=85`, badge],
      );
      const eventId = result.rows[0].id;
      await client.query(
        `UPDATE "TicketType" SET "name" = 'Regular', "price" = $2, "updatedAt" = NOW()
         WHERE "eventId" = $1 AND "name" = 'General'`,
        [eventId, price],
      );
      for (const tier of [
        { name: 'Regular', price, quantity: 1000 },
        { name: 'VIP', price: price * 2, quantity: 300 },
        { name: 'VVIP', price: price * 3, quantity: 100 },
      ]) {
        await client.query(
          `UPDATE "TicketType" SET "price" = $3, "quantity" = $4, "active" = true, "updatedAt" = NOW()
           WHERE "eventId" = $1 AND "name" = $2`,
          [eventId, tier.name, tier.price, tier.quantity],
        );
        await client.query(
          `INSERT INTO "TicketType" ("id", "eventId", "name", "price", "quantity", "updatedAt")
           SELECT $1, $2, $3, $4, $5, NOW()
           WHERE NOT EXISTS (SELECT 1 FROM "TicketType" WHERE "eventId" = $2 AND "name" = $3)`,
          [randomUUID(), eventId, tier.name, tier.price, tier.quantity],
        );
      }
    }
    await client.query('COMMIT');
    console.log(`Seeded ${samples.length} public demo events and Regular/VIP/VVIP ticket tiers`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => pool.end());
