import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.mediaEvidence.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.incidentTimeline.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.responderAssignment.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.liveLocation.deleteMany();
  await prisma.heatmapData.deleteMany();
  await prisma.safeZone.deleteMany();
  await prisma.campusBuilding.deleteMany();
  await prisma.emergencyType.deleteMany();
  await prisma.securityGuard.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.medicalProfile.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('Student@123', 12);
  const secPass = await bcrypt.hash('Security@123', 12);
  const adminPass = await bcrypt.hash('Admin@123', 12);

  // ─── Users ────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@safecampus.com',
      password: adminPass,
      firstName: 'Admin',
      lastName: 'SafeCampus',
      phone: '+919876543210',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'student@safecampus.com',
      password,
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '+919876543211',
      role: 'STUDENT',
      isVerified: true,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'priya@safecampus.com',
      password,
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '+919876543212',
      role: 'STUDENT',
      isVerified: true,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'arjun@safecampus.com',
      password,
      firstName: 'Arjun',
      lastName: 'Reddy',
      phone: '+919876543213',
      role: 'STUDENT',
      isVerified: true,
    },
  });

  const guard1 = await prisma.user.create({
    data: {
      email: 'security@safecampus.com',
      password: secPass,
      firstName: 'Ravi',
      lastName: 'Kumar',
      phone: '+919876543214',
      role: 'SECURITY',
      isVerified: true,
    },
  });

  const guard2 = await prisma.user.create({
    data: {
      email: 'security2@safecampus.com',
      password: secPass,
      firstName: 'Suresh',
      lastName: 'Nair',
      phone: '+919876543215',
      role: 'SECURITY',
      isVerified: true,
    },
  });

  const guard3 = await prisma.user.create({
    data: {
      email: 'security3@safecampus.com',
      password: secPass,
      firstName: 'Anil',
      lastName: 'Verma',
      phone: '+919876543216',
      role: 'SECURITY',
      isVerified: true,
    },
  });

  // ─── Security Guards ──────────────────────────────────────────
  await prisma.securityGuard.createMany({
    data: [
      { userId: guard1.id, badgeNumber: 'SEC-001', status: 'AVAILABLE', currentLat: 16.4419, currentLng: 80.6225, specialization: ['MEDICAL', 'FIRE'], shift: 'DAY', zone: 'A', rating: 4.8, totalResolved: 24 },
      { userId: guard2.id, badgeNumber: 'SEC-002', status: 'AVAILABLE', currentLat: 16.4425, currentLng: 80.6230, specialization: ['VIOLENCE', 'HARASSMENT'], shift: 'DAY', zone: 'B', rating: 4.5, totalResolved: 18 },
      { userId: guard3.id, badgeNumber: 'SEC-003', status: 'AVAILABLE', currentLat: 16.4430, currentLng: 80.6220, specialization: ['THEFT', 'ACCIDENT'], shift: 'NIGHT', zone: 'C', rating: 4.9, totalResolved: 31 },
    ],
  });

  // ─── Emergency Contacts ────────────────────────────────────────
  await prisma.emergencyContact.createMany({
    data: [
      { userId: student1.id, name: 'Rajesh Sharma', phone: '+919876000001', email: 'rajesh@email.com', relation: 'PARENT', isPrimary: true },
      { userId: student1.id, name: 'Meena Sharma', phone: '+919876000002', email: 'meena@email.com', relation: 'PARENT' },
      { userId: student2.id, name: 'Sunil Patel', phone: '+919876000003', relation: 'PARENT', isPrimary: true },
      { userId: student3.id, name: 'Lakshmi Reddy', phone: '+919876000004', relation: 'PARENT', isPrimary: true },
    ],
  });

  // ─── Medical Profiles ──────────────────────────────────────────
  await prisma.medicalProfile.createMany({
    data: [
      { userId: student1.id, bloodGroup: 'O+', allergies: ['Penicillin'], diseases: [], medications: [], emergencyNotes: 'No major conditions' },
      { userId: student2.id, bloodGroup: 'A+', allergies: ['Dust'], diseases: ['Asthma'], medications: ['Inhaler'], emergencyNotes: 'Carries inhaler' },
      { userId: student3.id, bloodGroup: 'B+', allergies: [], diseases: [], medications: [], emergencyNotes: 'None' },
    ],
  });

  // ─── Campus Buildings ──────────────────────────────────────────
  const buildings = await Promise.all([
    prisma.campusBuilding.create({ data: { name: 'Main Academic Block', code: 'MAB', latitude: 16.4420, longitude: 80.6225, type: 'academic', floor: 4, description: 'Main academic building with lecture halls' } }),
    prisma.campusBuilding.create({ data: { name: 'Engineering Block', code: 'EB', latitude: 16.4425, longitude: 80.6230, type: 'academic', floor: 3, description: 'Engineering department building' } }),
    prisma.campusBuilding.create({ data: { name: 'Boys Hostel', code: 'BH', latitude: 16.4435, longitude: 80.6240, type: 'hostel', floor: 5, description: 'Boys residential hostel' } }),
    prisma.campusBuilding.create({ data: { name: 'Girls Hostel', code: 'GH', latitude: 16.4415, longitude: 80.6210, type: 'hostel', floor: 5, description: 'Girls residential hostel' } }),
    prisma.campusBuilding.create({ data: { name: 'Admin Building', code: 'AB', latitude: 16.4418, longitude: 80.6220, type: 'admin', floor: 3, description: 'Administrative office' } }),
    prisma.campusBuilding.create({ data: { name: 'Sports Complex', code: 'SC', latitude: 16.4440, longitude: 80.6235, type: 'sports', floor: 1, description: 'Indoor sports complex' } }),
    prisma.campusBuilding.create({ data: { name: 'Canteen', code: 'CT', latitude: 16.4428, longitude: 80.6228, type: 'canteen', floor: 1, description: 'Main campus canteen' } }),
    prisma.campusBuilding.create({ data: { name: 'Library', code: 'LIB', latitude: 16.4422, longitude: 80.6232, type: 'academic', floor: 3, description: 'Central library' } }),
  ]);

  // ─── Safe Zones ────────────────────────────────────────────────
  await prisma.safeZone.createMany({
    data: [
      { name: 'Main Gate Security', latitude: 16.4410, longitude: 80.6215, radius: 50, buildingId: buildings[4].id, hasCamera: true, hasGuard: true },
      { name: 'Library Area', latitude: 16.4422, longitude: 80.6232, radius: 30, buildingId: buildings[7].id, hasCamera: true, hasGuard: false },
      { name: 'Admin Block Entrance', latitude: 16.4418, longitude: 80.6220, radius: 40, buildingId: buildings[4].id, hasCamera: true, hasGuard: true },
      { name: 'Sports Complex Security', latitude: 16.4440, longitude: 80.6235, radius: 35, buildingId: buildings[5].id, hasCamera: true, hasGuard: true },
      { name: 'Canteen Area', latitude: 16.4428, longitude: 80.6228, radius: 25, buildingId: buildings[6].id, hasCamera: true, hasGuard: false },
    ],
  });

  // ─── Emergency Types ───────────────────────────────────────────
  await prisma.emergencyType.createMany({
    data: [
      { name: 'Medical Emergency', icon: '🏥', color: '#ef4444', priority: 1, description: 'Medical emergencies requiring immediate attention', guidelines: 'Stay calm, apply first aid if trained, do not move injured person' },
      { name: 'Fire', icon: '🔥', color: '#f97316', priority: 1, description: 'Fire or fire hazard', guidelines: 'Evacuate immediately, use stairs, activate fire alarm' },
      { name: 'Harassment', icon: '⚠️', color: '#eab308', priority: 2, description: 'Any form of harassment', guidelines: 'Move to a safe area, document details, do not confront' },
      { name: 'Ragging', icon: '🚫', color: '#a855f7', priority: 2, description: 'Ragging or bullying incidents', guidelines: 'Stay calm, do not retaliate, reach faculty or safe zone' },
      { name: 'Accident', icon: '🚨', color: '#ec4899', priority: 1, description: 'Accidents requiring assistance', guidelines: 'Do not move injured, apply first aid, keep area clear' },
      { name: 'Theft', icon: '🔒', color: '#6366f1', priority: 3, description: 'Theft or stolen property', guidelines: 'Do not chase, note details, preserve evidence' },
      { name: 'Violence', icon: '🛡️', color: '#dc2626', priority: 1, description: 'Violence or physical altercation', guidelines: 'Get to safety, lock doors, do not confront' },
      { name: 'Other', icon: '📋', color: '#64748b', priority: 4, description: 'Other emergency situations', guidelines: 'Stay calm, provide details, await assistance' },
    ],
  });

  // ─── Sample Incidents ──────────────────────────────────────────
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const incident1 = await prisma.incident.create({
    data: {
      studentId: student1.id,
      category: 'MEDICAL',
      severity: 'HIGH',
      status: 'RESOLVED',
      title: 'Medical Emergency - Rahul Sharma',
      description: 'Student fainted in classroom during lecture',
      latitude: 16.4420,
      longitude: 80.6225,
      address: 'Main Academic Block, Room 301',
      aiThreatScore: 82,
      resolvedAt: new Date(twoDaysAgo.getTime() + 45 * 60000),
      responseTime: 180,
      summary: 'Medical emergency at Main Academic Block. Student fainted during lecture. First aid administered. Resolved in 3 minutes.',
      createdAt: twoDaysAgo,
    },
  });

  const incident2 = await prisma.incident.create({
    data: {
      studentId: student2.id,
      category: 'HARASSMENT',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      title: 'Harassment Report - Priya Patel',
      description: 'Verbal harassment near library area',
      latitude: 16.4422,
      longitude: 80.6232,
      address: 'Library Entrance',
      aiThreatScore: 65,
      resolvedAt: new Date(oneDayAgo.getTime() + 30 * 60000),
      responseTime: 240,
      summary: 'Harassment incident near library. Security responded and escorted the student safely.',
      createdAt: oneDayAgo,
    },
  });

  const incident3 = await prisma.incident.create({
    data: {
      studentId: student3.id,
      category: 'THEFT',
      severity: 'LOW',
      status: 'PENDING',
      title: 'Theft Report - Arjun Reddy',
      description: 'Laptop stolen from canteen area',
      latitude: 16.4428,
      longitude: 80.6228,
      address: 'Canteen, Table 12',
      aiThreatScore: 45,
      createdAt: threeHoursAgo,
    },
  });

  // ─── Incident Timelines ────────────────────────────────────────
  await prisma.incidentTimeline.createMany({
    data: [
      { incidentId: incident1.id, event: 'SOS_TRIGGERED', details: 'SOS triggered by Rahul Sharma', timestamp: twoDaysAgo },
      { incidentId: incident1.id, event: 'RESPONDER_ASSIGNED', details: 'Ravi Kumar assigned', timestamp: new Date(twoDaysAgo.getTime() + 30000) },
      { incidentId: incident1.id, event: 'RESPONDER_ACCEPTED', details: 'Ravi Kumar accepted the incident', timestamp: new Date(twoDaysAgo.getTime() + 45000) },
      { incidentId: incident1.id, event: 'RESPONDER_ARRIVED', details: 'Security reached the location', timestamp: new Date(twoDaysAgo.getTime() + 180000) },
      { incidentId: incident1.id, event: 'INCIDENT_RESOLVED', details: 'First aid administered, student recovered', timestamp: new Date(twoDaysAgo.getTime() + 45 * 60000) },
      { incidentId: incident2.id, event: 'SOS_TRIGGERED', details: 'SOS triggered by Priya Patel', timestamp: oneDayAgo },
      { incidentId: incident2.id, event: 'RESPONDER_ASSIGNED', details: 'Suresh Nair assigned', timestamp: new Date(oneDayAgo.getTime() + 20000) },
      { incidentId: incident2.id, event: 'INCIDENT_RESOLVED', details: 'Security escorted student safely', timestamp: new Date(oneDayAgo.getTime() + 30 * 60000) },
      { incidentId: incident3.id, event: 'SOS_TRIGGERED', details: 'SOS triggered by Arjun Reddy', timestamp: threeHoursAgo },
    ],
  });

  // ─── Responder Assignments ─────────────────────────────────────
  await prisma.responderAssignment.createMany({
    data: [
      { incidentId: incident1.id, responderId: guard1.id, assignedAt: twoDaysAgo, acceptedAt: new Date(twoDaysAgo.getTime() + 45000), arrivedAt: new Date(twoDaysAgo.getTime() + 180000), completedAt: new Date(twoDaysAgo.getTime() + 45 * 60000), distance: 0.3, eta: 2 },
      { incidentId: incident2.id, responderId: guard2.id, assignedAt: oneDayAgo, acceptedAt: new Date(oneDayAgo.getTime() + 30000), arrivedAt: new Date(oneDayAgo.getTime() + 120000), completedAt: new Date(oneDayAgo.getTime() + 30 * 60000), distance: 0.5, eta: 3 },
    ],
  });

  // ─── Heatmap Data ──────────────────────────────────────────────
  const heatmapPoints = [
    { latitude: 16.4420, longitude: 80.6225, intensity: 0.8, category: 'MEDICAL' as const, hour: 10, dayOfWeek: 1 },
    { latitude: 16.4422, longitude: 80.6232, intensity: 0.6, category: 'HARASSMENT' as const, hour: 18, dayOfWeek: 3 },
    { latitude: 16.4428, longitude: 80.6228, intensity: 0.5, category: 'THEFT' as const, hour: 13, dayOfWeek: 5 },
    { latitude: 16.4435, longitude: 80.6240, intensity: 0.7, category: 'RAGGING' as const, hour: 22, dayOfWeek: 6 },
    { latitude: 16.4440, longitude: 80.6235, intensity: 0.4, category: 'ACCIDENT' as const, hour: 16, dayOfWeek: 2 },
    { latitude: 16.4419, longitude: 80.6226, intensity: 0.9, category: 'VIOLENCE' as const, hour: 23, dayOfWeek: 0 },
    { latitude: 16.4425, longitude: 80.6230, intensity: 0.3, category: 'FIRE' as const, hour: 11, dayOfWeek: 4 },
    { latitude: 16.4418, longitude: 80.6220, intensity: 0.5, category: 'OTHER' as const, hour: 14, dayOfWeek: 1 },
  ];

  await prisma.heatmapData.createMany({ data: heatmapPoints });

  // ─── Settings ──────────────────────────────────────────────────
  await prisma.settings.createMany({
    data: [
      { key: 'campus_name', value: 'LBRCE Campus', category: 'general' },
      { key: 'campus_lat', value: '16.4420', category: 'general' },
      { key: 'campus_lng', value: '80.6225', category: 'general' },
      { key: 'sos_timeout', value: '300', category: 'sos' },
      { key: 'auto_assign', value: 'true', category: 'sos' },
      { key: 'max_response_time', value: '600', category: 'sos' },
      { key: 'whatsapp_enabled', value: 'true', category: 'notifications' },
      { key: 'sms_enabled', value: 'true', category: 'notifications' },
      { key: 'push_enabled', value: 'true', category: 'notifications' },
      { key: 'email_enabled', value: 'true', category: 'notifications' },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('Demo Credentials:');
  console.log('  Student:  student@safecampus.com  /  Student@123');
  console.log('  Security: security@safecampus.com /  Security@123');
  console.log('  Admin:    admin@safecampus.com    /  Admin@123');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
